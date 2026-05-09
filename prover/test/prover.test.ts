import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assembleBundle } from "../src/bundle.js";
import type { BeaconExecutionAnchor, EthGetProofResult, ProofBundle, ProveStorageSlotArgs } from "../src/types.js";

interface FixtureJson {
  bundle: {
    timestamp: string;
    slot: string;
    proposerIndex: string;
    parentRoot: `0x${string}`;
    stateRoot: `0x${string}`;
    bodyRoot: `0x${string}`;
    executionPayloadGIndex: string;
    executionHeader: Record<string, string>;
    executionHeaderProof: `0x${string}`[];
    account: `0x${string}`;
    slotKey: `0x${string}`;
    accountProof: `0x${string}`[];
    storageProof: `0x${string}`[];
  };
}

describe("assembleBundle", () => {
  it("maps anchor and proof inputs into the contract bundle shape", () => {
    const bundle = assembleBundle(
      {
        account: "0x0000000000000000000000000000000000000123",
        slot: "0x01",
      },
      {
        header: {
          root: "0x11",
          slot: 10n,
          proposerIndex: 2n,
          parentRoot: "0x22",
          stateRoot: "0x33",
          bodyRoot: "0x44",
        },
        executionHeader: {
          parentHash: "0x55",
          feeRecipient: "0x0000000000000000000000000000000000000456",
          stateRoot: "0x66",
          receiptsRoot: "0x77",
          logsBloom: `0x${"00".repeat(256)}`,
          prevRandao: "0x88",
          blockNumber: 99n,
          gasLimit: 100n,
          gasUsed: 80n,
          timestamp: 50n,
          extraData: "0x",
          baseFeePerGas: 1n,
          blockHash: "0x99",
          transactionsRoot: "0xaa",
          withdrawalsRoot: "0xbb",
          blobGasUsed: 0n,
          excessBlobGas: 0n,
        },
        executionPayloadGIndex: 25n,
        executionHeaderProof: ["0xcc"],
      },
      {
        accountProof: ["0xdd"],
        storageProof: ["0xee"],
      },
    );

    expect(bundle.executionPayloadGIndex).toBe(25n);
    expect(bundle.accountProof).toEqual(["0xdd"]);
    expect(bundle.storageProof).toEqual(["0xee"]);
    expect(bundle.timestamp).toBe(62n);
  });

  it("reconstructs the captured live fixture bundle from anchor and trie proofs", () => {
    const fixture = loadFixture();

    const args: ProveStorageSlotArgs = {
      account: fixture.account,
      slot: fixture.slotKey,
      blockNumber: fixture.executionHeader.blockNumber,
    };
    const anchor: BeaconExecutionAnchor = {
      header: {
        root: "0x0",
        slot: fixture.slot,
        proposerIndex: fixture.proposerIndex,
        parentRoot: fixture.parentRoot,
        stateRoot: fixture.stateRoot,
        bodyRoot: fixture.bodyRoot,
      },
      executionHeader: fixture.executionHeader,
      executionPayloadGIndex: fixture.executionPayloadGIndex,
      executionHeaderProof: fixture.executionHeaderProof,
    };
    const ethProof: EthGetProofResult = {
      accountProof: fixture.accountProof,
      storageProof: fixture.storageProof,
    };

    const bundle = assembleBundle(args, anchor, ethProof);
    expect(bundle).toEqual(fixture);
    expect(bundle.timestamp).toBe(bundle.executionHeader.timestamp + 12n);
  });

  it("prefers an explicit destination timestamp when one is provided", () => {
    const fixture = loadFixture();

    const args: ProveStorageSlotArgs = {
      account: fixture.account,
      slot: fixture.slotKey,
      blockNumber: fixture.executionHeader.blockNumber,
    };
    const anchor: BeaconExecutionAnchor = {
      header: {
        root: "0x0",
        slot: fixture.slot,
        proposerIndex: fixture.proposerIndex,
        parentRoot: fixture.parentRoot,
        stateRoot: fixture.stateRoot,
        bodyRoot: fixture.bodyRoot,
      },
      executionHeader: fixture.executionHeader,
      executionPayloadGIndex: fixture.executionPayloadGIndex,
      executionHeaderProof: fixture.executionHeaderProof,
      destinationTimestamp: 999n,
    };
    const ethProof: EthGetProofResult = {
      accountProof: fixture.accountProof,
      storageProof: fixture.storageProof,
    };

    const bundle = assembleBundle(args, anchor, ethProof);
    expect(bundle.timestamp).toBe(999n);
  });
});

function loadFixture(): ProofBundle {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const raw = readFileSync(
    resolve(currentDir, "../../contracts/test/fixtures/liveProofFixture.json"),
    "utf8",
  );
  const fixture = JSON.parse(raw) as FixtureJson;

  return {
    timestamp: BigInt(fixture.bundle.timestamp),
    slot: BigInt(fixture.bundle.slot),
    proposerIndex: BigInt(fixture.bundle.proposerIndex),
    parentRoot: fixture.bundle.parentRoot,
    stateRoot: fixture.bundle.stateRoot,
    bodyRoot: fixture.bundle.bodyRoot,
    executionPayloadGIndex: BigInt(fixture.bundle.executionPayloadGIndex),
    executionHeader: {
      parentHash: fixture.bundle.executionHeader.parentHash as `0x${string}`,
      feeRecipient: fixture.bundle.executionHeader.feeRecipient as `0x${string}`,
      stateRoot: fixture.bundle.executionHeader.stateRoot as `0x${string}`,
      receiptsRoot: fixture.bundle.executionHeader.receiptsRoot as `0x${string}`,
      logsBloom: fixture.bundle.executionHeader.logsBloom as `0x${string}`,
      prevRandao: fixture.bundle.executionHeader.prevRandao as `0x${string}`,
      blockNumber: BigInt(fixture.bundle.executionHeader.blockNumber),
      gasLimit: BigInt(fixture.bundle.executionHeader.gasLimit),
      gasUsed: BigInt(fixture.bundle.executionHeader.gasUsed),
      timestamp: BigInt(fixture.bundle.executionHeader.timestamp),
      extraData: fixture.bundle.executionHeader.extraData as `0x${string}`,
      baseFeePerGas: BigInt(fixture.bundle.executionHeader.baseFeePerGas),
      blockHash: fixture.bundle.executionHeader.blockHash as `0x${string}`,
      transactionsRoot: fixture.bundle.executionHeader.transactionsRoot as `0x${string}`,
      withdrawalsRoot: fixture.bundle.executionHeader.withdrawalsRoot as `0x${string}`,
      blobGasUsed: BigInt(fixture.bundle.executionHeader.blobGasUsed),
      excessBlobGas: BigInt(fixture.bundle.executionHeader.excessBlobGas),
    },
    executionHeaderProof: fixture.bundle.executionHeaderProof,
    account: fixture.bundle.account,
    slotKey: fixture.bundle.slotKey,
    accountProof: fixture.bundle.accountProof,
    storageProof: fixture.bundle.storageProof,
  };
}
