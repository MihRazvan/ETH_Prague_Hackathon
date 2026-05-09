import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { getAddress, isAddress, pad, type Address, type Hex } from "viem";

import { ElsewareClient, computeMappingSlot } from "./index.js";
import type { ProofBundle, ProverConfig } from "./types.js";

type Command = "prove-slot" | "vault-slot" | "doctor";

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2) as [Command | undefined, ...string[]];
  const args = parseArgs(rest);

  if (!command || args.help) {
    printHelp();
    return;
  }

  if (command === "vault-slot") {
    const borrower = requiredAddress(args.borrower, "--borrower");
    const mappingSlot = BigInt(args["mapping-slot"] ?? "0");
    const slotKey = computeMappingSlot(borrower, mappingSlot);
    const payload = { borrower, mappingSlot: mappingSlot.toString(), slotKey };
    await maybeWriteJson(args.out, payload);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (command === "prove-slot") {
    const config = loadConfig(args);
    const client = new ElsewareClient(config);
    const account = requiredAddress(args.account, "--account");
    const slot = requiredHex32(args.slot, "--slot");
    const blockNumber = args["block-number"] ? BigInt(args["block-number"]) : undefined;

    const bundle = await client.proveStorageSlot({ account, slot, blockNumber });
    const output = {
      bundle: normalizeBundle(bundle),
      metadata: {
        rpc: config.ethRpcUrl,
        beaconApi: config.beaconApiUrl,
        account,
        slot,
        blockNumber: blockNumber?.toString() ?? bundle.executionHeader.blockNumber.toString(),
        executionPayloadProofLength: bundle.executionHeaderProof.length,
      },
    };

    await maybeWriteJson(args.out, output);
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  if (command === "doctor") {
    const config = loadConfig(args);
    const client = new ElsewareClient(config);
    const report = await client.preflight();
    console.log(JSON.stringify(normalizeUnknown(report), null, 2));
    if (!report.overallOk) {
      process.exitCode = 1;
    }
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function parseArgs(argv: string[]): Record<string, string> & { help?: string } {
  const args: Record<string, string> & { help?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const current = argv[i];
    if (current === "--help" || current === "-h") {
      args.help = "1";
      continue;
    }

    if (!current.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${current}`);
    }

    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for ${current}`);
    }

    args[current.slice(2)] = next;
    i += 1;
  }

  return args;
}

function loadConfig(args: Record<string, string>): ProverConfig {
  return {
    ethRpcUrl: args["eth-rpc"] ?? process.env.ETH_RPC_URL ?? "https://ethereum-sepolia.publicnode.com",
    beaconApiUrl:
      args["beacon-api"] ?? process.env.BEACON_API_URL ?? "https://ethereum-sepolia-beacon-api.publicnode.com",
    destinationRpcUrl: args["destination-rpc"] ?? process.env.BASE_RPC_URL,
    searchWindowSlots: args["search-window"] ? Number(args["search-window"]) : undefined,
    destinationSearchWindowBlocks: args["destination-search-window"]
      ? Number(args["destination-search-window"])
      : undefined,
  };
}

function requiredAddress(value: string | undefined, flagName: string): Address {
  if (!value) {
    throw new Error(`Missing required argument ${flagName}`);
  }
  if (!isAddress(value)) {
    throw new Error(`Invalid address for ${flagName}: ${value}`);
  }
  return getAddress(value);
}

function requiredHex32(value: string | undefined, flagName: string): Hex {
  if (!value) {
    throw new Error(`Missing required argument ${flagName}`);
  }
  if (!/^0x[0-9a-fA-F]*$/.test(value)) {
    throw new Error(`Invalid hex value for ${flagName}: ${value}`);
  }
  return pad(value as Hex);
}

function normalizeBundle(bundle: ProofBundle) {
  return JSON.parse(
    JSON.stringify(bundle, (_, value) => (typeof value === "bigint" ? value.toString() : value)),
  ) as Record<string, unknown>;
}

function normalizeUnknown(payload: unknown) {
  return JSON.parse(
    JSON.stringify(payload, (_, value) => (typeof value === "bigint" ? value.toString() : value)),
  ) as Record<string, unknown>;
}

async function maybeWriteJson(out: string | undefined, payload: unknown): Promise<void> {
  if (!out) {
    return;
  }

  const path = resolve(out);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function printHelp(): void {
  console.log(`Usage:
  pnpm --filter @elseware/prover cli vault-slot --borrower 0x... [--mapping-slot 0] [--out tmp/slot.json]
  pnpm --filter @elseware/prover cli prove-slot --account 0x... --slot 0x... [--block-number 123] [--eth-rpc URL] [--beacon-api URL] [--destination-rpc URL] [--out tmp/bundle.json]
  pnpm --filter @elseware/prover cli doctor [--eth-rpc URL] [--beacon-api URL] [--destination-rpc URL]

Environment variables:
  ETH_RPC_URL
  BEACON_API_URL
  BASE_RPC_URL
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
