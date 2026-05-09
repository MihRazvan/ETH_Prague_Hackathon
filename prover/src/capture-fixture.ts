import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { encodeAbiParameters, getAddress, keccak256, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { BeaconApiClient } from "./beacon-fetch.js";
import { assembleBundle } from "./bundle.js";
import { EthereumRpcClient } from "./eth-getProof.js";
import type { ProofBundle, ProverConfig } from "./types.js";

type DestinationHeaderRecord = {
  number: string;
  hash: Hex;
  timestamp: string;
  parentBeaconRoot: Hex | null;
};

async function main(): Promise<void> {
  const config = loadConfig();
  const borrower = resolveBorrower();
  const account = requiredAddress(process.env.VAULT_ADDRESS, "VAULT_ADDRESS");
  const outputDir = resolve(process.env.FIXTURE_OUT_DIR ?? "test/fixtures");
  const contractsFixturePath = resolve(process.env.CONTRACTS_FIXTURE_OUT ?? "../contracts/test/fixtures/liveProofFixture.json");

  const slot = computeVaultSlot(borrower);
  const sourceRpc = new EthereumRpcClient(config.ethRpcUrl);
  const beacon = new BeaconApiClient(config);
  const destinationRpc = config.destinationRpcUrl ? new EthereumRpcClient(config.destinationRpcUrl) : null;

  const blockNumber = process.env.SOURCE_BLOCK_NUMBER
    ? BigInt(process.env.SOURCE_BLOCK_NUMBER)
    : await sourceRpc.getBlockNumber();
  const blockTag = toHex(blockNumber);

  const [sourceBlockRaw, proofRaw] = await Promise.all([
    rpcRequest(config.ethRpcUrl, "eth_getBlockByNumber", [blockTag, false]),
    rpcRequest(config.ethRpcUrl, "eth_getProof", [account, [slot], blockTag]),
  ]);

  const block = await sourceRpc.getBlockByNumber(blockNumber);
  const proof = await sourceRpc.getProof(account, slot, blockNumber);
  const anchor = await beacon.findExecutionAnchor(block.hash);

  const [beaconHeadRaw, beaconHeaderRaw, blindedBlockRaw] = await Promise.all([
    restRequest(`${config.beaconApiUrl}/eth/v1/beacon/headers/head`),
    restRequest(`${config.beaconApiUrl}/eth/v1/beacon/headers/${anchor.header.slot.toString()}`),
    restRequest(`${config.beaconApiUrl}/eth/v1/beacon/blinded_blocks/${anchor.header.slot.toString()}`),
  ]);

  let destinationMetadata:
    | {
        destinationBlockNumber: bigint;
        destinationTimestamp: bigint;
        headerWindow: DestinationHeaderRecord[];
      }
    | undefined;

  if (destinationRpc) {
    destinationMetadata = await captureDestinationWindow(destinationRpc, anchor.header.root, anchor.executionHeader.timestamp);
    anchor.destinationTimestamp = destinationMetadata.destinationTimestamp;
  }

  const bundle = assembleBundle(
    { account, slot, blockNumber },
    anchor,
    proof,
  );

  const expectedValue = extractExpectedValue(proofRaw);
  const normalizedBundle = normalizeBundle(bundle);

  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, "eth_getBlockByNumber.source.json"), JSON.stringify(sourceBlockRaw, null, 2) + "\n", "utf8");
  await writeFile(resolve(outputDir, "eth_getProof.source.json"), JSON.stringify(proofRaw, null, 2) + "\n", "utf8");
  await writeFile(resolve(outputDir, "beacon_headers_head.json"), JSON.stringify(beaconHeadRaw, null, 2) + "\n", "utf8");
  await writeFile(
    resolve(outputDir, `beacon_header_${anchor.header.slot.toString()}.json`),
    JSON.stringify(beaconHeaderRaw, null, 2) + "\n",
    "utf8",
  );
  await writeFile(
    resolve(outputDir, `beacon_blinded_block_${anchor.header.slot.toString()}.json`),
    JSON.stringify(blindedBlockRaw, null, 2) + "\n",
    "utf8",
  );

  if (destinationMetadata) {
    await writeFile(
      resolve(outputDir, "base_headers_search_window.json"),
      JSON.stringify(destinationMetadata.headerWindow, null, 2) + "\n",
      "utf8",
    );
  }

  await mkdir(resolve(contractsFixturePath, ".."), { recursive: true });
  await writeFile(
    contractsFixturePath,
    JSON.stringify(
      {
        bundle: normalizedBundle,
        expected: {
          verifiedValue: expectedValue,
          sourceBlockNumber: blockNumber.toString(),
          sourceAccount: account,
          sourceSlot: slot,
        },
        metadata: {
          borrower,
          destinationBlockNumber: destinationMetadata?.destinationBlockNumber.toString() ?? null,
          destinationTimestamp: destinationMetadata?.destinationTimestamp.toString() ?? bundle.timestamp.toString(),
        },
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        borrower,
        account,
        slot,
        sourceBlockNumber: blockNumber.toString(),
        executionSlot: anchor.header.slot.toString(),
        executionHeaderProofLength: anchor.executionHeaderProof.length,
        accountProofLength: proof.accountProof.length,
        storageProofLength: proof.storageProof.length,
        destinationBlockNumber: destinationMetadata?.destinationBlockNumber.toString() ?? null,
        destinationTimestamp: destinationMetadata?.destinationTimestamp.toString() ?? bundle.timestamp.toString(),
      },
      null,
      2,
    ),
  );
}

async function captureDestinationWindow(
  destinationRpc: EthereumRpcClient,
  targetBeaconRoot: Hex,
  targetTimestamp: bigint,
): Promise<{ destinationBlockNumber: bigint; destinationTimestamp: bigint; headerWindow: DestinationHeaderRecord[] }> {
  const latestDestinationBlock = await destinationRpc.getBlockNumber();
  let low = 0n;
  let high = latestDestinationBlock;

  while (low < high) {
    const mid = (low + high + 1n) / 2n;
    const header = await destinationRpc.getBlockHeaderByNumber(mid);
    if (header.timestamp <= targetTimestamp) {
      low = mid;
    } else {
      high = mid - 1n;
    }
  }

  const anchorBlockNumber = low;
  const normalizedRoot = targetBeaconRoot.toLowerCase();
  const headerWindow: DestinationHeaderRecord[] = [];
  let matchNumber: bigint | null = null;
  let matchTimestamp: bigint | null = null;

  for (let blockNumber = anchorBlockNumber; blockNumber <= anchorBlockNumber + 64n; blockNumber++) {
    const header = await destinationRpc.getBlockHeaderByNumber(blockNumber);
    headerWindow.push({
      number: blockNumber.toString(),
      hash: header.hash,
      timestamp: header.timestamp.toString(),
      parentBeaconRoot: header.parentBeaconRoot,
    });

    if (matchNumber === null && header.parentBeaconRoot?.toLowerCase() === normalizedRoot) {
      matchNumber = blockNumber;
      matchTimestamp = header.timestamp;
    }
  }

  if (matchNumber === null || matchTimestamp === null) {
    throw new Error(`Could not find destination timestamp for beacon root ${targetBeaconRoot}`);
  }

  return {
    destinationBlockNumber: matchNumber,
    destinationTimestamp: matchTimestamp,
    headerWindow,
  };
}

async function rpcRequest(url: string, method: string, params: unknown[]) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  const json = await response.json();
  return { status: response.status, json };
}

async function restRequest(url: string) {
  const response = await fetch(url);
  const json = await response.json();
  return { status: response.status, json };
}

function loadConfig(): ProverConfig {
  return {
    ethRpcUrl: process.env.ETH_RPC_URL ?? "https://sepolia.gateway.tenderly.co",
    beaconApiUrl: process.env.BEACON_API_URL ?? "https://ethereum-sepolia-beacon-api.publicnode.com",
    destinationRpcUrl: process.env.BASE_RPC_URL,
    searchWindowSlots: process.env.SEARCH_WINDOW_SLOTS ? Number(process.env.SEARCH_WINDOW_SLOTS) : 512,
    destinationSearchWindowBlocks: process.env.DESTINATION_SEARCH_WINDOW_BLOCKS
      ? Number(process.env.DESTINATION_SEARCH_WINDOW_BLOCKS)
      : 2048,
  };
}

function resolveBorrower(): Address {
  const explicit = process.env.BORROWER_ADDRESS;
  if (explicit) {
    return requiredAddress(explicit, "BORROWER_ADDRESS");
  }

  const privateKey = process.env.PRIVATE_KEY as Hex | undefined;
  if (!privateKey) {
    throw new Error("Set BORROWER_ADDRESS or PRIVATE_KEY before capturing fixtures.");
  }

  return getAddress(privateKeyToAccount(privateKey).address);
}

function requiredAddress(value: string | undefined, label: string): Address {
  if (!value) {
    throw new Error(`Missing required ${label}`);
  }
  return getAddress(value);
}

function computeVaultSlot(borrower: Address): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [borrower, 0n],
    ),
  );
}

function normalizeBundle(bundle: ProofBundle) {
  return JSON.parse(
    JSON.stringify(bundle, (_, value) => (typeof value === "bigint" ? value.toString() : value)),
  ) as Record<string, unknown>;
}

function extractExpectedValue(proofRaw: Awaited<ReturnType<typeof rpcRequest>>): Hex {
  const value = (proofRaw.json as any).result?.storageProof?.[0]?.value as string | undefined;
  if (!value) {
    throw new Error("Could not extract storage value from eth_getProof response.");
  }
  return `0x${BigInt(value).toString(16).padStart(64, "0")}`;
}

function toHex(value: bigint): Hex {
  return `0x${value.toString(16)}`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
