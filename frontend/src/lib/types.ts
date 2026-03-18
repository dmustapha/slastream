export interface Deal {
  client: string;
  sp: string;
  total_amount: bigint;
  chunk_amount: bigint;
  num_chunks: number;
  chunks_released: number;
  collateral: bigint;
  sla_deadline: number;
  is_active: boolean;
  is_slashed: boolean;
}

export interface DealWithId extends Deal {
  dealId: number;
}

export type TransactionState =
  | "idle"
  | "pending"
  | "confirming"
  | "confirmed"
  | "failed";

export interface TransactionResult {
  state: TransactionState;
  txHash?: string;
  error?: string;
}

export interface ChunkReleasedEvent {
  deal_id: bigint;
  chunk_index: number;
  amount: bigint;
  sp: string;
  transaction_hash: string;
  timestamp?: number;
}
