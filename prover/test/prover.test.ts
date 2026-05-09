import { describe, expect, it } from "vitest";

import { assembleBundle } from "../src/bundle.js";

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
    expect(bundle.timestamp).toBe(50n);
  });
});
