import { RpcProvider, Contract, hash, num } from "starknet";
import type { AccountInterface } from "starknet";
import abiJson from "@/abi/SLAEscrow.json";
import type { Deal, ChunkReleasedEvent } from "./types";

const STARKNET_RPC_URL =
  process.env.NEXT_PUBLIC_STARKNET_RPC_URL ||
  "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/demo";
const SLA_ESCROW_ADDRESS =
  process.env.NEXT_PUBLIC_SLA_ESCROW_ADDRESS ||
  "0x020a11bf272f2af470393707aab6250bbd58c7b6d268df9756846f17ecedbfb1";

const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL });

function getContract(): Contract {
  return new Contract(abiJson as any, SLA_ESCROW_ADDRESS, provider);
}

export async function getDealCounter(): Promise<number> {
  const contract = getContract();
  const result = await contract.call("get_deal_counter");
  return Number(result);
}

export async function getDeal(dealId: number): Promise<Deal> {
  const contract = getContract();
  const result = (await contract.call("get_deal", [dealId])) as any;

  return {
    client: num.toHex(result.client ?? 0),
    sp: num.toHex(result.sp ?? 0),
    total_amount: BigInt(result.total_amount?.toString() ?? "0"),
    chunk_amount: BigInt(result.chunk_amount?.toString() ?? "0"),
    num_chunks: Number(result.num_chunks?.toString() ?? "0"),
    chunks_released: Number(result.chunks_released?.toString() ?? "0"),
    collateral: BigInt(result.collateral?.toString() ?? "0"),
    sla_deadline: Number(result.sla_deadline?.toString() ?? "0"),
    is_active: Boolean(result.is_active),
    is_slashed: Boolean(result.is_slashed),
  };
}

export async function getPkpPublicKey(): Promise<{ x: bigint; y: bigint }> {
  const contract = getContract();
  const result = (await contract.call("get_pkp_public_key")) as any;
  return {
    x: BigInt(result[0]?.toString() ?? "0"),
    y: BigInt(result[1]?.toString() ?? "0"),
  };
}

export async function checkRpcHealth(): Promise<boolean> {
  try {
    await provider.getBlockNumber();
    return true;
  } catch {
    return false;
  }
}

export function getConnectedContract(account: AccountInterface): Contract {
  return new Contract(abiJson as any, SLA_ESCROW_ADDRESS, account);
}

const CHUNK_RELEASED_KEY = hash.getSelectorFromName("ChunkReleased");

export async function getChunkReleasedEvents(
  dealId?: number | null,
): Promise<ChunkReleasedEvent[]> {
  if (!SLA_ESCROW_ADDRESS) return [];

  const eventsResponse = await provider.getEvents({
    address: SLA_ESCROW_ADDRESS,
    keys: [[CHUNK_RELEASED_KEY]],
    from_block: { block_number: 0 },
    to_block: { block_number: await provider.getBlockNumber() },
    chunk_size: 100,
  });

  const blockTimestamps = new Map<number, number>();

  const parsed: ChunkReleasedEvent[] = [];
  for (const ev of eventsResponse.events) {
    const eventDealId =
      BigInt(ev.keys[1] ?? "0") + (BigInt(ev.keys[2] ?? "0") << 128n);

    if (dealId != null && eventDealId !== BigInt(dealId)) continue;

    let timestamp: number | undefined;
    if (ev.block_number != null) {
      if (!blockTimestamps.has(ev.block_number)) {
        try {
          const block = await provider.getBlockWithTxHashes(ev.block_number);
          blockTimestamps.set(ev.block_number, block.timestamp);
        } catch {
          /* timestamp stays undefined */
        }
      }
      timestamp = blockTimestamps.get(ev.block_number);
    }

    parsed.push({
      deal_id: eventDealId,
      chunk_index: Number(num.toBigInt(ev.data[0] ?? "0")),
      amount:
        BigInt(ev.data[1] ?? "0") + (BigInt(ev.data[2] ?? "0") << 128n),
      sp: ev.data[3] ?? "0x0",
      transaction_hash: ev.transaction_hash,
      timestamp,
    });
  }

  parsed.sort((a, b) => b.chunk_index - a.chunk_index);
  return parsed;
}

export { SLA_ESCROW_ADDRESS, STARKNET_RPC_URL, provider };
