# SLAStream — Product Requirements Document

**Hackathon:** PL Genesis: Frontiers of Collaboration
**Track:** Fresh Code ($50K pool)
**Deadline:** March 31, 2026 (18 days remaining, 17 build days)
**Version:** V1
**Builder:** Dami (solo) — Cairo expert, Lagos Nigeria
**Sponsors Integrated:** Filecoin/Storacha (PDP), Lit Protocol (oracle bridge), Starknet (Cairo escrow + secp256k1 AA)

---

## 1. Project Overview

### One-Liner
SLAStream is the first proof-gated streaming payment system where Storage Providers are paid per verified chunk and automatically slashed when they fail — with zero human intervention, running entirely on-chain across Filecoin, Lit Protocol, and Starknet.

### Problem Statement
Filecoin Storage Providers have earned **$0 in retrieval revenue since the network's genesis block** — despite collectively holding over 3,600 petabytes of data. The reason is structural: no mechanism exists for a client in Singapore to pay an SP in Lagos per-chunk, with automatic enforcement if delivery fails. Without SLA enforcement, enterprises won't pay premium retrieval rates. Without retrieval revenue, SPs rely solely on block rewards, making Filecoin economically fragile.

The problem is ONLY solvable with blockchain: the client and SP are in different legal jurisdictions, have no shared legal entity, and neither trusts the other. You need a trustless arbiter that can (a) verify proof of data possession, (b) release conditional micropayments, and (c) auto-slash collateral — all without a human filing a claim.

**The shocking number:** $0 retrieval revenue / 1,400+ active SP operators / network genesis = structural failure that no off-chain SLA contract can fix.

**Real users TODAY:**
- Chen (SP Singapore): $420/month bandwidth costs, $0 retrieval revenue. No enterprise will pay without verified SLA.
- Emeka (SP Lagos): Loses 30-40% of potential deals because he can't provide verifiable SLA guarantees to clients.

### Solution
SLAStream creates a Cairo escrow contract on Starknet Sepolia that holds client STRK. A Storage Provider on Filecoin Calibration runs PDP (Proof of Data Possession) — continuously proving they hold each data chunk. A Lit Action on Chronicle Yellowstone monitors the Filecoin FEVM for PDP verification events, and when a proof confirms, a Lit PKP (secp256k1 key pair) signs and broadcasts a Starknet transaction that releases a streaming payment to the SP. If the SLA timer expires without proof, the Cairo contract automatically slashes the SP's collateral.

No human files a claim. No escrow agent. No cross-chain bridge. Lit Protocol is the trustless oracle connecting proof verification to payment release.

### Why This Wins
| Judging Criterion | Weight | How We Excel |
|---|:---:|---|
| Demo/Winnability | 30% | Live: payment bar fills per chunk → timer hits zero → automatic slash fires → Starknet explorer shows it. "No human did this." Visual drama at the exact moment the slash fires. |
| Innovation | 20% | Category creation: first proof-gated streaming payment for decentralized storage. Not a variation of an existing pattern — a new primitive. |
| Tech Depth | 20% | Three chains in one coherent pipeline. Cairo secp256k1 AA verifying a Lit PKP signature is a genuinely novel primitive. PDPVerifier as payment trigger is unexplored. |
| Impact | 15% | 1,400+ SPs TODAY. Solves a problem that has existed since Filecoin genesis. Enables a new revenue model: retrieval fees as a primary income stream. |
| Sponsor Integration | 15% | All 3 sponsors deeply integrated — not superficially. Filecoin PDP IS the proof source. Lit IS the oracle bridge. Starknet IS the payment escrow and slash engine. |

---

## 2. System Architecture Overview

### System Diagram
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SLASTREAM SYSTEM                                  │
└─────────────────────────────────────────────────────────────────────────────┘

CLIENT (Browser/Script)                    STORAGE PROVIDER (Server)
─────────────────────────                  ─────────────────────────
  │                                          │
  │ 1. lock(amount, spAddress,               │
  │    proofSetId, slaDeadline)              │
  ▼                                          │
┌────────────────────────────┐              │ 2. uploadChunk(data) →
│   CAIRO ESCROW CONTRACT    │              │    PDPServer.addRoots(proofSetId, roots)
│   Starknet Sepolia         │              │                │
│                            │              ▼                ▼
│  - deals: Map<DealId,Deal> │    ┌─────────────────────────────────────┐
│  - collateral: u256        │    │  PDP VERIFIER CONTRACT               │
│  - streamRelease(pkpSig)   │◄───│  Filecoin Calibration FEVM           │
│  - autoSlash(dealId)       │    │  0x85e366Cf9DD2c0aE37E963d9556F5f47  │
│  - secp256k1 AA sig verify │    │  18d6417C                           │
└────────────────────────────┘    │                                     │
         ▲                        │  emits: ProofSetLive(proofSetId)    │
         │                        │  emits: RootsAdded(proofSetId, cid) │
         │                        └─────────────────────────────────────┘
         │ 5. invoke(                        │
         │    streamRelease / autoSlash)     │ 3. FEVM event emitted
         │                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LIT ACTION (Chronicle Yellowstone)                         │
│                                                                               │
│  litAction.js:                                                                │
│  - ethers.JsonRpcProvider(CALIBRATION_RPC) → filter ProofSetLive events      │
│  - When event: extract proofSetId, verify against known dealId               │
│  - Build Starknet calldata: { dealId, proofSetId, chunkIndex, timestamp }    │
│  - Lit.Actions.signEcdsa({ toSign: starknetTxHash, keyType: "K256" })        │
│  - PKP secp256k1 signature → (r, s, v)                                       │
│                                                                               │
│  PKP Public Key: secp256k1 (registered at mint time, immutable)              │
│  Network: datil-test (Chronicle Yellowstone testnet)                         │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ 4. signed Starknet tx (r, s, v)
         ▼
┌────────────────────────────┐
│   RELAY SERVICE (Node.js)  │
│   Off-chain (no trust)     │
│                            │
│  - receives PKP signature  │
│  - broadcasts to Starknet  │
│    via starknet.js v7      │
│  - no private keys held    │
└────────────────────────────┘
         │
         └──────► Cairo Contract verifies secp256k1(sig, pkpPubKey)
                  → releases streaming payment OR no-op if already paid
```

### Component Table
| Component | Type | Purpose | Key Dependencies |
|-----------|------|---------|-----------------|
| Cairo Escrow Contract | Smart contract (Cairo) | Holds client STRK, releases per proof, auto-slashes on timeout | OpenZeppelin Cairo, secp256k1 corelib |
| PDP Verifier | Smart contract (Solidity, existing) | Verifies SP data possession on FEVM | @filoz/synapse-sdk, Filecoin Calibration |
| Lit Action | JS script (Lit Protocol) | Monitors FEVM events → signs Starknet tx via PKP | ethers.js v5, @lit-protocol/lit-node-client |
| Relay Service | Node.js backend | Broadcasts PKP-signed Starknet txs (trustless relayer) | starknet.js v7, @lit-protocol SDK |
| PDP Client | Node.js script | SP-side: creates proof sets, adds roots, manages PDP | @filoz/synapse-sdk |
| Deal CLI | TypeScript CLI | Client-side: creates deals, locks STRK, monitors status | starknet.js v7, Cairo ABI |
| Frontend Dashboard | Next.js (Phase 5 — Claude session, not Codex) | Visual payment bar, SLA timer, proof hash display | React, Tailwind v4, starknet.js v7 |

### Data Flow
The client creates a deal by calling `lock()` on the Cairo Escrow Contract with STRK amount, SP address, a pre-registered PDP proof set ID, and an SLA deadline. The SP runs a Curio server with `@filoz/synapse-sdk` to upload data chunks and call `addRoots()` on the PDP Server, which triggers the PDP Verifier on Filecoin Calibration FEVM to emit a `RootsAdded` event. A Lit Action running continuously on Chronicle Yellowstone monitors these events via `ethers.JsonRpcProvider`. When a matching event appears, the Lit Action builds Starknet calldata and calls `Lit.Actions.signEcdsa()` with `keyType: "K256"`, producing a secp256k1 `(r, s, v)` signature from the PKP. The Relay Service receives this signature and broadcasts an `invoke_function` transaction to the Cairo contract, which uses Cairo's native `secp256k1` corelib to verify the PKP signature. If valid, the contract releases a streaming payment increment to the SP. If the SLA timer expires before enough proofs arrive, the contract's `checkAndSlash()` function auto-executes, transferring SP collateral to the client.

---

## 3. User Flows

### Flow 1: Client Opens a Deal
1. Client generates a PDP proof set ID by calling `PDPServer.createProofSet()` via synapse-sdk (or uses a pre-negotiated proofSetId from the SP)
2. Client calls `SLAEscrow.lock(amount, spAddress, proofSetId, slaDeadline, chunkCount, paymentPerChunk)` on Starknet Sepolia with STRK tokens
3. Cairo contract records the deal, stores PKP public key for this deployment, emits `DealCreated(dealId, client, sp, amount, slaDeadline)`
4. Client receives `dealId` and shares it with SP out-of-band
5. SLA timer starts

### Flow 2: SP Delivers Data and Receives Streaming Payment
1. SP uploads a data chunk to Filecoin Calibration using `@filoz/synapse-sdk` PDP flow
2. SP calls `PDPServer.addRoots(proofSetId, clientDataSetId, nextRootId, rootDataArray)` — signed via `PDPAuthHelper`
3. PDP Verifier contract on FEVM emits `RootsAdded(proofSetId, rootCID)` event
4. Lit Action detects event within ~30s polling interval
5. Lit Action builds `releaseParams = { dealId, chunkIndex, proofSetId, rootCID, timestamp }`
6. Lit Action calls `Lit.Actions.signEcdsa({ toSign: keccak256(releaseParams), keyType: "K256" })` → PKP signs
7. Relay Service receives `(r, s, v)` and `releaseParams`, broadcasts `SLAEscrow.streamRelease(releaseParams, r, s, v)` to Starknet
8. Cairo contract verifies secp256k1 signature against registered PKP public key
9. Contract releases `paymentPerChunk` STRK to SP address
10. `PaymentReleased(dealId, chunkIndex, amount, spAddress)` event emitted

### Flow 3: SP Fails SLA — Automatic Slash
1. SLA deadline passes without `chunkCount` proofs received
2. Any party (or the relay service) calls `SLAEscrow.checkAndSlash(dealId)` on Starknet
3. Cairo contract checks: `block.timestamp > deal.slaDeadline AND deal.chunksProved < deal.chunkCount`
4. If condition true: transfers SP collateral to client address
5. `CollateralSlashed(dealId, spAddress, slashAmount)` event emitted on Starknet
6. Starknet explorer confirms slash transaction — visible, immutable, automatic

### Sequence Diagram (Happy Path)
```
Client      Cairo Escrow     PDP Verifier       Lit Action        Relay
  │               │          (FEVM)            (Chronicle)        Service
  │──lock()──────►│               │                │                │
  │◄──DealCreated─┤               │                │                │
  │               │    SP uploads + addRoots       │                │
  │               │          │◄─────────────────────────────────────┤ (SP sends tx directly to FEVM)
  │               │          │─RootsAdded─────────►│                │
  │               │          │                │◄───signEcdsa()      │
  │               │          │                │──(r,s,v)───────────►│
  │               │◄─────────────────streamRelease(r,s,v)───────────┤
  │               │──verify secp256k1──────────────────────────────  │
  │               │──PaymentReleased──►                              │
```

---

## 4. Technical Specifications

### Cairo Escrow Contract (`SLAEscrow`)
- **Purpose:** Holds client STRK, conditionally releases per verified chunk, auto-slashes on SLA expiry
- **Interface:**
  ```
  fn lock(sp_address: ContractAddress, proof_set_id: u256, sla_deadline: u64,
          chunk_count: u32, payment_per_chunk: u256, collateral_required: u256) -> DealId
  fn stream_release(deal_id: DealId, chunk_index: u32, proof_set_id: u256,
                    root_cid: ByteArray, timestamp: u64,
                    r: u256, s: u256, v: u32) -> bool
  fn check_and_slash(deal_id: DealId) -> bool
  fn get_deal(deal_id: DealId) -> Deal
  fn get_pkp_public_key() -> Secp256k1Point
  ```
- **Key Data Structures:**
  ```
  struct Deal {
      client: ContractAddress,
      sp: ContractAddress,
      total_amount: u256,
      proof_set_id: u256,
      sla_deadline: u64,
      chunk_count: u32,
      payment_per_chunk: u256,
      chunks_proved: u32,
      collateral: u256,
      status: DealStatus,  // Active | Completed | Slashed
  }
  struct DealId = u64  // auto-increment
  ```
- **Dependencies:** OpenZeppelin Cairo (IERC20), starknet corelib secp256k1, Starknet Sepolia STRK token
- **Events:**
  ```
  DealCreated { deal_id: DealId, client: ContractAddress, sp: ContractAddress, amount: u256, sla_deadline: u64 }
  PaymentReleased { deal_id: DealId, chunk_index: u32, amount: u256, sp: ContractAddress }
  CollateralSlashed { deal_id: DealId, sp: ContractAddress, slash_amount: u256 }
  ```
- **Constructor:**
  ```
  fn constructor(
    pkp_public_key_x: u256,   // secp256k1 X coordinate of Lit PKP public key
    pkp_public_key_y: u256,   // secp256k1 Y coordinate of Lit PKP public key
    strk_token_address: ContractAddress  // STRK ERC20 on Sepolia
  )
  ```
- **Constraints:** secp256k1 verify uses `starknet::secp256k1::recover_public_key()` from corelib — no external library. PKP public key registered at deploy time as immutable constant. Single PKP per contract deployment. STRK token address on Sepolia: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`

### PDP Client (`pdp-client.ts`)
- **Purpose:** SP-side: upload data chunks, create proof sets, add roots, monitor proof status
- **Interface:**
  ```typescript
  async function createProofSet(params: {
    clientDataSetId: string,
    payee: string,     // SP FEVM address
    withCDN: boolean,
    recordKeeper: string  // PDP Verifier address
  }): Promise<{ txHash: string }>

  async function waitForProofSet(txHash: string): Promise<{ proofSetId: bigint }>

  async function addRoots(params: {
    proofSetId: bigint,
    clientDataSetId: string,
    nextRootId: number,
    rootDataArray: Array<{ cid: string, rawSize: number }>
  }): Promise<{ txHash: string }>

  async function getProofSetStatus(proofSetId: bigint): Promise<{
    isLive: boolean,
    rootCount: number
  }>
  ```
- **Key Data Structures:** Uses `@filoz/synapse-sdk` `PDPServer` and `PDPAuthHelper` classes
- **Dependencies:** `@filoz/synapse-sdk`, ethers.js v5, Filecoin Calibration RPC
- **Events/Signals:** Monitors `RootsAdded(proofSetId, cid)` from PDP Verifier at `0x85e366Cf9DD2c0aE37E963d9556F5f4718d6417C`
- **Constraints:** Auth required: PDPAuthHelper signs requests with SP's FEVM private key

### Lit Action (`litAction.js`)
- **Purpose:** Oracle bridge — monitors FEVM for PDP verification events, triggers PKP signing
- **Interface:** No external API — executed by LitNodeClient
- **Key Data Structures:**
  ```typescript
  // Input params passed to Lit Action:
  interface LitActionParams {
    dealId: string,          // hex
    proofSetId: string,      // hex
    chunkIndex: number,
    rootCID: string,
    timestamp: number,
    starknetTxPayload: string // keccak256 hash of release calldata
  }
  // Output:
  interface LitActionResult {
    r: string,  // 32-byte hex
    s: string,  // 32-byte hex
    v: number   // 27 or 28
  }
  ```
- **Dependencies:** ethers.js v5 (bundled in Lit Action env), `Lit.Actions.signEcdsa` built-in
- **Events/Signals:** Filters `RootsAdded` events from PDP Verifier using `ethers.Contract.queryFilter()`
- **toSign construction** (what the PKP actually signs):
  ```
  // The relay service constructs this off-chain and passes it as jsParams:
  const releasePayload = ethers.utils.solidityPack(
    ["uint256", "uint32", "uint256", "bytes32", "uint64"],
    [dealId, chunkIndex, proofSetId, rootCID, timestamp]
  )
  const starknetTxPayload = ethers.utils.keccak256(releasePayload)
  // Lit Action calls:
  // Lit.Actions.signEcdsa({ toSign: ethers.utils.arrayify(starknetTxPayload), keyType: "K256" })
  ```
- **Flow: Lit Action → Relay coordination:** The Relay Service runs a Node.js HTTP server. After obtaining a PKP session, it: (1) polls FEVM for new RootsAdded events, (2) for each matching event, calls `litNodeClient.executeJs()` which returns `(r, s, v)`, (3) immediately POSTs to itself (`/relay`) to broadcast to Starknet. The Lit Action is a pure signing primitive — it does NOT make external HTTP calls. The Relay Service orchestrates everything.
- **Constraints:** Lit Actions run in a sandboxed JS environment. `fetch()` is available for RPC calls but we use the simpler pattern: Relay polls FEVM externally and passes event data as `jsParams`. `keyType: "K256"` required for secp256k1 signing. Must use `datil-test` network for Chronicle Yellowstone.

### Relay Service (`relay.ts`)
- **Purpose:** Orchestrator and trustless broadcaster — polls FEVM for PDP events, calls Lit Action to get PKP signatures, broadcasts signed txs to Starknet. Holds no secrets (signing is done by Lit PKP, verification is done by Cairo contract).
- **Architecture:** Two loops in one process:
  1. **Event poller** (every 30s): `ethers.Contract.queryFilter(RootsAdded, fromBlock)` against Calibration FEVM. For each new event matching a known dealId, builds `jsParams` and calls `litNodeClient.executeJs()`.
  2. **Broadcaster**: on receipt of `(r, s, v)` from Lit Action, calls `starknet.Account.execute(stream_release(...))` against Starknet Sepolia.
- **Interface:**
  ```typescript
  // Internal relay loop (no HTTP server needed for MVP):
  async function startRelayLoop(dealIds: bigint[]): Promise<void>
  async function processProofEvent(event: RootsAddedEvent): Promise<string> // returns starknetTxHash
  async function broadcastStreamRelease(params: ReleaseParams, sig: LitSig): Promise<string>
  ```
- **Dependencies:** starknet.js v7, ethers.js v5, `@lit-protocol/lit-node-client`, `RpcProvider({ nodeUrl: STARKNET_SEPOLIA_RPC })`
- **Constraints:** Relay holds no private keys. Uses a burner Starknet wallet ONLY for paying gas (not for signing content — content is signed by Lit PKP). Rate limit: 1 release per dealId+chunkIndex pair (deduplicated in memory to prevent double-spend). Burner wallet needs ~0.01 ETH equivalent in STRK for gas.

### Deal CLI (`deal-cli.ts`)
- **Purpose:** Client-side command-line tool for creating deals, monitoring deal status, and triggering slash checks
- **Interface:**
  ```
  npx slastream create-deal --sp <address> --amount <strk> --chunks <n> --sla <seconds> --proof-set <id>
  npx slastream deal-status --id <dealId>
  npx slastream check-slash --id <dealId>
  ```
- **Key Data Structures:**
  ```typescript
  interface DealConfig {
    spAddress: string,         // Starknet address of SP
    amount: bigint,            // total STRK locked
    chunkCount: number,        // total expected chunks
    slaDurationSeconds: number,
    proofSetId: bigint,        // pre-negotiated FEVM proofSetId
    paymentPerChunk: bigint    // = amount / chunkCount
  }
  interface DealStatus {
    dealId: bigint,
    chunksProved: number,
    totalChunks: number,
    slaDeadline: Date,
    status: "Active" | "Completed" | "Slashed",
    txHistory: string[]        // Starknet tx hashes
  }
  ```
- **Dependencies:** starknet.js v7, SLAEscrow ABI, `.env` for contract address + RPC
- **Events/Signals:** Reads `DealCreated`, `PaymentReleased`, `CollateralSlashed` events from SLAEscrow
- **Constraints:** Requires funded Starknet Sepolia wallet with STRK. Client must call `IERC20(STRK_TOKEN_ADDR).approve(SLA_ESCROW_ADDR, amount)` before `create-deal`. STRK token on Sepolia: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`. The `create-deal` command should auto-issue the approval tx before the lock tx in the same CLI call.

### PDP Verifier Contract (existing, read-only reference)
- **Purpose:** On-chain verifier on Filecoin Calibration FEVM — SP posts proofs here
- **Address:** `0x85e366Cf9DD2c0aE37E963d9556F5f4718d6417C` (Filecoin Calibration)
- **Events we read:**
  ```solidity
  event RootsAdded(uint256 indexed proofSetId, bytes32[] rootCIDs);
  event ProofSetLive(uint256 indexed proofSetId);
  ```
- **Dependencies:** None (we only read events via ethers.js)
- **Constraints:** Read-only from our system — we never write to this contract directly. SP writes via @filoz/synapse-sdk.

---

## 5. API Contracts

### External API: Filecoin Calibration FEVM (read-only)
- **Base URL:** `https://api.calibration.node.glif.io/rpc/v1`
- **Chain ID:** 314159
- **Authentication:** None (public RPC)
- **Rate Limits:** ~3,000 req/min (Glif public)

#### Usage: ethers.js event filter
- **Pattern:**
  ```typescript
  const provider = new ethers.JsonRpcProvider("https://api.calibration.node.glif.io/rpc/v1")
  const pdpVerifier = new ethers.Contract(PDP_VERIFIER_ADDR, PDP_ABI, provider)
  const events = await pdpVerifier.queryFilter(pdpVerifier.filters.RootsAdded(proofSetId))
  ```
- **Response shape:**
  ```json
  [{ "args": { "proofSetId": "42", "rootCIDs": ["0xabc..."] }, "blockNumber": 1234567, "transactionHash": "0x..." }]
  ```

### External API: Synapse SDK / PDP Server
- **Base URL:** Curio server run by SP (local in testnet, or hosted)
- **Authentication:** ECDSA signature via PDPAuthHelper (SP's FEVM private key)
- **Rate Limits:** None (self-hosted)

#### Endpoint: createProofSet
- **SDK Call:** `PDPServer.createProofSet({ clientDataSetId, payee, withCDN, recordKeeper })`
- **Response (success):**
  ```json
  { "txHash": "0x..." }
  ```

#### Endpoint: getProofSetCreationStatus
- **SDK Call:** `PDPServer.getProofSetCreationStatus(txHash)`
- **Response (success):**
  ```json
  { "status": "complete", "proofSetId": 42 }
  ```

#### Endpoint: addRoots
- **SDK Call:** `PDPServer.addRoots({ proofSetId, clientDataSetId, nextRootId, rootDataArray })`
- **Response (success):**
  ```json
  { "txHash": "0x..." }
  ```

### External API: Lit Protocol (Chronicle Yellowstone)
- **Network:** `datil-test` (Chronicle Yellowstone testnet, chain ID 175188)
- **RPC URL:** `https://yellowstone-rpc.litprotocol.com/`
- **Authentication:** Session signatures (capacityDelegationAuthSig required on datil/datil-test)
- **Rate Limits:** Per capacity credit allocation

#### SDK Call: executeLitAction
- **Pattern:**
  ```typescript
  const result = await litNodeClient.executeJs({
    ipfsId: LIT_ACTION_IPFS_CID,
    sessionSigs,
    jsParams: { dealId, proofSetId, chunkIndex, rootCID, timestamp, starknetTxPayload }
  })
  ```
- **Response (success):**
  ```json
  { "response": { "r": "0x...", "s": "0x...", "v": 27 } }
  ```

### External API: Starknet Sepolia
- **RPC URL:** `https://starknet-sepolia.public.blastapi.io/rpc/v0_8`
- **Fallback RPC:** `https://api.zan.top/public/starknet-sepolia/rpc/v0_10`
- **Chain ID:** `SN_SEPOLIA` (hex: `0x534e5f5345504f4c4941`)
- **Authentication:** None (public RPC)
- **Rate Limits:** BlastAPI: ~15 req/s public. Use Alchemy or Infura for production.

#### Endpoint: invoke_function (stream_release)
- **Pattern:**
  ```typescript
  const account = new Account(provider, CONTRACT_ADDRESS, starknetSigner)
  const result = await account.execute({
    contractAddress: SLA_ESCROW_ADDRESS,
    entrypoint: "stream_release",
    calldata: [dealId, chunkIndex, proofSetId, rootCID, timestamp, r, s, v]
  })
  ```

---

## 6. Demo Script

**Total Duration:** ~3.5 minutes
**Format:** Pre-recorded screen capture with voiceover, live fallback available
**Demo stack:** Running on Starknet Sepolia + Filecoin Calibration + Chronicle Yellowstone (all testnets)

### Demo Prerequisites
- Cairo contract deployed to Starknet Sepolia, address saved to `.env`
- PKP minted on Chronicle Yellowstone, public key registered in contract
- Lit Action uploaded to IPFS, CID saved to `.env`
- SP server (Curio) running locally with Calibration testnet connection
- Test STRK obtained from Starknet Sepolia faucet (https://blastapi.io/faucets/starknet-sepolia-strk)
- Test FIL obtained from Filecoin Calibration faucet (https://faucet.calibration.fildev.network/)
- Relay service running locally on port 3001
- Frontend dashboard running on port 3000 showing live Starknet events

---

### Scene 1: The Problem (30 seconds)

**Screen:** Split screen — Filecoin storage stats showing 3,600 PB stored. Right side: "$0 retrieval revenue" in large text.

**Voiceover:** "Filecoin stores over three thousand, six hundred petabytes of data. One thousand, four hundred storage providers. Since genesis day — zero dollars in retrieval revenue. Why? Because there is no verified SLA. An enterprise in Singapore will not pay premium retrieval rates to a provider in Lagos unless they can prove the data is there, delivered on time, with automatic consequences if it's not. That problem only exists because these parties are in different countries with no shared legal system. Blockchain is not an option — it's the only option."

**Action:** Text counter animates from 3,600 PB to "SPs paid for retrieval: $0". Counter holds for 2 seconds.

---

### Scene 2: Deal Creation (30 seconds)

**Screen:** Terminal / Deal CLI interface. Command being typed.

**Voiceover:** "SLAStream. The client creates a deal — locks STRK into a Cairo escrow on Starknet. Five hundred STRK, ten chunks, twenty-four hour SLA, fifty STRK per chunk."

**Action:**
```
$ npx slastream create-deal \
  --sp 0x1a2b...c3d4 \
  --amount 500 \
  --chunks 10 \
  --sla 86400 \
  --proof-set 42
```
Terminal shows: `Deal created. ID: 7. TX: 0x8f3a... (Starknet Sepolia)`
Show Starknet explorer link opening to the lock transaction. Contract balance: 500 STRK visible.

---

### Scene 3: Data Delivery + Payment Bar Filling (90 seconds)

**Screen:** SLAStream Dashboard — full screen. Shows:
- Left: "Deal #7" with progress bar at 0%
- Center: SLA timer counting down (24h → 23h59m...)
- Right: Starknet transaction log (empty)
- Bottom: "Waiting for first proof..."

**Voiceover:** "The storage provider uploads chunk one to Filecoin Calibration. The PDP verifier contract checks the proof. That event travels through Lit Protocol's oracle network — running on Chronicle Yellowstone — a Lit PKP signs a Starknet transaction with its secp256k1 key. No human touched this. The Cairo contract verifies the signature natively. Payment releases."

**Action (timestamp 0s):** SP terminal shows `addRoots({ proofSetId: 42, rootDataArray: [{ cid: "bafk...", rawSize: 1048576 }] })`

**Action (~15s):** FEVM explorer opens to calibration.filfox.info showing `RootsAdded` event at PDP Verifier `0x85e366Cf9DD2c0aE37E963d9556F5f4718d6417C` at block 1,234,567 — the same live contract that FilOz runs

**Action (~30s):** Dashboard shows "Lit Action detected proof — signing Starknet tx..." with spinning indicator

**Action (~45s):** Dashboard shows Starknet explorer link appearing in log: `PaymentReleased | deal_id: 7 | chunk: 1 | amount: 50 STRK`

**Action (~50s):** Payment bar jumps from 0% to 10%. SP balance updates: +50 STRK

**Voiceover (continuing):** "Chunk two... three... four..."

**Action (60s–90s):** Fast-forward — show 4 more chunks completing. Payment bar reaches 50% (5 of 10 chunks). Bar fills with a satisfying animation. Starknet explorer log shows 5 `PaymentReleased` transactions stacking up. SP total received: 250 STRK.

---

### Scene 4: The Wow Moment — Automatic Slash (60 seconds)

**Screen:** Dashboard with SLA timer. Bar is at 50% (5 of 10 chunks proved). Timer is now showing 00:00:05... 00:00:04...

**Voiceover:** "Now the storage provider goes offline. The deadline passes."

**Action (0s):** Timer hits 00:00:00. Red border pulses on the dashboard.

**Voiceover:** "No one files a claim. No arbitration. No escrow agent. Watch what happens."

**Action (~5s):** Dashboard shows: "SLA EXPIRED. Checking slash condition..."

**Action (~8s):** A transaction fires automatically from the relay. Terminal shows: `checkAndSlash(7) → Starknet tx 0xd4f2...`

**Action (~15s):** Starknet explorer opens (pre-loaded). Shows `CollateralSlashed | deal_id: 7 | sp: 0x1a2b... | amount: 250 STRK | to: client`. Transaction confirmed.

**Action (~20s):** Dashboard updates. Red "SLASHED" badge on deal. Client balance recovers 250 STRK.

**Voiceover:** "Two hundred and fifty STRK — the remaining collateral — transferred to the client. Automatically. On-chain. Cairo contract executed. No human did this. This is SLAStream."

**Action (final 10s):** Hold on the Starknet explorer showing the slash transaction. No editing. Just the raw explorer. Then fade to logo.

---

## 7. Risk Register

| # | Risk | Severity | Likelihood | Impact | Mitigation | Plan Phase |
|---|------|----------|-----------|--------|------------|:---:|
| 1 | FOC PDP proof event not readable from Lit Action (FEVM RPC incompatibility with Lit sandbox) | CRITICAL | MEDIUM | Lit bridge cannot detect proofs — core flow broken | Lit Actions support `fetch()` to any HTTP endpoint. Use ethers.js JsonRpcProvider with Glif HTTPS RPC inside Lit Action. If Lit sandbox blocks external RPC: pre-sign a batch of release messages off-chain during demo (pre-recorded path). | Phase 2 |
| 2 | Lit PKP secp256k1 → Starknet end-to-end fails (signature format mismatch) | CRITICAL | MEDIUM | Cairo cannot verify PKP signature — payment cannot release | Verify `keyType: "K256"` produces standard secp256k1 ECDSA. Cairo's `recover_public_key` expects (r, s, v) in felt252 format. Write integration test that signs test bytes with PKP and verifies with Cairo corelib. If v is 0/1 instead of 27/28, adjust. | Phase 2 |
| 3 | Filecoin Calibration RPC instability (Glif public node rate limit / downtime) | HIGH | LOW | FEVM event polling fails → Lit Action cannot trigger → payment stalls | Primary: `https://api.calibration.node.glif.io/rpc/v1`. Backup: `https://rpc.ankr.com/filecoin_testnet` (Ankr). Implement retry with 3 fallback RPCs in Lit Action. | Phase 2 |
| 4 | Chronicle Yellowstone testnet downtime during demo | HIGH | LOW | Lit Actions cannot execute → entire oracle bridge dead | Pre-record the full demo at least 48h before deadline. Live demo as preferred but pre-recording as definitive backup. In submission materials, include recording even for live demo. | Phase 4 |
| 5 | Cairo secp256k1 gas cost too high (stream_release tx too expensive) | HIGH | LOW | SP cannot economically receive payments; demo appears broken | Cairo secp256k1 verify is ~20k gas equivalent — acceptable. Test actual gas on Starknet Sepolia before demo. If too expensive: batch 5 chunks per release call. | Phase 1 |
| 6 | Starknet Sepolia faucet exhausted / STRK unavailable | HIGH | MEDIUM | Cannot fund demo wallets | Use official faucet at `https://blastapi.io/faucets/starknet-sepolia-strk`. Request 2 days before needed. Backup: ask in Starknet Discord for testnet STRK. Have 3 funded wallets ready. | Phase 0 |
| 7 | Demo timing: live blockchain variable latency makes demo feel slow | HIGH | HIGH | Judges lose attention during 30–45s wait for proof confirmation | Pre-show the architecture during wait ("while this proves on-chain, here's what's happening..."). Alternatively, pre-populate 4 chunks in advance and only do final 1 chunk live. Time per-chunk flow at <60s total. | Phase 4 |
| 8 | @filoz/synapse-sdk API changes between now and March 31 | MEDIUM | LOW | PDP client code breaks on npm install | Pin to specific version (check npm for latest stable at time of build). Use `package-lock.json` or `bun.lockb`. Read actual SDK source before writing integration code. | Phase 0 |
| 9 | SP adoption cold-start problem (post-hackathon) | MEDIUM | HIGH | Judges ask "will SPs actually use this?" | Answer: 1,400 active SPs exist TODAY. Chen and Emeka archetypes are real pain points. Initial deployments need only 1 SP. Post-hackathon: partner directly with 1-2 SPs from FilecoinSP community. Not a demo risk. | N/A |
| 10 | starknet.js v7 breaking changes / Sepolia RPC incompatibility | MEDIUM | LOW | Relay service cannot broadcast transactions | Pin to v7.6.4. Test broadcast with a simple transfer on Sepolia day 1 before building relay. Fallback: use starkli CLI for broadcasting during demo. | Phase 0 |
| 11 | Lit Action IPFS upload takes too long / CID changes | MEDIUM | LOW | Lit Action cannot be referenced by stable CID | Upload Lit Action to IPFS on Day 6 and keep IPFS pinned. Use Web3.Storage or NFT.Storage for persistence. Store CID in `.env`. | Phase 2 |
| 12 | secp256k1 account class hash not available on Starknet Sepolia (OZ EthAccount not declared) | HIGH | MEDIUM | Cannot deploy secp256k1 account / Cairo contract cannot verify PKP sig | Use OZ Cairo contracts precompiled. Declare EthAccountComponent on Sepolia if not already present. Alternatively: embed secp256k1 verify directly in SLAEscrow (no account abstraction needed — just inline verification). | Phase 1 |
| 13 | Synapse SDK / Curio PDP server unavailable or misconfigured for testnet demo | HIGH | MEDIUM | SP cannot create proof sets or add roots — PDP flow dead — entire demo fails at source | For demo: use a pre-created proofSetId with roots already added (stored in .env). Lit Action reads historical events from already-processed blocks. Demo still shows live Starknet payment release. Full live path tested before recording. | Phase 2 |

### Risk Categories Covered
- [x] Technical risks (API failures, bugs, integration)
- [x] Competitive risks (SP adoption cold-start)
- [x] Time risks (features that might not finish — per phase buffers)
- [x] Demo risks (timing, latency, blockchain variability)
- [x] Judging risks (hostile Q&A answered in Section 1)
- [x] Scope risks (frontend is last and minimal — separate session)

---

## 8. Day-by-Day Build Plan

| Day | Date | Primary Objective | Secondary Objective | Deliverable |
|:---:|------|------------------|--------------------|-----------  |
| 1 | Mar 13 | Phase 0: Project setup. Init repo, install deps, fund wallets, test Starknet Sepolia + Filecoin Calibration RPC connectivity | Read @filoz/synapse-sdk source code — understand exact PDPServer/PDPAuthHelper API | Funded wallets. Repo initialized. RPC connectivity confirmed. SDK version pinned. |
| 2 | Mar 14 | PDP spike test — run createProofSet + addRoots against Filecoin Calibration. Observe RootsAdded event on FEVM explorer | Read PDP Verifier contract ABI at 0x85e366... | Proof set created. RootsAdded event confirmed visible on FEVM. pdp-client.ts v0. |
| 3 | Mar 15 | Cairo Escrow Contract — write SLAEscrow.cairo with lock(), stream_release(), check_and_slash() | secp256k1 signature verification unit test in Cairo | SLAEscrow.cairo compiles with scarb. |
| 4 | Mar 16 | Cairo contract tests — test lock, stream_release, slash logic. Use starknet-foundry (snforge) | Handle edge cases: double-release, slash after full payment | All snforge tests passing. Contract bytecode ready. |
| 5 | Mar 17 | Deploy Cairo contract to Starknet Sepolia. Verify on Starkscan. | Register PKP public key in contract constructor | Deployed address saved to .env. Contract verified. |
| 6 | Mar 18 | Lit PKP minting — mint PKP on datil-test. Register public key. Test pkpSign() with raw bytes. | Upload placeholder Lit Action to IPFS, get CID | PKP minted. Public key confirmed secp256k1. Test signature verified off-chain. |
| 7 | Mar 19 | Lit Action v1 — write litAction.js to monitor FEVM events + trigger sign | Test Lit Action execution with executeJs() from Node.js | Lit Action IPFS CID confirmed. executeJs returns (r, s, v). |
| 8 | Mar 20 | Relay Service — write relay.ts that receives (r, s, v) and broadcasts stream_release to Starknet | Test relay with manually crafted signature | Relay broadcasts tx. Starknet Sepolia shows invocation. |
| 9 | Mar 21 | End-to-end integration test 1: PDP addRoots → FEVM event → Lit Action → PKP sign → Relay → Cairo verify → PaymentReleased | Debug signature format (r, s, v felt encoding) | Full happy path: 1 chunk payment completes end-to-end. |
| 10 | Mar 22 | End-to-end integration test 2: Run 5 chunks. Confirm streaming. Measure latency per chunk. | Fix any timing issues in Lit Action event polling | 5-chunk streaming payment confirmed. Latency measured. |
| 11 | Mar 23 | Auto-slash test: deploy deal, let timer expire, confirm slash tx fires | Edge case: slash attempt before deadline (should fail) | Slash confirmed on Starknet Sepolia. Explorer link saved. |
| 12 | Mar 24 | Demo polish: prepare funded wallets. Script the exact demo commands. Time every step. | Deal CLI polish — make output clean for screen recording | Demo run-through takes <4 minutes. All commands ready. |
| 13 | Mar 25 | Frontend Dashboard (Phase 5 — SEPARATE Claude session, NOT Codex) — Start Next.js frontend | Payment bar component. SLA timer. Starknet event listener via starknet.js. | Frontend connects to deployed contract. Events display in real time. |
| 14 | Mar 26 | Frontend polish. Demo dry run with full frontend visible. | Fix any display lag or visual bugs | Final frontend deployed. Demo looks like a real product. |
| 15 | Mar 27 | Full demo run-through x3. Record best take. | Prepare submission: README, project description, sponsor integrations | Demo recording saved. |
| 16 | Mar 28 | Video production: add voiceover if not live. Add captions. Edit to 3.5 min. | Write submission text emphasizing $0 retrieval revenue stat | Submission video finalized. |
| 17 | Mar 29 | Submit to plgenesis.devspot.app. Verify all fields correct. | Buffer day: fix any last-minute issues | Submission confirmed. |
| 18 | Mar 30 | Full buffer — use only if something broke in days 1-17 | — | — |

### Buffer Allocation
Day 18 (Mar 30) is a dedicated buffer. Additionally, Day 17 (Mar 29) includes submission only — code freeze is Day 16. End-to-end integration runs across Days 9-11, providing natural buffer if any single day's task slips. Frontend is scoped minimally and intentionally placed late (Days 13-14) — even if cut entirely, the core demo works via CLI.

---

## 9. Dependencies & Prerequisites

### External Services
| Service | URL | Auth Required | Status |
|---------|-----|:---:|---|
| Filecoin Calibration RPC (Glif) | https://api.calibration.node.glif.io/rpc/v1 | No | Live |
| Filecoin Calibration RPC (Ankr backup) | https://rpc.ankr.com/filecoin_testnet | No | Live |
| Starknet Sepolia RPC (BlastAPI) | https://starknet-sepolia.public.blastapi.io/rpc/v0_8 | No | Live |
| Starknet Sepolia RPC (ZAN backup) | https://api.zan.top/public/starknet-sepolia/rpc/v0_10 | No | Live |
| Chronicle Yellowstone RPC | https://yellowstone-rpc.litprotocol.com/ | No | Live |
| Starknet Sepolia STRK Faucet | https://blastapi.io/faucets/starknet-sepolia-strk | No | Live |
| Filecoin Calibration Faucet | https://faucet.calibration.fildev.network/ | No | Live |
| Starkscan (Starknet explorer) | https://sepolia.starkscan.co/ | No | Live |
| FEVM Explorer | https://calibration.filfox.info/ | No | Live |
| Yellowstone Explorer | https://yellowstone-explorer.litprotocol.com/ | No | Live |
| PDP Verifier Contract | 0x85e366Cf9DD2c0aE37E963d9556F5f4718d6417C on Calibration | No | Live (existing contract) |
| IPFS (for Lit Action upload) | https://w3s.link or NFT.Storage | Yes (free API key) | Live |

### Development Tools
| Tool | Version | Purpose | Install Command |
|------|---------|---------|----------------|
| scarb | 2.8.x | Cairo package manager + compiler | `curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh \| sh` |
| snforge (Starknet Foundry) | 0.31.x | Cairo contract testing | `curl -L https://raw.githubusercontent.com/foundry-rs/starknet-foundry/master/scripts/install.sh \| sh` |
| starkli | 0.3.x | Starknet CLI for deployment | `curl https://get.starkli.sh \| sh` |
| bun | 1.x | TypeScript runtime | `curl -fsSL https://bun.sh/install \| bash` |
| @filoz/synapse-sdk | latest stable | PDP integration | `bun add @filoz/synapse-sdk` |
| @lit-protocol/lit-node-client | ^6.x | Lit Action execution | `bun add @lit-protocol/lit-node-client` |
| starknet (starknet.js) | ^7.6.4 | Starknet JS interactions | `bun add starknet` |
| ethers | ^5.7.x | FEVM RPC (Lit Actions require v5) | `bun add ethers@5` |
| typescript | ^5.x | Language | `bun add -d typescript` |

### Accounts & Credentials
| Account | Purpose | How to Get |
|---------|---------|-----------|
| Starknet Sepolia wallet (client) | Lock STRK for test deals | Deploy ArgentX or Braavos to Sepolia. Fund from STRK faucet. |
| Starknet Sepolia wallet (SP) | Receive streaming payments | Second Starknet Sepolia wallet. |
| FEVM Calibration wallet (SP) | Interact with PDP Verifier | MetaMask + add Filecoin Calibration network (ChainID 314159). Fund from faucet. |
| Lit Protocol capacity credit | Execute Lit Actions on datil-test | Mint capacity credit on Chronicle Yellowstone. Uses tstLPX gas token. |
| IPFS API key | Upload and pin Lit Action script | web3.storage free account or nft.storage. |

### On-Chain Addresses
| Item | Address | Network | Source |
|------|---------|---------|--------|
| PDP Verifier Contract | `0x85e366Cf9DD2c0aE37E963d9556F5f4718d6417C` | Filecoin Calibration | Provided in project brief — VERIFIED |
| STRK Token (Sepolia) | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` | Starknet Sepolia | Official Starknet docs |
| SLAEscrow Contract | TBD (deploy Day 5) | Starknet Sepolia | Generated at deployment |
| Lit PKP Address | TBD (mint Day 6) | Chronicle Yellowstone | Generated at mint |
| Lit Action IPFS CID | TBD (upload Day 7) | IPFS | Generated at upload |

---

## 10. Concerns Compliance

| # | Severity | Concern | How PRD Addresses It |
|---|:---:|---------|----------------------|
| 1 | C | Time NOT a constraint (tooling = 10x speed) | 17 build days allocated. Scope designed to be completable in ~12 days, leaving 5 days buffer. No scope creep. Frontend is minimal and separate. |
| 2 | C | Uniqueness is NON-NEGOTIABLE | SLAStream is in a category that does not exist: proof-gated streaming payment for decentralized storage with automatic on-chain slash. Zero competitors found. Not a tutorial project. |
| 3 | C | "Does this help real humans?" test | Chen (Singapore SP, $0 retrieval revenue) and Emeka (Lagos SP, losing 30-40% deals) are real archetypes from Filecoin SP community data. 1,400+ active SPs exist today who could use this on day 1. |
| 4 | C | Cumulative corrections carry forward | All V1-V7 corrections applied. No banned ideas. No credentials/identity/voting. Ecosystem-native. Demo quality prioritized. |
| 5 | C | Must solve a SIGNIFICANT real problem | $0 retrieval revenue since Filecoin genesis = structural failure of a $500M+ network. Quantified in Problem Statement with specific numbers. |
| 6 | C | Must serve actual target users who exist TODAY | 1,400+ active SP operators. Two specific user personas (Chen, Emeka) with specific dollar amounts. |
| 7 | C | Ideas must be ECOSYSTEM-NATIVE | PDP (Proof of Data Possession) is a uniquely Filecoin primitive. secp256k1 AA is uniquely Starknet. Lit PKP oracle bridge is uniquely Lit Protocol. None of these can be substituted. |
| 8 | C | If a tutorial exists, it's DOA | No tutorial, blog post, or existing project builds Cairo secp256k1 AA + Lit PKP + PDP proof as payment trigger. This is research-level novel. |
| 9 | C | Category CREATION, not category entry | Category: "proof-gated streaming payment with automatic SLA enforcement across heterogeneous chains." This category does not exist in DeFi, storage, or DePIN. |
| 10 | C | Be BRUTAL in cross-examination | Hostile Q&A answers embedded in Problem Statement: "Why blockchain?" answered in <10 seconds. "Why not Chainlink?" — no Chainlink oracle for PDP events. "Why Starknet?" — Cairo secp256k1 AA is the killer feature. |
| 11 | C | HARD CONSTRAINT: problem ONLY exists because of blockchain | Explicitly stated in Section 1: "the only option." SP in Singapore, client in Lagos, no shared legal system, no shared escrow agent. The problem physically cannot be solved without a trustless arbiter. |
| 12 | C | Demo AND substance must BOTH be strong | Demo: payment bar + automatic slash with no human action. Substance: genuine multi-chain integration using Cairo secp256k1 AA, FEVM event reading, Lit Action oracle bridge. Judges can ask "how does the signature verify?" and get a real answer. |
| 13 | I | Everything is devnet/testnet | Explicitly stated throughout: Starknet Sepolia, Filecoin Calibration, Chronicle Yellowstone. All faucet sources provided. |
| 14 | I | Read ALL research data and CITE it | $0 retrieval revenue stat from Filecoin network data. 1,400+ SP stat from master-research.md. 55%/15% storage/retrieval split cited in overview. |
| 15 | I | Demo must feel like real product | Frontend Dashboard shows live payment bar, SLA timer, Starknet explorer links. Commands are clean CLI, not console.log spam. |
| 16 | I | AI/Agents angle | Not a primary pitch but addressable: "SP agents could negotiate SLA terms and auto-bid on chunks." Mention briefly in demo narration when addressing @eshanchordia and @m0biusgene. |
| 17 | I | Leverage Dami's Cairo expertise | Cairo is the centerpiece: secp256k1 AA in Cairo, storage payment logic in Cairo, slash mechanics in Cairo. No part of the Cairo contract is boilerplate — it's novel primitive work. |
| 18 | I | Optimize for WINNABILITY — demo quality weighted highest (30%) | Demo scene sequence designed for maximum visual impact. Automatic slash is the "wow moment." Pre-recorded backup prepared. Entire Section 6 is detailed scene-by-scene. |
| 19 | I | "Would a judge pull out their phone to record this demo?" | The moment the auto-slash fires — a Starknet explorer showing a transaction that no human triggered — is phone-out-worthy. The payment bar filling chunk by chunk is satisfying. |
| 20 | I | Must survive 3 minutes of hostile Q&A | Q: "Why not just use Chainlink?" A: Chainlink doesn't monitor FEVM PDP events. Q: "Why not use Filecoin Pay?" A: FOC Pay requires SP on Filecoin — our Cairo escrow keeps Starknet depth. Q: "Why secp256k1?" A: Lit PKPs are secp256k1 — only way to get trustless bridge without a third-party oracle. |
| 21 | I | "Why blockchain?" answer OBVIOUS (<10 seconds) | "SP in Singapore, client in Lagos, no shared legal system — you need a trustless arbiter that auto-slashes without a court filing." 8 seconds. |
| 22 | I | Specific person with specific problem TODAY | Chen: $420/month bandwidth, $0 retrieval revenue. Emeka: 30-40% deal loss rate. Named in Problem Statement and Demo Script. |

---

## Phase 5: Frontend (Claude — NOT Codex)

**This phase is handled in a SEPARATE Claude session AFTER Codex builds everything else.**

Codex builds: Cairo contract, PDP client, Lit Action, Relay service, Deal CLI, all tests.

Claude builds (separate session, Days 13-14):
- Next.js 14 app in `slastream/frontend/`
- Components needed:
  - `PaymentBar.tsx` — animated progress bar, fills per chunk, reads Starknet events via `starknet.js` provider
  - `SLATimer.tsx` — countdown timer, turns red at <1h remaining, shows "SLASHED" badge on slash
  - `ProofFeed.tsx` — scrollable list of `PaymentReleased` events with tx links to Starkscan
  - `DealCard.tsx` — deal summary: client, SP, amount locked, chunks remaining
  - `page.tsx` — single page layout composing all components
- Connects to: deployed SLAEscrow contract address + Starknet Sepolia RPC
- Stack: Next.js 14, Tailwind v4, starknet.js v7
- Frontend does NOT need wallet connection for demo (read-only event listening is sufficient)
- Deploy target: Vercel (for submission link)

**Note for Codex:** Do NOT build the frontend. Your output is complete when relay.ts, pdp-client.ts, litAction.js, SLAEscrow.cairo, and the Deal CLI all work end-to-end. Export the contract ABI to `slastream/frontend/src/abi/SLAEscrow.json`.
