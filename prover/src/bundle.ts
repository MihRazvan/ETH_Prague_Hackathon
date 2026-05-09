import type { BeaconExecutionAnchor, EthGetProofResult, ProofBundle, ProveStorageSlotArgs } from "./types.js";

export function assembleBundle(
  args: ProveStorageSlotArgs,
  anchor: BeaconExecutionAnchor,
  ethProof: EthGetProofResult,
): ProofBundle {
  return {
    timestamp: anchor.executionHeader.timestamp,
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
