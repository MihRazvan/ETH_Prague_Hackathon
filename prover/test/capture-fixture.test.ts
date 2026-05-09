import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildContractsFixturePayload, computeVaultSlot, extractExpectedValue, normalizeBundle } from "../src/capture-fixture.js";
import type { ProofBundle } from "../src/types.js";

const currentDir = dirname(fileURLToPath(import.meta.url));

describe("capture-fixture helpers", () => {
  it("extracts the padded storage value from a recorded eth_getProof response", () => {
    const proofRaw = JSON.parse(
      readFileSync(resolve(currentDir, "fixtures/eth_getProof.source.json"), "utf8"),
    ) as { json: unknown };

    expect(extractExpectedValue(proofRaw as never)).toBe(
      "0x0000000000000000000000000000000000000000000000016345785d8a000001",
    );
  });

  it("builds the contracts fixture payload with stringified metadata", () => {
    const payload = buildContractsFixturePayload({
      bundle: { timestamp: "1", slot: "2" },
      expectedValue: "0x00000000000000000000000000000000000000000000000000000000000000ff",
      sourceBlockNumber: 42n,
      sourceAccount: "0x0000000000000000000000000000000000000123",
      sourceSlot: "0x01",
      borrower: "0x0000000000000000000000000000000000000456",
      destinationBlockNumber: 99n,
      destinationTimestamp: 1234n,
    });

    expect(payload).toEqual({
      bundle: { timestamp: "1", slot: "2" },
      expected: {
        verifiedValue: "0x00000000000000000000000000000000000000000000000000000000000000ff",
        sourceBlockNumber: "42",
        sourceAccount: "0x0000000000000000000000000000000000000123",
        sourceSlot: "0x01",
      },
      metadata: {
        borrower: "0x0000000000000000000000000000000000000456",
        destinationBlockNumber: "99",
        destinationTimestamp: "1234",
      },
    });
  });

  it("computes the same vault slot as the recorded borrower fixture", () => {
    expect(computeVaultSlot("0x92AAe0857979a139344f5b6F008e71F27A507522")).toBe(
      "0x72b3e5216fb2e942730ef6ca919ec6b688ed45f0e881ff7d07f299fd8e722e18",
    );
  });

  it("normalizes a proof bundle into JSON-safe strings", () => {
    const bundle: ProofBundle = {
      timestamp: 1n,
      slot: 2n,
      proposerIndex: 3n,
      parentRoot: "0x11",
      stateRoot: "0x22",
      bodyRoot: "0x33",
      executionPayloadGIndex: 25n,
      executionHeader: {
        parentHash: "0x44",
        feeRecipient: "0x0000000000000000000000000000000000000456",
        stateRoot: "0x55",
        receiptsRoot: "0x66",
        logsBloom: `0x${"00".repeat(256)}`,
        prevRandao: "0x77",
        blockNumber: 4n,
        gasLimit: 5n,
        gasUsed: 6n,
        timestamp: 7n,
        extraData: "0x",
        baseFeePerGas: 8n,
        blockHash: "0x88",
        transactionsRoot: "0x99",
        withdrawalsRoot: "0xaa",
        blobGasUsed: 0n,
        excessBlobGas: 0n,
      },
      executionHeaderProof: ["0xbb"],
      account: "0x0000000000000000000000000000000000000123",
      slotKey: "0xcc",
      accountProof: ["0xdd"],
      storageProof: ["0xee"],
    };

    expect(normalizeBundle(bundle)).toMatchObject({
      timestamp: "1",
      slot: "2",
      proposerIndex: "3",
      executionPayloadGIndex: "25",
      executionHeader: {
        blockNumber: "4",
        timestamp: "7",
        baseFeePerGas: "8",
      },
    });
  });
});
