import type { BeaconExecutionAnchor, EthGetProofResult, ProofBundle, ProveStorageSlotArgs } from "./types.js";

const EIP4788_PARENT_ROOT_TIMESTAMP_OFFSET = 12n;

export function assembleBundle(
  args: ProveStorageSlotArgs,
  anchor: BeaconExecutionAnchor,
  ethProof: EthGetProofResult,
): ProofBundle {
  return {
    // EIP-4788 exposes the parent beacon root keyed by the child execution timestamp.
    timestamp: anchor.executionHeader.timestamp + EIP4788_PARENT_ROOT_TIMESTAMP_OFFSET,
    slot: anchor.header.slot,
    proposerIndex: anchor.header.proposerIndex,
    parentRoot: anchor.header.parentRoot,
    stateRoot: anchor.header.stateRoot,
    bodyRoot: anchor.header.bodyRoot,
    executionPayloadGIndex: anchor.executionPayloadGIndex,
    executionHeader: anchor.executionHeader,
    executionHeaderProof: anchor.executionHeaderProof,
    account: args.account,
    slotKey: args.slot,
    accountProof: ethProof.accountProof,
    storageProof: ethProof.storageProof,
  };
}
