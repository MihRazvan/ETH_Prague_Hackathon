import { numberToHex, pad, type Address, type Hex } from "viem";

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
      parser: (value) => BigInt(value),
    });
  }

  async getBlockByNumber(blockNumber: bigint): Promise<{ hash: Hex; timestamp: bigint }> {
    return this.#request({
      method: "eth_getBlockByNumber",
      params: [numberToHex(blockNumber), false],
      parser: (value) => ({
        hash: value.hash as Hex,
        timestamp: BigInt(value.timestamp),
      }),
    });
  }

  async getBlockHeaderByNumber(
    blockNumber: bigint,
  ): Promise<{ number: bigint; hash: Hex; timestamp: bigint; parentBeaconRoot: Hex | null }> {
    return this.#request({
      method: "eth_getBlockByNumber",
      params: [numberToHex(blockNumber), false],
      parser: (value) => ({
        number: BigInt(value.number),
        hash: value.hash as Hex,
        timestamp: BigInt(value.timestamp),
        parentBeaconRoot:
          (value.parentBeaconRoot as Hex | undefined) ??
          (value.parentBeaconBlockRoot as Hex | undefined) ??
          null,
      }),
    });
  }

  async getProof(account: Address, slotKey: Hex, blockNumber: bigint): Promise<EthGetProofResult> {
    return this.#request({
      method: "eth_getProof",
      params: [account, [pad(slotKey)], numberToHex(blockNumber)],
      parser: (value) => ({
        accountProof: value.accountProof as Hex[],
        storageProof: (value.storageProof?.[0]?.proof ?? []) as Hex[],
      }),
    });
  }

  async #request<T>(request: RpcRequest<T>): Promise<T> {
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
      throw new Error(`RPC ${request.method} to ${this.rpcUrl} failed with status ${response.status}`);
    }

    const json = await response.json();
    if (json.error) {
      throw new Error(`RPC ${request.method} to ${this.rpcUrl} failed: ${json.error.message}`);
    }

    return request.parser(json.result);
  }
}
