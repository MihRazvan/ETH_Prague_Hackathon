import { baseSepolia, sepolia } from "viem/chains";

export const DEMO_LOCK_AMOUNT_ETH = "0.01";
export const MAX_PROOF_AGE_SECONDS = 3600n;

export interface DemoExecutionPayloadHeader {
  parentHash: `0x${string}`;
  feeRecipient: `0x${string}`;
  stateRoot: `0x${string}`;
  receiptsRoot: `0x${string}`;
  logsBloom: `0x${string}`;
  prevRandao: `0x${string}`;
  blockNumber: bigint;
  gasLimit: bigint;
  gasUsed: bigint;
  timestamp: bigint;
  extraData: `0x${string}`;
  baseFeePerGas: bigint;
  blockHash: `0x${string}`;
  transactionsRoot: `0x${string}`;
  withdrawalsRoot: `0x${string}`;
  blobGasUsed: bigint;
  excessBlobGas: bigint;
}

export interface DemoProofBundle {
  timestamp: bigint;
  slot: bigint;
  proposerIndex: bigint;
  parentRoot: `0x${string}`;
  stateRoot: `0x${string}`;
  bodyRoot: `0x${string}`;
  executionPayloadGIndex: bigint;
  executionHeader: DemoExecutionPayloadHeader;
  executionHeaderProof: `0x${string}`[];
  account: `0x${string}`;
  slotKey: `0x${string}`;
  accountProof: `0x${string}`[];
  storageProof: `0x${string}`[];
}

export interface SerializedDemoExecutionPayloadHeader {
  parentHash: `0x${string}`;
  feeRecipient: `0x${string}`;
  stateRoot: `0x${string}`;
  receiptsRoot: `0x${string}`;
  logsBloom: `0x${string}`;
  prevRandao: `0x${string}`;
  blockNumber: string;
  gasLimit: string;
  gasUsed: string;
  timestamp: string;
  extraData: `0x${string}`;
  baseFeePerGas: string;
  blockHash: `0x${string}`;
  transactionsRoot: `0x${string}`;
  withdrawalsRoot: `0x${string}`;
  blobGasUsed: string;
  excessBlobGas: string;
}

export interface SerializedDemoProofBundle {
  timestamp: string;
  slot: string;
  proposerIndex: string;
  parentRoot: `0x${string}`;
  stateRoot: `0x${string}`;
  bodyRoot: `0x${string}`;
  executionPayloadGIndex: string;
  executionHeader: SerializedDemoExecutionPayloadHeader;
  executionHeaderProof: `0x${string}`[];
  account: `0x${string}`;
  slotKey: `0x${string}`;
  accountProof: `0x${string}`[];
  storageProof: `0x${string}`[];
}

export const vaultAbi = [
  {
    type: "function",
    name: "locks",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "lock",
    stateMutability: "payable",
    inputs: [],
    outputs: [
      { name: "slotKey", type: "bytes32" },
      { name: "encodedValue", type: "uint256" },
    ],
  },
] as const;

export const verifierAbi = [
  {
    type: "function",
    name: "verifyStorageSlot",
    stateMutability: "view",
    inputs: [
      {
        name: "proof",
        type: "tuple",
        components: [
          { name: "timestamp", type: "uint64" },
          { name: "slot", type: "uint64" },
          { name: "proposerIndex", type: "uint64" },
          { name: "parentRoot", type: "bytes32" },
          { name: "stateRoot", type: "bytes32" },
          { name: "bodyRoot", type: "bytes32" },
          { name: "executionPayloadGIndex", type: "uint256" },
          {
            name: "executionHeader",
            type: "tuple",
            components: [
              { name: "parentHash", type: "bytes32" },
              { name: "feeRecipient", type: "address" },
              { name: "stateRoot", type: "bytes32" },
              { name: "receiptsRoot", type: "bytes32" },
              { name: "logsBloom", type: "bytes" },
              { name: "prevRandao", type: "bytes32" },
              { name: "blockNumber", type: "uint64" },
              { name: "gasLimit", type: "uint64" },
              { name: "gasUsed", type: "uint64" },
              { name: "timestamp", type: "uint64" },
              { name: "extraData", type: "bytes" },
              { name: "baseFeePerGas", type: "uint256" },
              { name: "blockHash", type: "bytes32" },
              { name: "transactionsRoot", type: "bytes32" },
              { name: "withdrawalsRoot", type: "bytes32" },
              { name: "blobGasUsed", type: "uint64" },
              { name: "excessBlobGas", type: "uint64" },
            ],
          },
          { name: "executionHeaderProof", type: "bytes32[]" },
          { name: "account", type: "address" },
          { name: "slotKey", type: "bytes32" },
          { name: "accountProof", type: "bytes[]" },
          { name: "storageProof", type: "bytes[]" },
        ],
      },
      { name: "maxAge", type: "uint256" },
    ],
    outputs: [
      { name: "verifiedValue", type: "bytes32" },
      { name: "sourceBlockNumber", type: "uint64" },
      { name: "sourceAccount", type: "address" },
      { name: "sourceSlot", type: "bytes32" },
    ],
  },
] as const;

export interface DemoConfig {
  ethRpcUrl: string;
  baseRpcUrl: string;
  vaultAddress: `0x${string}`;
  verifierAddress: `0x${string}`;
  lockAmountEth: string;
  maxProofAgeSeconds: string;
}

export interface DemoProofResponse {
  ok: true;
  blockNumber: string;
  lockSlot: `0x${string}`;
  proofLatencyMs: number;
  proofBundleSizeBytes: number;
  bundle: SerializedDemoProofBundle;
}

export interface DemoErrorResponse {
  ok: false;
  error: string;
}

export interface VerificationSummary {
  encodedValue: bigint;
  sourceBlockNumber: bigint;
  sourceAccount: `0x${string}`;
  sourceSlot: `0x${string}`;
  amountWei: bigint;
  status: number;
}

export function deserializeBundle(bundle: SerializedDemoProofBundle): DemoProofBundle {
  return {
    ...bundle,
    timestamp: BigInt(bundle.timestamp),
    slot: BigInt(bundle.slot),
    proposerIndex: BigInt(bundle.proposerIndex),
    executionPayloadGIndex: BigInt(bundle.executionPayloadGIndex),
    executionHeader: {
      ...bundle.executionHeader,
      blockNumber: BigInt(bundle.executionHeader.blockNumber),
      gasLimit: BigInt(bundle.executionHeader.gasLimit),
      gasUsed: BigInt(bundle.executionHeader.gasUsed),
      timestamp: BigInt(bundle.executionHeader.timestamp),
      baseFeePerGas: BigInt(bundle.executionHeader.baseFeePerGas),
      blobGasUsed: BigInt(bundle.executionHeader.blobGasUsed),
      excessBlobGas: BigInt(bundle.executionHeader.excessBlobGas),
    },
  };
}

export function decodeLockValue(encodedValue: bigint): { amountWei: bigint; status: number } {
  return {
    amountWei: encodedValue >> 8n,
    status: Number(encodedValue & 0xffn),
  };
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function chainName(chainId?: number | null): string {
  if (chainId === sepolia.id) return "Ethereum Sepolia";
  if (chainId === baseSepolia.id) return "Base Sepolia";
  return "Unknown network";
}
