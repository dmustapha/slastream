// File: contracts/src/sla_escrow.cairo

#[starknet::contract]
pub mod SLAEscrow {
    use starknet::{
        ContractAddress, SyscallResultTrait, get_block_timestamp, get_caller_address,
        get_contract_address,
    };
    use starknet::secp256k1::Secp256k1Point;
    use starknet::secp256_trait::{
        Secp256PointTrait, Signature, recover_public_key,
    };
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use core::keccak::keccak_u256s_be_inputs;
    use core::integer::u128_byte_reverse;
    use super::super::interfaces::i_sla_escrow::{ISLAEscrow, Deal};

    // ---------------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------------

    #[storage]
    struct Storage {
        deals: Map<u256, Deal>,
        deal_counter: u256,
        pkp_pub_key_x: u256,
        pkp_pub_key_y: u256,
        strk_token: ContractAddress,
        owner: ContractAddress,
        paused: bool,
        // Replay protection: tracks released chunk slots
        chunk_released: Map<(u256, u64), bool>,
    }

    // ---------------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------------

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        DealCreated: DealCreated,
        ChunkReleased: ChunkReleased,
        DealSlashed: DealSlashed,
        DealCompleted: DealCompleted,
        Paused: Paused,
        Unpaused: Unpaused,
    }

    #[derive(Drop, starknet::Event)]
    pub struct DealCreated {
        #[key]
        pub deal_id: u256,
        pub client: ContractAddress,
        pub sp: ContractAddress,
        pub total_amount: u256,
        pub num_chunks: u64,
        pub sla_deadline: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ChunkReleased {
        #[key]
        pub deal_id: u256,
        pub chunk_index: u64,
        pub amount: u256,
        pub sp: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct DealSlashed {
        #[key]
        pub deal_id: u256,
        pub sp: ContractAddress,
        pub slash_amount: u256,
        pub client: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct DealCompleted {
        #[key]
        pub deal_id: u256,
        pub sp: ContractAddress,
        pub total_paid: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Paused {
        pub by: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Unpaused {
        pub by: ContractAddress,
    }

    // ---------------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------------

    #[constructor]
    fn constructor(
        ref self: ContractState,
        pkp_public_key_x: u256,
        pkp_public_key_y: u256,
        strk_token_address: ContractAddress,
    ) {
        self.pkp_pub_key_x.write(pkp_public_key_x);
        self.pkp_pub_key_y.write(pkp_public_key_y);
        self.strk_token.write(strk_token_address);
        self.owner.write(get_caller_address());
        self.paused.write(false);
        self.deal_counter.write(0_u256);
    }

    // ---------------------------------------------------------------------------
    // External functions
    // ---------------------------------------------------------------------------

    #[abi(embed_v0)]
    impl SLAEscrowImpl of ISLAEscrow<ContractState> {
        /// Client calls this to create a deal and lock STRK.
        /// Caller must have approved (num_chunks * chunk_amount + collateral) STRK
        /// to this contract before calling.
        fn create_deal(
            ref self: ContractState,
            sp: ContractAddress,
            num_chunks: u64,
            chunk_amount: u256,
            collateral: u256,
            sla_duration_secs: u64,
        ) -> u256 {
            self._assert_not_paused();
            assert(num_chunks > 0, 'num_chunks must be > 0');
            assert(chunk_amount > 0, 'chunk_amount must be > 0');
            assert(sla_duration_secs > 0, 'sla_duration must be > 0');

            let caller = get_caller_address();
            let total_amount: u256 = chunk_amount * num_chunks.into();
            let required_amount: u256 = total_amount + collateral;

            // Transfer total_amount + collateral from client to contract
            let strk = IERC20Dispatcher { contract_address: self.strk_token.read() };
            strk.transfer_from(caller, get_contract_address(), required_amount);

            let deal_id = self.deal_counter.read() + 1_u256;
            self.deal_counter.write(deal_id);

            let sla_deadline: u64 = get_block_timestamp() + sla_duration_secs;

            let deal = Deal {
                client: caller,
                sp: sp,
                total_amount: total_amount,
                chunk_amount: chunk_amount,
                num_chunks: num_chunks,
                chunks_released: 0_u64,
                collateral: collateral,
                sla_deadline: sla_deadline,
                is_active: true,
                is_slashed: false,
            };

            self.deals.write(deal_id, deal);

            self.emit(DealCreated {
                deal_id: deal_id,
                client: caller,
                sp: sp,
                total_amount: total_amount,
                num_chunks: num_chunks,
                sla_deadline: sla_deadline,
            });

            deal_id
        }

        /// Relay calls this after obtaining PKP signature from Lit Action.
        /// sig_v must be 0 or 1 (normalized by relay before calling — NOT 27/28).
        fn release_chunk(
            ref self: ContractState,
            deal_id: u256,
            chunk_index: u64,
            proof_set_id: u256,
            root_cid: u256,
            timestamp: u64,
            sig_r: u256,
            sig_s: u256,
            sig_v: u32,
        ) {
            self._assert_not_paused();

            let deal = self.deals.read(deal_id);
            assert(deal.is_active, 'Deal not active');
            assert(!deal.is_slashed, 'Deal already slashed');
            assert(deal.chunks_released != deal.num_chunks, 'All chunks already released');
            assert(chunk_index < deal.num_chunks, 'chunk_index out of bounds');

            // Replay protection: each (deal_id, chunk_index) can only be released once
            let already_released = self.chunk_released.read((deal_id, chunk_index));
            assert(!already_released, 'Chunk already released');

            // Reconstruct the message hash the Lit Action signed.
            // Must match exactly: keccak256(solidityPack(['uint256','uint256','uint256','bytes32','uint256'], [...]))
            // We hash the 5 u256 values as big-endian 32-byte words.
            let msg_hash = self._compute_message_hash(
                deal_id, chunk_index.into(), proof_set_id, root_cid, timestamp.into()
            );

            // Verify secp256k1 signature using Cairo corelib
            self._verify_pkp_signature(msg_hash, sig_r, sig_s, sig_v);

            // Mark chunk as released (replay protection)
            self.chunk_released.write((deal_id, chunk_index), true);

            // Update deal state
            let chunks_released = deal.chunks_released + 1_u64;
            let is_completed = chunks_released == deal.num_chunks;
            let updated_deal = Deal {
                client: deal.client,
                sp: deal.sp,
                total_amount: deal.total_amount,
                chunk_amount: deal.chunk_amount,
                num_chunks: deal.num_chunks,
                chunks_released: chunks_released,
                collateral: deal.collateral,
                sla_deadline: deal.sla_deadline,
                is_active: !is_completed,
                is_slashed: deal.is_slashed,
            };
            self.deals.write(deal_id, updated_deal);

            // Transfer chunk_amount STRK to SP
            let strk = IERC20Dispatcher { contract_address: self.strk_token.read() };
            strk.transfer(deal.sp, deal.chunk_amount);

            self.emit(ChunkReleased {
                deal_id: deal_id,
                chunk_index: chunk_index,
                amount: deal.chunk_amount,
                sp: deal.sp,
            });

            // If all chunks released, also return collateral to SP and emit DealCompleted
            if is_completed {
                strk.transfer(deal.sp, deal.collateral);
                self.emit(DealCompleted {
                    deal_id: deal_id,
                    sp: deal.sp,
                    total_paid: deal.total_amount,
                });
            }
        }

        /// Permissionless — anyone can call after SLA deadline.
        /// Slashes SP collateral → sends to client. Refunds remaining unpaid chunks to client.
        fn slash(ref self: ContractState, deal_id: u256) {
            let deal = self.deals.read(deal_id);
            assert(deal.is_active, 'Deal not active');
            assert(!deal.is_slashed, 'Deal already slashed');
            assert(get_block_timestamp() >= deal.sla_deadline, 'SLA deadline not reached');

            // Calculate remaining amounts
            let chunks_paid = deal.chunks_released;
            let chunks_remaining = deal.num_chunks - chunks_paid;
            let unpaid_amount: u256 = deal.chunk_amount * chunks_remaining.into();
            let slash_amount = deal.collateral + unpaid_amount;

            // Mark deal as slashed and inactive
            let updated_deal = Deal {
                client: deal.client,
                sp: deal.sp,
                total_amount: deal.total_amount,
                chunk_amount: deal.chunk_amount,
                num_chunks: deal.num_chunks,
                chunks_released: deal.chunks_released,
                collateral: deal.collateral,
                sla_deadline: deal.sla_deadline,
                is_active: false,
                is_slashed: true,
            };
            self.deals.write(deal_id, updated_deal);

            // Transfer collateral + unpaid funds to client
            let strk = IERC20Dispatcher { contract_address: self.strk_token.read() };
            strk.transfer(deal.client, slash_amount);

            self.emit(DealSlashed {
                deal_id: deal_id,
                sp: deal.sp,
                slash_amount: slash_amount,
                client: deal.client,
            });
        }

        fn pause(ref self: ContractState) {
            self._assert_owner();
            self.paused.write(true);
            self.emit(Paused { by: get_caller_address() });
        }

        fn unpause(ref self: ContractState) {
            self._assert_owner();
            self.paused.write(false);
            self.emit(Unpaused { by: get_caller_address() });
        }

        fn get_deal(self: @ContractState, deal_id: u256) -> Deal {
            self.deals.read(deal_id)
        }

        fn get_pkp_public_key(self: @ContractState) -> (u256, u256) {
            (self.pkp_pub_key_x.read(), self.pkp_pub_key_y.read())
        }

        fn get_deal_counter(self: @ContractState) -> u256 {
            self.deal_counter.read()
        }
    }

    // ---------------------------------------------------------------------------
    // Internal functions
    // ---------------------------------------------------------------------------

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _assert_not_paused(self: @ContractState) {
            assert(!self.paused.read(), 'Contract is paused');
        }

        fn _assert_owner(self: @ContractState) {
            assert(get_caller_address() == self.owner.read(), 'Not owner');
        }

        /// Computes keccak256 of the ABI-packed signing payload.
        /// Matches: keccak256(solidityPack(['uint256','uint256','uint256','bytes32','uint256'], [...]))
        /// All values treated as 32-byte big-endian words for keccak_u256s_be_inputs.
        fn _compute_message_hash(
            self: @ContractState,
            deal_id: u256,
            chunk_index: u256,
            proof_set_id: u256,
            root_cid: u256,
            timestamp: u256,
        ) -> u256 {
            let inputs: Array<u256> = array![deal_id, chunk_index, proof_set_id, root_cid, timestamp];
            let hash_le = keccak_u256s_be_inputs(inputs.span());
            u256 { low: u128_byte_reverse(hash_le.high), high: u128_byte_reverse(hash_le.low) }
        }

        /// Verifies that the secp256k1 signature was produced by the registered PKP.
        /// Uses Cairo corelib recover_public_key.
        /// sig_v must be 0 or 1 (relay normalizes from Lit's 27/28 before calling).
        fn _verify_pkp_signature(
            self: @ContractState,
            msg_hash: u256,
            sig_r: u256,
            sig_s: u256,
            sig_v: u32,
        ) {
            // recover_public_key returns Option<Secp256k1Point>
            let signature = Signature { r: sig_r, s: sig_s, y_parity: sig_v == 1 };
            let recovered = recover_public_key::<Secp256k1Point>(msg_hash, signature);
            assert(recovered.is_some(), 'Signature recovery failed');

            let recovered_point = recovered.unwrap();
            let (recovered_x, recovered_y) = recovered_point.get_coordinates().unwrap_syscall();

            let expected_x = self.pkp_pub_key_x.read();
            let expected_y = self.pkp_pub_key_y.read();

            assert(recovered_x == expected_x, 'PKP key X mismatch');
            assert(recovered_y == expected_y, 'PKP key Y mismatch');
        }
    }

    // ---------------------------------------------------------------------------
    // IERC20 dispatcher interface (inline — no external import needed for dispatch)
    // ---------------------------------------------------------------------------

    #[starknet::interface]
    trait IERC20<TContractState> {
        fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
        fn transfer_from(
            ref self: TContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) -> bool;
        fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
        fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    }

}
