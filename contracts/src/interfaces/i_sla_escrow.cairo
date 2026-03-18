// File: contracts/src/interfaces/i_sla_escrow.cairo

use starknet::ContractAddress;

#[derive(Drop, Serde, starknet::Store)]
pub struct Deal {
    pub client: ContractAddress,
    pub sp: ContractAddress,
    pub total_amount: u256,
    pub chunk_amount: u256,
    pub num_chunks: u64,
    pub chunks_released: u64,
    pub collateral: u256,
    pub sla_deadline: u64,
    pub is_active: bool,
    pub is_slashed: bool,
}

#[starknet::interface]
pub trait ISLAEscrow<TContractState> {
    fn create_deal(
        ref self: TContractState,
        sp: ContractAddress,
        num_chunks: u64,
        chunk_amount: u256,
        collateral: u256,
        sla_duration_secs: u64,
    ) -> u256;

    fn release_chunk(
        ref self: TContractState,
        deal_id: u256,
        chunk_index: u64,
        proof_set_id: u256,
        root_cid: u256,
        timestamp: u64,
        sig_r: u256,
        sig_s: u256,
        sig_v: u32,
    );

    fn slash(ref self: TContractState, deal_id: u256);

    fn pause(ref self: TContractState);

    fn unpause(ref self: TContractState);

    fn get_deal(self: @TContractState, deal_id: u256) -> Deal;

    fn get_pkp_public_key(self: @TContractState) -> (u256, u256);

    fn get_deal_counter(self: @TContractState) -> u256;
}
