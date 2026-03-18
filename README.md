# SLAStream

**Cross-chain streaming payments for Filecoin Storage Providers, enforced by cryptographic proofs on Starknet.**

## The Problem

Filecoin Storage Providers (SPs) get paid in bulk after long storage periods, creating cash flow gaps and misaligned incentives. Clients have no way to enforce SLAs or claw back funds if an SP stops proving data. There's no trustless, real-time payment stream tied to actual proof-of-storage.

## How It Works

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  Filecoin FEVM   │     │   Lit Protocol     │     │  Starknet        │
│  (Calibration)   │────▶│   PKP Oracle       │────▶│  SLAEscrow       │
│                  │     │                    │     │                  │
│  PDP proofs      │     │  Verifies proof tx │     │  Releases chunk  │
│  posted on-chain │     │  Signs attestation │     │  payment to SP   │
└──────────────────┘     └───────────────────┘     └──────────────────┘
```

1. **Client** creates a deal on Starknet, locking STRK tokens in escrow (chunk payments + collateral)
2. **Storage Provider** stores data and posts PDP (Provable Data Possession) proofs to Filecoin Calibration FEVM
3. **Relay** monitors FEVM for `RootsAdded` events, then asks a **Lit Protocol PKP** to verify the proof tx and sign an attestation
4. **SLAEscrow** on Starknet verifies the secp256k1 signature and releases the next chunk payment to the SP
5. If the SLA deadline passes without enough proofs, **anyone** can slash the deal — collateral goes to the client

## Live Demo

- **Contract:** [SLAEscrow on Starknet Sepolia](https://sepolia.starkscan.co/contract/0x020a11bf272f2af470393707aab6250bbd58c7b6d268df9756846f17ecedbfb1)
- **Deal #5:** 3/3 chunks released and settled on-chain

## Quick Start

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local  # or create with:
# NEXT_PUBLIC_SLA_ESCROW_ADDRESS=0x020a11bf272f2af470393707aab6250bbd58c7b6d268df9756846f17ecedbfb1
# NEXT_PUBLIC_STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/demo
npm run dev
```

### Relay

```bash
cd relay
bun install
cp .env.example .env  # fill in your keys
bun run src/index.ts
```

### Contracts

```bash
cd contracts
scarb build
snforge test  # 5/5 tests passing
```

## Architecture

```
slastream/
├── contracts/          # Cairo smart contracts (SLAEscrow + MockERC20)
│   └── src/
│       ├── sla_escrow.cairo      # Main escrow with secp256k1 sig verification
│       ├── interfaces/           # ISLAEscrow trait
│       └── tests/                # 5 integration tests (snforge)
├── relay/              # TypeScript relay service
│   ├── src/
│   │   ├── fevm-monitor.ts       # Polls Filecoin FEVM for PDP proof events
│   │   ├── lit-bridge.ts         # Lit Protocol PKP signature requests
│   │   └── starknet-relay.ts     # Broadcasts release_chunk to Starknet
│   ├── lit-action/
│   │   └── action.js             # Lit Action: verifies proof, signs attestation
│   └── scripts/
│       ├── create-deal.ts        # CLI: create a deal on Starknet
│       └── deploy-contract.ts    # Deploy SLAEscrow via sncast
└── frontend/           # Next.js dashboard
    └── src/
        ├── app/dashboard/        # Deal browser, proof feed, slash UI
        ├── hooks/                # useDeals, useProofEvents, useTransaction
        └── lib/                  # Starknet RPC helpers, types
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Cairo 2.x, Scarb 2.8, Starknet Foundry |
| Oracle Bridge | Lit Protocol PKP (Chronicle Yellowstone) |
| Relay Service | TypeScript, Bun, ethers.js v5, starknet.js v7 |
| Frontend | Next.js 16, Tailwind CSS, starknet-react |
| Networks | Starknet Sepolia, Filecoin Calibration FEVM |

## How the Signature Verification Works

The SLAEscrow contract uses Cairo's native secp256k1 support to verify that chunk release requests are authentically signed by the Lit PKP oracle:

1. Relay constructs message: `keccak256(abi.encodePacked(dealId, chunkIndex, proofSetId, rootCID, timestamp))`
2. Lit Action verifies the FEVM proof tx, then signs the message with the PKP key
3. Contract recovers the public key from the signature and compares against the stored PKP public key
4. Only matching signatures release funds — replay protection via per-chunk release flags

## Team

Built by **Dami** for the Blockchain Hack 2025 hackathon.
