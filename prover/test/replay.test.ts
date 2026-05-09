import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { BeaconApiClient } from "../src/beacon-fetch.js";
import { EthereumRpcClient } from "../src/eth-getProof.js";
import { Prover } from "../src/index.js";
import type { ProofBundle } from "../src/types.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const sourceBlockFixture = readJson("fixtures/eth_getBlockByNumber.source.json") as RpcFixture;
const sourceBlockMalformedFixture = readJson("fixtures/eth_getBlockByNumber.malformed.json") as RpcFixture;
const ethGetProofFixture = readJson("fixtures/eth_getProof.source.json") as RpcFixture;
const ethGetProofMalformedFixture = readJson("fixtures/eth_getProof.malformed.json") as RpcFixture;
const ethBlockNumberMalformedFixture = readJson("fixtures/eth_blockNumber.malformed.json") as RpcFixture;
const beaconHeadFixture = readJson("fixtures/beacon_headers_head.json") as RestFixture;
const beaconHeadMalformedFixture = readJson("fixtures/beacon_head_malformed.json") as RestFixture;
const beaconHeaderFixture = readJson("fixtures/beacon_header_10218922.json") as RestFixture;
const beaconHeaderMalformedFixture = readJson("fixtures/beacon_header_malformed.json") as RestFixture;
const blindedBlockFixture = readJson("fixtures/beacon_blinded_block_10218922.json") as RestFixture;
const blindedBlock404Fixture = readJson("fixtures/beacon_blinded_block_404.json") as RestFixture;
const blindedBlockMalformedFixture = readJson("fixtures/beacon_blinded_block_malformed.json") as RestFixture;
const baseHeaderMalformedFixture = readJson("fixtures/base_header_malformed.json") as RpcFixture;
const destinationHeadersFixture = readJson("fixtures/base_headers_search_window.json") as DestinationHeaderFixture[];
const destinationHeadersNoMatchFixture = readJson("fixtures/base_headers_no_match.json") as DestinationHeaderFixture[];
const liveBundleFixture = readLiveBundleFixture();
const ethGetProofErrorFixture = readJson("fixtures/eth_getProof.error.json") as RpcFixture;

const SOURCE_RPC_URL = "https://source.example";
const DESTINATION_RPC_URL = "https://destination.example";
const BEACON_API_URL = "https://beacon.example";
const TARGET_BEACON_ROOT = beaconHeaderFixture.json.data.root as `0x${string}`;
const TARGET_EXECUTION_TIMESTAMP = BigInt(liveBundleFixture.bundle.executionHeader.timestamp);
const DESTINATION_TIMESTAMP = BigInt(liveBundleFixture.metadata.destinationTimestamp);
const DESTINATION_BLOCK_NUMBER = BigInt(liveBundleFixture.metadata.destinationBlockNumber);

describe("record/replay integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses recorded source RPC responses", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
      routeFetch(String(input), init),
    );
    vi.stubGlobal("fetch", fetchMock);

    const rpc = new EthereumRpcClient(SOURCE_RPC_URL);
    const block = await rpc.getBlockByNumber(BigInt(liveBundleFixture.expected.sourceBlockNumber));
    const proof = await rpc.getProof(liveBundleFixture.bundle.account, liveBundleFixture.bundle.slotKey, BigInt(liveBundleFixture.expected.sourceBlockNumber));

    expect(block.hash).toBe(liveBundleFixture.bundle.executionHeader.blockHash);
    expect(block.timestamp).toBe(BigInt(liveBundleFixture.bundle.executionHeader.timestamp));
    expect(proof.accountProof).toEqual(liveBundleFixture.bundle.accountProof);
    expect(proof.storageProof).toEqual(liveBundleFixture.bundle.storageProof);
  });

  it("replays beacon discovery from recorded API payloads", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
      routeFetch(String(input), init),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new BeaconApiClient({
      ethRpcUrl: SOURCE_RPC_URL,
      beaconApiUrl: BEACON_API_URL,
      searchWindowSlots: 512,
    });

    const anchor = await client.findExecutionAnchor(liveBundleFixture.bundle.executionHeader.blockHash);

    expect(anchor.header.root).toBe(TARGET_BEACON_ROOT);
    expect(anchor.header.slot).toBe(BigInt(liveBundleFixture.bundle.slot));
    expect(anchor.executionPayloadGIndex).toBe(BigInt(liveBundleFixture.bundle.executionPayloadGIndex));
    expect(anchor.executionHeader.blockHash).toBe(liveBundleFixture.bundle.executionHeader.blockHash);
    expect(anchor.executionHeaderProof).toEqual(liveBundleFixture.bundle.executionHeaderProof);
  });

  it("replays the prover against recorded source/beacon data and destination header fixtures", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
      routeFetch(String(input), init),
    );
    vi.stubGlobal("fetch", fetchMock);

    const prover = new Prover({
      ethRpcUrl: SOURCE_RPC_URL,
      beaconApiUrl: BEACON_API_URL,
      destinationRpcUrl: DESTINATION_RPC_URL,
      searchWindowSlots: 512,
      destinationSearchWindowBlocks: 64,
    });

    const bundle = await prover.proveStorageSlot({
      account: liveBundleFixture.bundle.account,
      slot: liveBundleFixture.bundle.slotKey,
      blockNumber: BigInt(liveBundleFixture.expected.sourceBlockNumber),
    });

    expect(bundle.account).toBe(liveBundleFixture.bundle.account);
    expect(bundle.slotKey).toBe(liveBundleFixture.bundle.slotKey);
    expect(bundle.executionHeader.blockHash).toBe(liveBundleFixture.bundle.executionHeader.blockHash);
    expect(bundle.executionHeaderProof).toEqual(liveBundleFixture.bundle.executionHeaderProof);
    expect(bundle.accountProof).toEqual(liveBundleFixture.bundle.accountProof);
    expect(bundle.storageProof).toEqual(liveBundleFixture.bundle.storageProof);
    expect(bundle.timestamp).toBe(DESTINATION_TIMESTAMP);
  });

  it("retries transient 500s on the source RPC", async () => {
    let attempts = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === SOURCE_RPC_URL) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { method: string };
        if (body.method === "eth_getBlockByNumber" && attempts++ === 0) {
          return jsonResponse({ error: "temporary" }, 500);
        }
      }

      return routeFetch(url, init);
    });

    vi.stubGlobal("fetch", fetchMock);
    const rpc = new EthereumRpcClient(SOURCE_RPC_URL);
    const block = await rpc.getBlockByNumber(BigInt(liveBundleFixture.expected.sourceBlockNumber));

    expect(block.hash).toBe(liveBundleFixture.bundle.executionHeader.blockHash);
    expect(attempts).toBe(2);
  });

  it("surfaces JSON-RPC errors from eth_getProof", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === SOURCE_RPC_URL) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { method: string };
        if (body.method === "eth_getProof") {
          return jsonResponse(ethGetProofErrorFixture.json, ethGetProofErrorFixture.status);
        }
      }

      return routeFetch(url, init);
    });

    vi.stubGlobal("fetch", fetchMock);
    const rpc = new EthereumRpcClient(SOURCE_RPC_URL);

    await expect(
      rpc.getProof(
        liveBundleFixture.bundle.account,
        liveBundleFixture.bundle.slotKey,
        BigInt(liveBundleFixture.expected.sourceBlockNumber),
      ),
    ).rejects.toThrow("header not found");
  });

  it("fails cleanly when the source block response is malformed", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === SOURCE_RPC_URL) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { method: string };
        if (body.method === "eth_getBlockByNumber") {
          return jsonResponse(sourceBlockMalformedFixture.json, sourceBlockMalformedFixture.status);
        }
      }

      return routeFetch(url, init);
    });

    vi.stubGlobal("fetch", fetchMock);
    const rpc = new EthereumRpcClient(SOURCE_RPC_URL);

    await expect(rpc.getBlockByNumber(BigInt(liveBundleFixture.expected.sourceBlockNumber))).rejects.toThrow(
      "Malformed RPC response: expected block.timestamp to be a string",
    );
  });

  it("fails cleanly when the latest block number response is malformed", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === DESTINATION_RPC_URL) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { method: string };
        if (body.method === "eth_blockNumber") {
          return jsonResponse(ethBlockNumberMalformedFixture.json, ethBlockNumberMalformedFixture.status);
        }
      }

      return routeFetch(url, init);
    });

    vi.stubGlobal("fetch", fetchMock);
    const rpc = new EthereumRpcClient(DESTINATION_RPC_URL);

    await expect(rpc.getBlockNumber()).rejects.toThrow(
      "Malformed RPC response: expected blockNumber to be a string",
    );
  });

  it("fails cleanly when the eth_getProof response is malformed", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === SOURCE_RPC_URL) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { method: string };
        if (body.method === "eth_getProof") {
          return jsonResponse(ethGetProofMalformedFixture.json, ethGetProofMalformedFixture.status);
        }
      }

      return routeFetch(url, init);
    });

    vi.stubGlobal("fetch", fetchMock);
    const rpc = new EthereumRpcClient(SOURCE_RPC_URL);

    await expect(
      rpc.getProof(
        liveBundleFixture.bundle.account,
        liveBundleFixture.bundle.slotKey,
        BigInt(liveBundleFixture.expected.sourceBlockNumber),
      ),
    ).rejects.toThrow("Malformed eth_getProof response: eth_getProof.storageProof must contain at least one entry");
  });

  it("fails cleanly when the beacon API cannot find a matching execution block", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith(BEACON_API_URL)) {
        const path = url.slice(BEACON_API_URL.length);
        if (path === "/eth/v1/beacon/headers/head") {
          return jsonResponse(beaconHeadFixture.json, beaconHeadFixture.status);
        }
        if (path.startsWith("/eth/v1/beacon/blinded_blocks/")) {
          return jsonResponse(blindedBlock404Fixture.json, blindedBlock404Fixture.status);
        }
      }

      throw new Error(`Unhandled fetch request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const client = new BeaconApiClient({
      ethRpcUrl: SOURCE_RPC_URL,
      beaconApiUrl: BEACON_API_URL,
      searchWindowSlots: 4,
    });

    await expect(client.findExecutionAnchor(liveBundleFixture.bundle.executionHeader.blockHash)).rejects.toThrow(
      "Could not find beacon block",
    );
  });

  it("fails cleanly when the beacon head payload is malformed", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === `${BEACON_API_URL}/eth/v1/beacon/headers/head`) {
        return jsonResponse(beaconHeadMalformedFixture.json, beaconHeadMalformedFixture.status);
      }

      return routeFetch(url);
    });

    vi.stubGlobal("fetch", fetchMock);
    const client = new BeaconApiClient({
      ethRpcUrl: SOURCE_RPC_URL,
      beaconApiUrl: BEACON_API_URL,
      searchWindowSlots: 1,
    });

    await expect(client.findExecutionAnchor(liveBundleFixture.bundle.executionHeader.blockHash)).rejects.toThrow(
      "Malformed beacon API response: expected beacon head response.data.header.message.slot to be a string",
    );
  });

  it("fails cleanly when the blinded beacon block payload is malformed", async () => {
    const singleSlotHeadFixture = withBeaconHeadSlot("10218922");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith(BEACON_API_URL)) {
        const path = url.slice(BEACON_API_URL.length);
        if (path === "/eth/v1/beacon/headers/head") {
          return jsonResponse(singleSlotHeadFixture.json, singleSlotHeadFixture.status);
        }
        if (path === "/eth/v1/beacon/blinded_blocks/10218922") {
          return jsonResponse(blindedBlockMalformedFixture.json, blindedBlockMalformedFixture.status);
        }
      }

      return routeFetch(url, init);
    });

    vi.stubGlobal("fetch", fetchMock);
    const client = new BeaconApiClient({
      ethRpcUrl: SOURCE_RPC_URL,
      beaconApiUrl: BEACON_API_URL,
      searchWindowSlots: 1,
    });

    await expect(client.findExecutionAnchor(liveBundleFixture.bundle.executionHeader.blockHash)).rejects.toThrow(
      "Malformed beacon API response: expected blinded block execution_payload_header.parent_hash to be a hex string",
    );
  });

  it("fails cleanly when the beacon header payload is malformed", async () => {
    const singleSlotHeadFixture = withBeaconHeadSlot("10218922");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith(BEACON_API_URL)) {
        const path = url.slice(BEACON_API_URL.length);
        if (path === "/eth/v1/beacon/headers/head") {
          return jsonResponse(singleSlotHeadFixture.json, singleSlotHeadFixture.status);
        }
        if (path === "/eth/v1/beacon/blinded_blocks/10218922") {
          return jsonResponse(blindedBlockFixture.json, blindedBlockFixture.status);
        }
        if (path === "/eth/v1/beacon/headers/10218922") {
          return jsonResponse(beaconHeaderMalformedFixture.json, beaconHeaderMalformedFixture.status);
        }
      }

      return routeFetch(url, init);
    });

    vi.stubGlobal("fetch", fetchMock);
    const client = new BeaconApiClient({
      ethRpcUrl: SOURCE_RPC_URL,
      beaconApiUrl: BEACON_API_URL,
      searchWindowSlots: 1,
    });

    await expect(client.findExecutionAnchor(liveBundleFixture.bundle.executionHeader.blockHash)).rejects.toThrow(
      "Malformed beacon API response: expected beacon header response.data.header.message.body_root to be a hex string",
    );
  });

  it("fails when the destination window never exposes the target beacon root", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === DESTINATION_RPC_URL) {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          method: string;
          params: unknown[];
        };

        if (body.method === "eth_blockNumber") {
          return jsonResponse({ jsonrpc: "2.0", id: 1, result: toHex(DESTINATION_BLOCK_NUMBER) }, 200);
        }
        if (body.method === "eth_getBlockByNumber") {
          const blockTag = body.params[0] as `0x${string}`;
          const blockNumber = BigInt(blockTag);
          const recorded = destinationHeadersNoMatchFixture.find((entry) => BigInt(entry.number) === blockNumber);
          return jsonResponse(
            {
              jsonrpc: "2.0",
              id: 1,
              result: {
                number: toHex(blockNumber),
                hash: recorded?.hash ?? `0x${blockNumber.toString(16).padStart(64, "0")}`,
                timestamp: recorded ? toHex(BigInt(recorded.timestamp)) : toHex(syntheticDestinationTimestamp(blockNumber)),
                parentBeaconRoot: recorded?.parentBeaconRoot ?? null,
              },
            },
            200,
          );
        }
      }

      throw new Error(`Unhandled fetch request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const client = new BeaconApiClient({
      ethRpcUrl: SOURCE_RPC_URL,
      beaconApiUrl: BEACON_API_URL,
      destinationRpcUrl: DESTINATION_RPC_URL,
      destinationSearchWindowBlocks: 8,
    });
    const destinationRpc = new EthereumRpcClient(DESTINATION_RPC_URL);

    await expect(
      client.findDestinationTimestamp(
        destinationRpc,
        TARGET_BEACON_ROOT,
        TARGET_EXECUTION_TIMESTAMP,
      ),
    ).rejects.toThrow("Could not find destination-chain timestamp");
  });

  it("fails cleanly when a destination header payload is malformed", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === DESTINATION_RPC_URL) {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          method: string;
        };

        if (body.method === "eth_blockNumber") {
          return jsonResponse({ jsonrpc: "2.0", id: 1, result: toHex(DESTINATION_BLOCK_NUMBER) }, 200);
        }
        if (body.method === "eth_getBlockByNumber") {
          return jsonResponse(baseHeaderMalformedFixture.json, baseHeaderMalformedFixture.status);
        }
      }

      throw new Error(`Unhandled fetch request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const client = new BeaconApiClient({
      ethRpcUrl: SOURCE_RPC_URL,
      beaconApiUrl: BEACON_API_URL,
      destinationRpcUrl: DESTINATION_RPC_URL,
      destinationSearchWindowBlocks: 8,
    });
    const destinationRpc = new EthereumRpcClient(DESTINATION_RPC_URL);

    await expect(
      client.findDestinationTimestamp(
        destinationRpc,
        TARGET_BEACON_ROOT,
        TARGET_EXECUTION_TIMESTAMP,
      ),
    ).rejects.toThrow("Malformed RPC response: expected block.timestamp to be a string");
  });
});

function routeFetch(url: string, init?: RequestInit): Promise<Response> {
  if (url.startsWith(BEACON_API_URL)) {
    const path = url.slice(BEACON_API_URL.length);
    if (path === "/eth/v1/beacon/headers/head") {
      return Promise.resolve(jsonResponse(beaconHeadFixture.json, beaconHeadFixture.status));
    }
    if (path === "/eth/v1/beacon/blinded_blocks/10218922") {
      return Promise.resolve(jsonResponse(blindedBlockFixture.json, blindedBlockFixture.status));
    }
    if (path.startsWith("/eth/v1/beacon/blinded_blocks/")) {
      return Promise.resolve(jsonResponse({ code: 404, message: "not found" }, 404));
    }
    if (path === "/eth/v1/beacon/headers/10218922") {
      return Promise.resolve(jsonResponse(beaconHeaderFixture.json, beaconHeaderFixture.status));
    }
  }

  if (url === SOURCE_RPC_URL || url === DESTINATION_RPC_URL) {
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      method: string;
      params: unknown[];
    };

    if (url === SOURCE_RPC_URL) {
      if (body.method === "eth_getBlockByNumber") {
        return Promise.resolve(jsonResponse(sourceBlockFixture.json, sourceBlockFixture.status));
      }
      if (body.method === "eth_getProof") {
        return Promise.resolve(jsonResponse(ethGetProofFixture.json, ethGetProofFixture.status));
      }
    }

    if (url === DESTINATION_RPC_URL) {
      if (body.method === "eth_blockNumber") {
        return Promise.resolve(
          jsonResponse({ jsonrpc: "2.0", id: 1, result: toHex(DESTINATION_BLOCK_NUMBER) }, 200),
        );
      }
      if (body.method === "eth_getBlockByNumber") {
        const blockTag = body.params[0] as `0x${string}`;
        const blockNumber = BigInt(blockTag);
        return Promise.resolve(jsonResponse(destinationBlockResult(blockNumber), 200));
      }
    }
  }

  throw new Error(`Unhandled fetch request: ${url}`);
}

function destinationBlockResult(blockNumber: bigint) {
  const recorded = destinationHeadersFixture.find((entry) => BigInt(entry.number) === blockNumber);
  if (recorded) {
    return {
      jsonrpc: "2.0",
      id: 1,
      result: {
        number: toHex(blockNumber),
        hash: recorded.hash,
        timestamp: toHex(BigInt(recorded.timestamp)),
        parentBeaconRoot: recorded.parentBeaconRoot,
      },
    };
  }

  const syntheticTimestamp = syntheticDestinationTimestamp(blockNumber);
  return {
    jsonrpc: "2.0",
    id: 1,
    result: {
      number: toHex(blockNumber),
      hash: `0x${blockNumber.toString(16).padStart(64, "0")}`,
      timestamp: toHex(syntheticTimestamp),
      parentBeaconRoot: null,
    },
  };
}

function syntheticDestinationTimestamp(blockNumber: bigint): bigint {
  const delta = blockNumber - DESTINATION_BLOCK_NUMBER;
  return DESTINATION_TIMESTAMP + delta * 2n;
}

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(currentDir, path), "utf8"));
}

function readLiveBundleFixture(): LiveBundleFixture {
  return JSON.parse(
    readFileSync(resolve(currentDir, "../../contracts/test/fixtures/liveProofFixture.json"), "utf8"),
  ) as LiveBundleFixture;
}

function withBeaconHeadSlot(slot: string): RestFixture {
  return {
    status: beaconHeadFixture.status,
    json: {
      ...beaconHeadFixture.json,
      data: {
        ...beaconHeadFixture.json.data,
        header: {
          ...beaconHeadFixture.json.data.header,
          message: {
            ...beaconHeadFixture.json.data.header.message,
            slot,
          },
        },
      },
    },
  };
}

function toHex(value: bigint): `0x${string}` {
  return `0x${value.toString(16)}`;
}

interface RpcFixture {
  status: number;
  json: Record<string, unknown>;
}

interface RestFixture {
  status: number;
  json: {
    data: any;
    [key: string]: unknown;
  };
}

interface DestinationHeaderFixture {
  number: string;
  hash: `0x${string}`;
  timestamp: string;
  parentBeaconRoot: `0x${string}` | null;
}

interface LiveBundleFixture {
  bundle: ProofBundle;
  expected: {
    sourceBlockNumber: string;
  };
  metadata: {
    destinationBlockNumber: string;
    destinationTimestamp: string;
  };
}
