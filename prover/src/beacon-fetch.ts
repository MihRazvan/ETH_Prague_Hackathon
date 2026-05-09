import { EthereumRpcClient } from "./eth-getProof.js";
import { type Hex } from "viem";

import {
  BeaconApiRequestError,
  BeaconBlockNotFoundError,
  BeaconResponseShapeError,
  DestinationAnchorNotFoundError,
} from "./errors.js";
import type {
  BeaconExecutionAnchor,
  BeaconHeader,
  ExecutionPayloadHeader,
  PreflightReport,
  ProverConfig,
} from "./types.js";
import { buildExecutionPayloadProof } from "./ssz-prove.js";

interface BeaconHeaderResponse {
  data: {
    root: Hex;
    header: {
      message: {
        slot: string;
        proposer_index: string;
        parent_root: Hex;
        state_root: Hex;
        body_root: Hex;
      };
    };
  };
}

interface BlindedBlockResponse {
  version: "deneb" | "electra" | "fulu";
  data: {
    message: {
      slot: string;
      proposer_index: string;
      parent_root: Hex;
      state_root: Hex;
      body: {
        execution_payload_header: {
          parent_hash: Hex;
          fee_recipient: Hex;
          state_root: Hex;
          receipts_root: Hex;
          logs_bloom: Hex;
          prev_randao: Hex;
          block_number: string;
          gas_limit: string;
          gas_used: string;
          timestamp: string;
          extra_data: Hex;
          base_fee_per_gas: string;
          block_hash: Hex;
          transactions_root: Hex;
          withdrawals_root: Hex;
          blob_gas_used?: string;
          excess_blob_gas?: string;
        };
        [key: string]: unknown;
      };
    };
  };
}

export class BeaconApiClient {
  readonly #searchWindowSlots: number;
  readonly #destinationSearchWindowBlocks: number;

  constructor(private readonly config: ProverConfig) {
    this.#searchWindowSlots = config.searchWindowSlots ?? 512;
    this.#destinationSearchWindowBlocks = config.destinationSearchWindowBlocks ?? 2_048;
  }

  async preflight(sourceRpc: EthereumRpcClient, destinationRpc: EthereumRpcClient | null): Promise<PreflightReport> {
    const report: PreflightReport = {
      source: { ok: false },
      beacon: { ok: false },
      overallOk: false,
    };

    try {
      const latestBlockNumber = await sourceRpc.getBlockNumber();
      const latestBlock = await sourceRpc.getBlockByNumber(latestBlockNumber);
      report.source = {
        ok: true,
        latestBlockNumber,
        latestBlockHash: latestBlock.hash,
        latestBlockTimestamp: latestBlock.timestamp,
      };
    } catch (error) {
      report.source = {
        ok: false,
        error: toErrorMessage(error),
      };
    }

    try {
      const head = await this.#fetchJson<BeaconHeaderResponse>("/eth/v1/beacon/headers/head");
      const headMessage = expectObject(
        expectObject(expectObject(expectObject(head, "beacon head response").data, "beacon head response.data").header, "beacon head response.data.header").message,
        "beacon head response.data.header.message",
      );
      report.beacon = {
        ok: true,
        headSlot: parseBigIntField(headMessage.slot, "beacon head response.data.header.message.slot"),
      };
    } catch (error) {
      report.beacon = {
        ok: false,
        error: toErrorMessage(error),
      };
    }

    if (destinationRpc) {
      try {
        const latestBlockNumber = await destinationRpc.getBlockNumber();
        const header = await destinationRpc.getBlockHeaderByNumber(latestBlockNumber);
        report.destination = {
          ok: true,
          latestBlockNumber,
          latestBlockHash: header.hash,
          latestBlockTimestamp: header.timestamp,
          supportsBeaconRootField: header.parentBeaconRoot !== null,
        };
      } catch (error) {
        report.destination = {
          ok: false,
          error: toErrorMessage(error),
        };
      }
    }

    report.overallOk = report.source.ok && report.beacon.ok && (report.destination?.ok ?? true);
    return report;
  }

  async findExecutionAnchor(blockHash: Hex): Promise<BeaconExecutionAnchor> {
    const head = await this.#fetchJson<BeaconHeaderResponse>("/eth/v1/beacon/headers/head");
    const headMessage = expectObject(
      expectObject(expectObject(expectObject(head, "beacon head response").data, "beacon head response.data").header, "beacon head response.data.header").message,
      "beacon head response.data.header.message",
    );
    const headSlot = parseBigIntField(headMessage.slot, "beacon head response.data.header.message.slot");

    for (let offset = 0; offset < this.#searchWindowSlots; offset++) {
      const slot = headSlot - BigInt(offset);
      const block = await this.#tryFetchJson<BlindedBlockResponse>(`/eth/v1/beacon/blinded_blocks/${slot.toString()}`);
      if (!block) {
        continue;
      }
      const executionHeader = this.#parseExecutionHeader(block.data.message.body.execution_payload_header);

      if (executionHeader.blockHash.toLowerCase() !== blockHash.toLowerCase()) {
        continue;
      }

      const header = await this.#fetchHeader(slot.toString());
      const { gindex, proof } = await buildExecutionPayloadProof(block.version, block.data.message.body);

      return {
        header,
        executionHeader,
        executionPayloadGIndex: gindex,
        executionHeaderProof: proof,
      };
    }

    throw new BeaconBlockNotFoundError(
      `Could not find beacon block for execution block ${blockHash} within the last ${this.#searchWindowSlots} slots`,
      { blockHash, searchWindowSlots: this.#searchWindowSlots },
    );
  }

  async findDestinationTimestamp(
    destinationRpc: EthereumRpcClient,
    targetBeaconRoot: Hex,
    targetTimestamp: bigint,
  ): Promise<bigint> {
    const latestDestinationBlock = await destinationRpc.getBlockNumber();
    const anchorBlockNumber = await this.#findBlockAtOrBeforeTimestamp(
      destinationRpc,
      latestDestinationBlock,
      targetTimestamp,
    );

    const normalizedTargetRoot = targetBeaconRoot.toLowerCase();
    for (let offset = 0; offset < this.#destinationSearchWindowBlocks; offset++) {
      const below = anchorBlockNumber - BigInt(offset);
      if (below >= 0n) {
        const header = await destinationRpc.getBlockHeaderByNumber(below);
        if (header.parentBeaconRoot?.toLowerCase() === normalizedTargetRoot) {
          return header.timestamp;
        }
      }

      if (offset === 0) {
        continue;
      }

      const above = anchorBlockNumber + BigInt(offset);
      if (above > latestDestinationBlock) {
        continue;
      }

      const header = await destinationRpc.getBlockHeaderByNumber(above);
      if (header.parentBeaconRoot?.toLowerCase() === normalizedTargetRoot) {
        return header.timestamp;
      }
    }

    throw new DestinationAnchorNotFoundError(
      `Could not find destination-chain timestamp for beacon root ${targetBeaconRoot} within ${this.#destinationSearchWindowBlocks} blocks of destination block ${anchorBlockNumber.toString()}`,
      {
        beaconRoot: targetBeaconRoot,
        anchorBlockNumber,
        searchWindowBlocks: this.#destinationSearchWindowBlocks,
      },
    );
  }

  async #findBlockAtOrBeforeTimestamp(
    destinationRpc: EthereumRpcClient,
    latestBlockNumber: bigint,
    targetTimestamp: bigint,
  ): Promise<bigint> {
    let low = 0n;
    let high = latestBlockNumber;

    while (low < high) {
      const mid = (low + high + 1n) / 2n;
      const header = await destinationRpc.getBlockHeaderByNumber(mid);

      if (header.timestamp <= targetTimestamp) {
        low = mid;
      } else {
        high = mid - 1n;
      }
    }

    return low;
  }

  async #fetchHeader(blockId: string): Promise<BeaconHeader> {
    const header = await this.#fetchJson<BeaconHeaderResponse>(`/eth/v1/beacon/headers/${blockId}`);
    const message = expectObject(
      expectObject(expectObject(expectObject(header, "beacon header response").data, "beacon header response.data").header, "beacon header response.data.header").message,
      "beacon header response.data.header.message",
    );

    return {
      root: expectHex(expectObject(expectObject(header, "beacon header response").data, "beacon header response.data").root, "beacon header response.data.root"),
      slot: parseBigIntField(message.slot, "beacon header response.data.header.message.slot"),
      proposerIndex: parseBigIntField(message.proposer_index, "beacon header response.data.header.message.proposer_index"),
      parentRoot: expectHex(message.parent_root, "beacon header response.data.header.message.parent_root"),
      stateRoot: expectHex(message.state_root, "beacon header response.data.header.message.state_root"),
      bodyRoot: expectHex(message.body_root, "beacon header response.data.header.message.body_root"),
    };
  }

  #parseExecutionHeader(payload: BlindedBlockResponse["data"]["message"]["body"]["execution_payload_header"]): ExecutionPayloadHeader {
    const header = expectObject(payload, "blinded block execution_payload_header");
    return {
      parentHash: expectHex(header.parent_hash, "blinded block execution_payload_header.parent_hash"),
      feeRecipient: expectHex(header.fee_recipient, "blinded block execution_payload_header.fee_recipient"),
      stateRoot: expectHex(header.state_root, "blinded block execution_payload_header.state_root"),
      receiptsRoot: expectHex(header.receipts_root, "blinded block execution_payload_header.receipts_root"),
      logsBloom: expectHex(header.logs_bloom, "blinded block execution_payload_header.logs_bloom"),
      prevRandao: expectHex(header.prev_randao, "blinded block execution_payload_header.prev_randao"),
      blockNumber: parseBigIntField(header.block_number, "blinded block execution_payload_header.block_number"),
      gasLimit: parseBigIntField(header.gas_limit, "blinded block execution_payload_header.gas_limit"),
      gasUsed: parseBigIntField(header.gas_used, "blinded block execution_payload_header.gas_used"),
      timestamp: parseBigIntField(header.timestamp, "blinded block execution_payload_header.timestamp"),
      extraData: expectHex(header.extra_data, "blinded block execution_payload_header.extra_data"),
      baseFeePerGas: parseBigIntField(header.base_fee_per_gas, "blinded block execution_payload_header.base_fee_per_gas"),
      blockHash: expectHex(header.block_hash, "blinded block execution_payload_header.block_hash"),
      transactionsRoot: expectHex(header.transactions_root, "blinded block execution_payload_header.transactions_root"),
      withdrawalsRoot: expectHex(header.withdrawals_root, "blinded block execution_payload_header.withdrawals_root"),
      blobGasUsed: parseOptionalBigIntField(header.blob_gas_used, "blinded block execution_payload_header.blob_gas_used", 0n),
      excessBlobGas: parseOptionalBigIntField(header.excess_blob_gas, "blinded block execution_payload_header.excess_blob_gas", 0n),
    };
  }

  async #fetchJson<T>(path: string): Promise<T> {
    const response = await fetch(`${this.config.beaconApiUrl}${path}`);
    if (!response.ok) {
      throw new BeaconApiRequestError(`Beacon API request failed for ${path} with status ${response.status}`, {
        path,
        status: response.status,
      });
    }
    return (await response.json()) as T;
  }

  async #tryFetchJson<T>(path: string): Promise<T | null> {
    const response = await fetch(`${this.config.beaconApiUrl}${path}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new BeaconApiRequestError(`Beacon API request failed for ${path} with status ${response.status}`, {
        path,
        status: response.status,
      });
    }
    return (await response.json()) as T;
  }
}

function expectObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BeaconResponseShapeError(`Malformed beacon API response: expected ${field} to be an object`, field);
  }
  return value as Record<string, unknown>;
}

function expectHex(value: unknown, field: string): Hex {
  if (typeof value !== "string" || !value.startsWith("0x")) {
    throw new BeaconResponseShapeError(`Malformed beacon API response: expected ${field} to be a hex string`, field);
  }
  return value as Hex;
}

function parseBigIntField(value: unknown, field: string): bigint {
  if (typeof value !== "string") {
    throw new BeaconResponseShapeError(`Malformed beacon API response: expected ${field} to be a string`, field);
  }
  try {
    return BigInt(value);
  } catch {
    throw new BeaconResponseShapeError(`Malformed beacon API response: expected ${field} to be bigint-compatible`, field);
  }
}

function parseOptionalBigIntField(value: unknown, field: string, fallback: bigint): bigint {
  if (value === undefined) {
    return fallback;
  }
  return parseBigIntField(value, field);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
