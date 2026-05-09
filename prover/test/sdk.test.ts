import { afterEach, describe, expect, it, vi } from "vitest";

import { AnywareClient, BUNDLE_VERSION, NETWORK_PRESETS, RpcResponseShapeError } from "../src/index.js";

const SOURCE_RPC_URL = "https://source.example";
const DESTINATION_RPC_URL = "https://destination.example";
const BEACON_API_URL = "https://beacon.example";

describe("AnywareClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("computes mapping slots via the public SDK surface", () => {
    const client = new AnywareClient({
      ethRpcUrl: SOURCE_RPC_URL,
      beaconApiUrl: BEACON_API_URL,
    });

    expect(client.computeMappingSlot("0x92AAe0857979a139344f5b6F008e71F27A507522")).toBe(
      "0x72b3e5216fb2e942730ef6ca919ec6b688ed45f0e881ff7d07f299fd8e722e18",
    );
  });

  it("resolves tested network presets into concrete endpoints", () => {
    const client = new AnywareClient({
      network: "sepolia-base-sepolia",
    });

    expect(client.config).toEqual(NETWORK_PRESETS["sepolia-base-sepolia"]);
  });

  it("lets explicit endpoint overrides win over preset defaults", () => {
    const client = new AnywareClient({
      network: "sepolia-base-sepolia",
      destinationRpcUrl: DESTINATION_RPC_URL,
    });

    expect(client.config).toMatchObject({
      ethRpcUrl: NETWORK_PRESETS["sepolia-base-sepolia"].ethRpcUrl,
      beaconApiUrl: NETWORK_PRESETS["sepolia-base-sepolia"].beaconApiUrl,
      destinationRpcUrl: DESTINATION_RPC_URL,
    });
  });

  it("exposes a stable bundle version and envelope helper", () => {
    const client = new AnywareClient({
      ethRpcUrl: SOURCE_RPC_URL,
      beaconApiUrl: BEACON_API_URL,
    });

    const envelope = client.toBundleEnvelope({
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
    });

    expect(client.bundleVersion).toBe(BUNDLE_VERSION);
    expect(envelope).toMatchObject({
      bundleVersion: 1,
      bundle: {
        timestamp: "1",
        executionPayloadGIndex: "25",
        executionHeader: {
          blockNumber: "4",
        },
      },
    });
  });

  it("returns a healthy preflight report when endpoints are compatible", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === SOURCE_RPC_URL) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { method: string; params?: unknown[] };
        if (body.method === "eth_blockNumber") {
          return json({ jsonrpc: "2.0", id: 1, result: "0x64" });
        }
        if (body.method === "eth_getBlockByNumber") {
          return json({
            jsonrpc: "2.0",
            id: 1,
            result: {
              number: "0x64",
              hash: "0x" + "11".repeat(32),
              timestamp: "0x65",
            },
          });
        }
      }

      if (url === DESTINATION_RPC_URL) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { method: string };
        if (body.method === "eth_blockNumber") {
          return json({ jsonrpc: "2.0", id: 1, result: "0xc8" });
        }
        if (body.method === "eth_getBlockByNumber") {
          return json({
            jsonrpc: "2.0",
            id: 1,
            result: {
              number: "0xc8",
              hash: "0x" + "22".repeat(32),
              timestamp: "0xc9",
              parentBeaconRoot: "0x" + "33".repeat(32),
            },
          });
        }
      }

      if (url === `${BEACON_API_URL}/eth/v1/beacon/headers/head`) {
        return json({
          data: {
            header: {
              message: {
                slot: "123",
              },
            },
          },
        });
      }

      throw new Error(`Unhandled fetch request: ${url}`);
    }));

    const client = new AnywareClient({
      ethRpcUrl: SOURCE_RPC_URL,
      beaconApiUrl: BEACON_API_URL,
      destinationRpcUrl: DESTINATION_RPC_URL,
    });

    const report = await client.preflight();

    expect(report.overallOk).toBe(true);
    expect(report.source.ok).toBe(true);
    expect(report.beacon.ok).toBe(true);
    expect(report.destination?.ok).toBe(true);
    expect(report.destination?.supportsBeaconRootField).toBe(true);
  });

  it("surfaces parser failures as typed errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === SOURCE_RPC_URL) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { method: string };
        if (body.method === "eth_blockNumber") {
          return json({ jsonrpc: "2.0", id: 1, result: null });
        }
      }

      if (url === `${BEACON_API_URL}/eth/v1/beacon/headers/head`) {
        return json({
          data: {
            header: {
              message: {
                slot: "123",
              },
            },
          },
        });
      }

      throw new Error(`Unhandled fetch request: ${url}`);
    }));

    const client = new AnywareClient({
      ethRpcUrl: SOURCE_RPC_URL,
      beaconApiUrl: BEACON_API_URL,
    });

    const report = await client.preflight();
    expect(report.overallOk).toBe(false);
    expect(report.source.error).toContain("Malformed RPC response");

    await expect(
      new (await import("../src/eth-getProof.js")).EthereumRpcClient(SOURCE_RPC_URL).getBlockNumber(),
    ).rejects.toBeInstanceOf(RpcResponseShapeError);
  });

  it("builds the same vault slot through the opinionated vault-lock flow", async () => {
    const client = new AnywareClient({
      ethRpcUrl: SOURCE_RPC_URL,
      beaconApiUrl: BEACON_API_URL,
    });
    const spy = vi.spyOn(client, "proveStorageSlot").mockResolvedValue({} as never);

    await client.proveVaultLock({
      vault: "0x0Dcc90C54b4c4AC9f8E490678843760006723Bbd",
      borrower: "0x92AAe0857979a139344f5b6F008e71F27A507522",
    });

    expect(spy).toHaveBeenCalledWith({
        account: "0x0Dcc90C54b4c4AC9f8E490678843760006723Bbd",
        slot: "0x72b3e5216fb2e942730ef6ca919ec6b688ed45f0e881ff7d07f299fd8e722e18",
        blockNumber: undefined,
      });
  });
});

function json(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
