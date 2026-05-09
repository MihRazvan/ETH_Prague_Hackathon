import { numberToHex, pad, type Address, type Hex } from "viem";

import { RpcRequestError, RpcResponseShapeError } from "./errors.js";
import type { EthGetProofResult } from "./types.js";

interface RpcRequest<T> {
  method: string;
  params: unknown[];
  parser: (value: any) => T;
}

export class EthereumRpcClient {
  constructor(private readonly rpcUrl: string) {}

  async getBlockNumber(): Promise<bigint> {
    return this.#request({
      method: "eth_blockNumber",
      params: [],
      parser: (value) => parseBigIntField(value, "blockNumber"),
    });
  }

  async getBlockByNumber(blockNumber: bigint): Promise<{ hash: Hex; timestamp: bigint }> {
    return this.#request({
      method: "eth_getBlockByNumber",
      params: [numberToHex(blockNumber), false],
      parser: (value) => {
        const block = expectObject(value, "block");
        return {
          hash: expectHex(block.hash, "block.hash"),
          timestamp: parseBigIntField(block.timestamp, "block.timestamp"),
        };
      },
    });
  }

  async getBlockHeaderByNumber(
    blockNumber: bigint,
  ): Promise<{ number: bigint; hash: Hex; timestamp: bigint; parentBeaconRoot: Hex | null }> {
    return this.#request({
      method: "eth_getBlockByNumber",
      params: [numberToHex(blockNumber), false],
      parser: (value) => {
        const block = expectObject(value, "block header");
        const parentBeaconRoot = block.parentBeaconRoot ?? block.parentBeaconBlockRoot ?? null;

        return {
          number: parseBigIntField(block.number, "block.number"),
          hash: expectHex(block.hash, "block.hash"),
          timestamp: parseBigIntField(block.timestamp, "block.timestamp"),
          parentBeaconRoot: parentBeaconRoot === null ? null : expectHex(parentBeaconRoot, "block.parentBeaconRoot"),
        };
      },
    });
  }

  async getProof(account: Address, slotKey: Hex, blockNumber: bigint): Promise<EthGetProofResult> {
    return this.#request({
      method: "eth_getProof",
      params: [account, [pad(slotKey)], numberToHex(blockNumber)],
      parser: (value) => {
        const proof = expectObject(value, "eth_getProof result");
        const accountProof = expectHexArray(proof.accountProof, "eth_getProof.accountProof");
        const storageEntries = expectArray(proof.storageProof, "eth_getProof.storageProof");
        if (storageEntries.length === 0) {
          throw new Error("Malformed eth_getProof response: eth_getProof.storageProof must contain at least one entry");
        }

        const firstEntry = expectObject(storageEntries[0], "eth_getProof.storageProof[0]");
        const storageProof = expectHexArray(firstEntry.proof, "eth_getProof.storageProof[0].proof");

        return {
          accountProof,
          storageProof,
        };
      },
    });
  }

  async #request<T>(request: RpcRequest<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const response = await fetch(this.rpcUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: request.method,
            params: request.params,
          }),
        });

        if (!response.ok) {
          const error = new RpcRequestError(
            `RPC ${request.method} to ${this.rpcUrl} failed with status ${response.status}`,
            { method: request.method, url: this.rpcUrl, status: response.status },
          );
          if (response.status >= 500 && attempt < 4) {
            lastError = error;
            await sleep(attempt * 250);
            continue;
          }
          throw error;
        }

        const json = await response.json();
        if (json.error) {
          throw new RpcRequestError(
            `RPC ${request.method} to ${this.rpcUrl} failed: ${json.error.message}`,
            { method: request.method, url: this.rpcUrl },
          );
        }

        return request.parser(json.result);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt >= 4) {
          throw lastError;
        }
        await sleep(attempt * 250);
      }
    }

    throw lastError ?? new Error(`RPC ${request.method} to ${this.rpcUrl} failed`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function expectObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RpcResponseShapeError(`Malformed RPC response: expected ${field} to be an object`, field);
  }
  return value as Record<string, unknown>;
}

function expectArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new RpcResponseShapeError(`Malformed RPC response: expected ${field} to be an array`, field);
  }
  return value;
}

function expectHex(value: unknown, field: string): Hex {
  if (typeof value !== "string" || !value.startsWith("0x")) {
    throw new RpcResponseShapeError(`Malformed RPC response: expected ${field} to be a hex string`, field);
  }
  return value as Hex;
}

function expectHexArray(value: unknown, field: string): Hex[] {
  return expectArray(value, field).map((item, index) => expectHex(item, `${field}[${index}]`));
}

function parseBigIntField(value: unknown, field: string): bigint {
  if (typeof value !== "string") {
    throw new RpcResponseShapeError(`Malformed RPC response: expected ${field} to be a string`, field);
  }
  try {
    return BigInt(value);
  } catch {
    throw new RpcResponseShapeError(`Malformed RPC response: expected ${field} to be bigint-compatible`, field);
  }
}
