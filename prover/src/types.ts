export interface ExecutionPayloadHeader {
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

export interface ProofBundle {
  timestamp: bigint;
  slot: bigint;
  proposerIndex: bigint;
  parentRoot: `0x${string}`;
  stateRoot: `0x${string}`;
  bodyRoot: `0x${string}`;
  executionPayloadGIndex: bigint;
  executionHeader: ExecutionPayloadHeader;
  executionHeaderProof: `0x${string}`[];
  account: `0x${string}`;
  slotKey: `0x${string}`;
  accountProof: `0x${string}`[];
  storageProof: `0x${string}`[];
}

export interface ProverConfig {
  ethRpcUrl: string;
  beaconApiUrl: string;
  destinationRpcUrl?: string;
  searchWindowSlots?: number;
  destinationSearchWindowBlocks?: number;
  beaconVersion?: "deneb" | "electra" | "fulu";
}

export interface ProveStorageSlotArgs {
  account: `0x${string}`;
  slot: `0x${string}`;
  blockNumber?: bigint;
}

export interface ProveMappingValueArgs {
  account: `0x${string}`;
  keyAddress: `0x${string}`;
  mappingSlot?: bigint;
  blockNumber?: bigint;
}

export interface ProveVaultLockArgs {
  vault: `0x${string}`;
  borrower: `0x${string}`;
  mappingSlot?: bigint;
  blockNumber?: bigint;
}

export interface PreflightReport {
  source: {
    ok: boolean;
    latestBlockNumber?: bigint;
    latestBlockHash?: `0x${string}`;
    latestBlockTimestamp?: bigint;
    error?: string;
  };
  beacon: {
    ok: boolean;
    headSlot?: bigint;
    error?: string;
  };
  destination?: {
    ok: boolean;
    latestBlockNumber?: bigint;
    latestBlockHash?: `0x${string}`;
    latestBlockTimestamp?: bigint;
    supportsBeaconRootField?: boolean;
    error?: string;
  };
  overallOk: boolean;
}

export interface BeaconHeader {
  root: `0x${string}`;
  slot: bigint;
  proposerIndex: bigint;
  parentRoot: `0x${string}`;
  stateRoot: `0x${string}`;
  bodyRoot: `0x${string}`;
}

export interface BeaconExecutionAnchor {
  header: BeaconHeader;
  executionHeader: ExecutionPayloadHeader;
  executionPayloadGIndex: bigint;
  executionHeaderProof: `0x${string}`[];
  destinationTimestamp?: bigint;
}

export interface EthGetProofResult {
  accountProof: `0x${string}`[];
  storageProof: `0x${string}`[];
}
