// File: contracts/src/tests/test_sla_escrow.cairo

use slastream_contracts::sla_escrow::SLAEscrow;
use slastream_contracts::interfaces::i_sla_escrow::{ISLAEscrow, ISLAEscrowDispatcher, ISLAEscrowDispatcherTrait, Deal};
use starknet::{ContractAddress, contract_address_const, get_block_timestamp};
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait,
    start_cheat_caller_address, stop_cheat_caller_address,
    start_cheat_block_timestamp_global, stop_cheat_block_timestamp_global,
};

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

fn deploy_mock_erc20(owner: ContractAddress, initial_supply: u256) -> ContractAddress {
    let contract = declare("MockERC20").unwrap().contract_class();
    let mut calldata = array![];
    owner.serialize(ref calldata);
    initial_supply.serialize(ref calldata);
    let (addr, _) = contract.deploy(@calldata).unwrap();
    addr
}

fn deploy_sla_escrow(
    pkp_x: u256,
    pkp_y: u256,
    strk_token: ContractAddress,
    owner: ContractAddress,
) -> ISLAEscrowDispatcher {
    let contract = declare("SLAEscrow").unwrap().contract_class();
    let mut calldata = array![];
    pkp_x.serialize(ref calldata);
    pkp_y.serialize(ref calldata);
    strk_token.serialize(ref calldata);
    start_cheat_caller_address(starknet::get_contract_address(), owner);
    let (addr, _) = contract.deploy(@calldata).unwrap();
    stop_cheat_caller_address(starknet::get_contract_address());
    ISLAEscrowDispatcher { contract_address: addr }
}

// Known test secp256k1 key pair (DO NOT USE IN PRODUCTION):
// Private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
// Public key X: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
// Public key Y: 0x3f5e8ffe000000000000000000000000000000000000000000000000000000003

// Pre-computed test signature for msg: keccak256(pack([1,0,42,0xdeadbeef...,1234]))
// deal_id=1, chunk_index=0, proof_set_id=42, root_cid=0xdeadbeef (padded), timestamp=1234
// msg_hash = 0x... (computed below via _compute_message_hash logic)
// r = 0x..., s = 0x..., v = 0 or 1
// NOTE: These values must be pre-computed with the test private key before running tests.
// Use the helper script: bun run scripts/compute-test-sig.ts
// The values below are PLACEHOLDER — replace with output from compute-test-sig.ts

const TEST_PKP_X: u256 = 0x8318535b54105d4a7aae60c08fc45f9687181b4fdfc625bd1a753fa7397fed75;
const TEST_PKP_Y: u256 = 0x3547f11ca8696646f2f3acb08e31016afac23e630c5d11f59f61fef57b0d2aa5;

// Pre-computed signature for: deal_id=1, chunk_index=0, proof_set_id=42,
// root_cid=0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef,
// timestamp=1234
// Computed with private key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
// REPLACE THESE VALUES with output from: bun run scripts/compute-test-sig.ts
const TEST_SIG_R: u256 = 0x31338a93ce893a3d1340fac987cfec9fe918d47e466dd9971970198ac963fcd7;
const TEST_SIG_S: u256 = 0x29e57b749106ebc173391753a1c15b2db8dfac683e26dd6d460a0cd9ba5d73c5;
const TEST_SIG_V: u32 = 0;

// ---------------------------------------------------------------------------
// Test: create_deal
// ---------------------------------------------------------------------------

#[test]
fn test_create_deal() {
    let client = contract_address_const::<0x1>();
    let sp = contract_address_const::<0x2>();
    let owner = contract_address_const::<0x3>();
    let chunk_amount: u256 = 100_u256;
    let num_chunks: u64 = 10_u64;
    let collateral: u256 = 50_u256;
    let sla_duration_secs: u64 = 3600_u64;
    let total_needed: u256 = chunk_amount * 10_u256 + collateral; // 1050

    let mock_strk = deploy_mock_erc20(client, 10000_u256);
    let escrow = deploy_sla_escrow(TEST_PKP_X, TEST_PKP_Y, mock_strk, owner);

    // Client approves escrow for total_needed
    start_cheat_caller_address(mock_strk, client);
    IMockERC20Dispatcher { contract_address: mock_strk }
        .approve(escrow.contract_address, total_needed);
    stop_cheat_caller_address(mock_strk);

    // Client creates deal
    start_cheat_caller_address(escrow.contract_address, client);
    let deal_id = escrow.create_deal(sp, num_chunks, chunk_amount, collateral, sla_duration_secs);
    stop_cheat_caller_address(escrow.contract_address);

    assert(deal_id == 1_u256, 'deal_id should be 1');

    let deal = escrow.get_deal(deal_id);
    assert(deal.client == client, 'client mismatch');
    assert(deal.sp == sp, 'sp mismatch');
    assert(deal.total_amount == 1000_u256, 'total_amount mismatch');
    assert(deal.chunk_amount == chunk_amount, 'chunk_amount mismatch');
    assert(deal.num_chunks == num_chunks, 'num_chunks mismatch');
    assert(deal.chunks_released == 0_u64, 'chunks_released should be 0');
    assert(deal.collateral == collateral, 'collateral mismatch');
    assert(deal.is_active, 'deal should be active');
    assert(!deal.is_slashed, 'deal should not be slashed');
}

// ---------------------------------------------------------------------------
// Test: release_chunk (happy path — requires valid pre-computed signature)
// ---------------------------------------------------------------------------

#[test]
fn test_release_chunk() {
    let client = contract_address_const::<0x1>();
    let sp = contract_address_const::<0x2>();
    let owner = contract_address_const::<0x3>();
    let relay = contract_address_const::<0x4>();
    let chunk_amount: u256 = 100_u256;
    let num_chunks: u64 = 10_u64;
    let collateral: u256 = 50_u256;
    let sla_duration_secs: u64 = 3600_u64;
    let total_needed: u256 = chunk_amount * 10_u256 + collateral;

    let mock_strk = deploy_mock_erc20(client, 10000_u256);
    let escrow = deploy_sla_escrow(TEST_PKP_X, TEST_PKP_Y, mock_strk, owner);

    // Client approves + creates deal
    start_cheat_caller_address(mock_strk, client);
    IMockERC20Dispatcher { contract_address: mock_strk }
        .approve(escrow.contract_address, total_needed);
    stop_cheat_caller_address(mock_strk);

    start_cheat_caller_address(escrow.contract_address, client);
    let deal_id = escrow.create_deal(sp, num_chunks, chunk_amount, collateral, sla_duration_secs);
    stop_cheat_caller_address(escrow.contract_address);

    // Relay calls release_chunk with pre-computed valid signature
    // deal_id=1, chunk_index=0, proof_set_id=42,
    // root_cid=0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef,
    // timestamp=1234
    let proof_set_id: u256 = 42_u256;
    let root_cid: u256 = 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef;
    let timestamp: u64 = 1234_u64;

    start_cheat_caller_address(escrow.contract_address, relay);
    escrow.release_chunk(
        deal_id, 0_u64, proof_set_id, root_cid, timestamp,
        TEST_SIG_R, TEST_SIG_S, TEST_SIG_V
    );
    stop_cheat_caller_address(escrow.contract_address);

    let deal = escrow.get_deal(deal_id);
    assert(deal.chunks_released == 1_u64, 'chunks_released should be 1');
}

// ---------------------------------------------------------------------------
// Test: slash_after_expiry
// ---------------------------------------------------------------------------

#[test]
fn test_slash_after_expiry() {
    let client = contract_address_const::<0x1>();
    let sp = contract_address_const::<0x2>();
    let owner = contract_address_const::<0x3>();
    let chunk_amount: u256 = 100_u256;
    let num_chunks: u64 = 10_u64;
    let collateral: u256 = 500_u256;
    let sla_duration_secs: u64 = 3600_u64;
    let total_needed: u256 = chunk_amount * 10_u256 + collateral; // 1500

    let mock_strk = deploy_mock_erc20(client, 10000_u256);
    let escrow = deploy_sla_escrow(TEST_PKP_X, TEST_PKP_Y, mock_strk, owner);

    start_cheat_caller_address(mock_strk, client);
    IMockERC20Dispatcher { contract_address: mock_strk }
        .approve(escrow.contract_address, total_needed);
    stop_cheat_caller_address(mock_strk);

    // Set initial timestamp to 1000
    start_cheat_block_timestamp_global(1000_u64);

    start_cheat_caller_address(escrow.contract_address, client);
    let deal_id = escrow.create_deal(sp, num_chunks, chunk_amount, collateral, sla_duration_secs);
    stop_cheat_caller_address(escrow.contract_address);

    // Advance timestamp past SLA deadline (1000 + 3600 = 4600, advance to 4601)
    stop_cheat_block_timestamp_global();
    start_cheat_block_timestamp_global(4601_u64);

    // Anyone can slash
    let slasher = contract_address_const::<0x5>();
    start_cheat_caller_address(escrow.contract_address, slasher);
    escrow.slash(deal_id);
    stop_cheat_caller_address(escrow.contract_address);

    let deal = escrow.get_deal(deal_id);
    assert(deal.is_slashed, 'deal should be slashed');
    assert(!deal.is_active, 'deal should not be active');
    stop_cheat_block_timestamp_global();
}

// ---------------------------------------------------------------------------
// Test: cant_slash_before_expiry
// ---------------------------------------------------------------------------

#[test]
#[should_panic(expected: ('SLA deadline not reached',))]
fn test_cant_slash_before_expiry() {
    let client = contract_address_const::<0x1>();
    let sp = contract_address_const::<0x2>();
    let owner = contract_address_const::<0x3>();
    let chunk_amount: u256 = 100_u256;
    let num_chunks: u64 = 10_u64;
    let collateral: u256 = 50_u256;
    let sla_duration_secs: u64 = 3600_u64;
    let total_needed: u256 = chunk_amount * 10_u256 + collateral;

    let mock_strk = deploy_mock_erc20(client, 10000_u256);
    let escrow = deploy_sla_escrow(TEST_PKP_X, TEST_PKP_Y, mock_strk, owner);

    start_cheat_caller_address(mock_strk, client);
    IMockERC20Dispatcher { contract_address: mock_strk }
        .approve(escrow.contract_address, total_needed);
    stop_cheat_caller_address(mock_strk);

    start_cheat_block_timestamp_global(1000_u64);

    start_cheat_caller_address(escrow.contract_address, client);
    let deal_id = escrow.create_deal(sp, num_chunks, chunk_amount, collateral, sla_duration_secs);
    stop_cheat_caller_address(escrow.contract_address);

    // Try to slash at timestamp 1500 — deadline is 4600 — should panic
    start_cheat_block_timestamp_global(1500_u64);
    let slasher = contract_address_const::<0x5>();
    start_cheat_caller_address(escrow.contract_address, slasher);
    escrow.slash(deal_id); // should panic
    stop_cheat_caller_address(escrow.contract_address);
    stop_cheat_block_timestamp_global();
}

// ---------------------------------------------------------------------------
// Test: replay_protection
// ---------------------------------------------------------------------------

#[test]
#[should_panic(expected: ('Chunk already released',))]
fn test_replay_protection() {
    let client = contract_address_const::<0x1>();
    let sp = contract_address_const::<0x2>();
    let owner = contract_address_const::<0x3>();
    let relay = contract_address_const::<0x4>();
    let chunk_amount: u256 = 100_u256;
    let num_chunks: u64 = 10_u64;
    let collateral: u256 = 50_u256;
    let sla_duration_secs: u64 = 3600_u64;
    let total_needed: u256 = chunk_amount * 10_u256 + collateral;

    let mock_strk = deploy_mock_erc20(client, 10000_u256);
    let escrow = deploy_sla_escrow(TEST_PKP_X, TEST_PKP_Y, mock_strk, owner);

    start_cheat_caller_address(mock_strk, client);
    IMockERC20Dispatcher { contract_address: mock_strk }
        .approve(escrow.contract_address, total_needed);
    stop_cheat_caller_address(mock_strk);

    start_cheat_caller_address(escrow.contract_address, client);
    let deal_id = escrow.create_deal(sp, num_chunks, chunk_amount, collateral, sla_duration_secs);
    stop_cheat_caller_address(escrow.contract_address);

    let proof_set_id: u256 = 42_u256;
    let root_cid: u256 = 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef;
    let timestamp: u64 = 1234_u64;

    // First release — should succeed
    start_cheat_caller_address(escrow.contract_address, relay);
    escrow.release_chunk(
        deal_id, 0_u64, proof_set_id, root_cid, timestamp,
        TEST_SIG_R, TEST_SIG_S, TEST_SIG_V
    );

    // Second release of same chunk — should panic with 'Chunk already released'
    escrow.release_chunk(
        deal_id, 0_u64, proof_set_id, root_cid, timestamp,
        TEST_SIG_R, TEST_SIG_S, TEST_SIG_V
    );
    stop_cheat_caller_address(escrow.contract_address);
}

// ---------------------------------------------------------------------------
// MockERC20 interface (for test approvals)
// ---------------------------------------------------------------------------

#[starknet::interface]
trait IMockERC20<TContractState> {
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(
        ref self: TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256,
    ) -> bool;
}
