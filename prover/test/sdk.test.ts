import { afterEach, describe, expect, it, vi } from "vitest";

import { ElsewareClient, RpcResponseShapeError } from "../src/index.js";

const SOURCE_RPC_URL = "https://source.example";
const DESTINATION_RPC_URL = "https://destination.example";
const BEACON_API_URL = "https://beacon.example";

describe("ElsewareClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("computes mapping slots via the public SDK surface", () => {
    const client = new ElsewareClient({
      ethRpcUrl: SOURCE_RPC_URL,
      beaconApiUrl: BEACON_API_URL,
    });

    expect(client.computeMappingSlot("0x92AAe0857979a139344f5b6F008e71F27A507522")).toBe(
      "0x72b3e5216fb2e942730ef6ca919ec6b688ed45f0e881ff7d07f299fd8e722e18",
    );
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

    const client = new ElsewareClient({
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

    const client = new ElsewareClient({
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
});

function json(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
