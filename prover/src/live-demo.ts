import { createPublicClient, createWalletClient, encodeAbiParameters, getAddress, http, keccak256, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, sepolia } from "viem/chains";

import { Prover } from "./prover.js";

const vaultAbi = [
  {
    type: "function",
    name: "locks",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "lock",
    stateMutability: "payable",
    inputs: [],
    outputs: [
      { name: "slotKey", type: "bytes32" },
      { name: "encodedValue", type: "uint256" },
    ],
  },
] as const;

const lenderAbi = [
  {
    type: "function",
    name: "borrow",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "proof",
        type: "tuple",
        components: [
          { name: "timestamp", type: "uint64" },
          { name: "slot", type: "uint64" },
          { name: "proposerIndex", type: "uint64" },
          { name: "parentRoot", type: "bytes32" },
          { name: "stateRoot", type: "bytes32" },
          { name: "bodyRoot", type: "bytes32" },
          { name: "executionPayloadGIndex", type: "uint256" },
          {
            name: "executionHeader",
            type: "tuple",
            components: [
              { name: "parentHash", type: "bytes32" },
              { name: "feeRecipient", type: "address" },
              { name: "stateRoot", type: "bytes32" },
              { name: "receiptsRoot", type: "bytes32" },
              { name: "logsBloom", type: "bytes" },
              { name: "prevRandao", type: "bytes32" },
              { name: "blockNumber", type: "uint64" },
              { name: "gasLimit", type: "uint64" },
              { name: "gasUsed", type: "uint64" },
              { name: "timestamp", type: "uint64" },
              { name: "extraData", type: "bytes" },
              { name: "baseFeePerGas", type: "uint256" },
              { name: "blockHash", type: "bytes32" },
              { name: "transactionsRoot", type: "bytes32" },
              { name: "withdrawalsRoot", type: "bytes32" },
              { name: "blobGasUsed", type: "uint64" },
              { name: "excessBlobGas", type: "uint64" },
            ],
          },
          { name: "executionHeaderProof", type: "bytes32[]" },
          { name: "account", type: "address" },
          { name: "slotKey", type: "bytes32" },
          { name: "accountProof", type: "bytes[]" },
          { name: "storageProof", type: "bytes[]" },
        ],
      },
    ],
    outputs: [
      { name: "loanId", type: "uint256" },
      { name: "debtAmount", type: "uint256" },
    ],
  },
] as const;

async function main(): Promise<void> {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}` | undefined;
  const vaultAddress = process.env.VAULT_ADDRESS as `0x${string}` | undefined;
  const lenderAddress = process.env.LENDER_ADDRESS as `0x${string}` | undefined;
  const amount = process.env.LOCK_AMOUNT_ETH ?? "0.1";

  if (!privateKey || !vaultAddress || !lenderAddress) {
    throw new Error("Set PRIVATE_KEY, VAULT_ADDRESS, and LENDER_ADDRESS before running the live demo script.");
  }

  const account = privateKeyToAccount(privateKey);
  const borrower = getAddress(account.address);
  const ethRpcUrl = process.env.ETH_RPC_URL ?? "https://ethereum-sepolia.publicnode.com";
  const beaconApiUrl = process.env.BEACON_API_URL ?? "https://ethereum-sepolia-beacon-api.publicnode.com";
  const baseRpcUrl = process.env.BASE_RPC_URL ?? "https://sepolia.base.org";
  const sourceBlockOverride = process.env.SOURCE_BLOCK_NUMBER
    ? BigInt(process.env.SOURCE_BLOCK_NUMBER)
    : undefined;

  const sepoliaWallet = createWalletClient({
    account,
    chain: sepolia,
    transport: http(ethRpcUrl),
  });
  const baseWallet = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(baseRpcUrl),
  });
  const sepoliaPublic = createPublicClient({ chain: sepolia, transport: http(ethRpcUrl) });
  const basePublic = createPublicClient({ chain: baseSepolia, transport: http(baseRpcUrl) });

  const currentLock = await sepoliaPublic.readContract({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: "locks",
    args: [borrower],
  });

  let lockHash: `0x${string}` | null = null;
  if ((currentLock & 0xffn) !== 1n) {
    lockHash = await sepoliaWallet.writeContract({
      address: vaultAddress,
      abi: vaultAbi,
      functionName: "lock",
      args: [],
      value: parseEther(amount),
    });
    await sepoliaPublic.waitForTransactionReceipt({ hash: lockHash });
  }

  const slotKey = computeVaultSlot(borrower);
  const blockNumber = sourceBlockOverride ?? (await sepoliaPublic.getBlockNumber());
  const prover = new Prover({
    ethRpcUrl,
    beaconApiUrl,
    destinationRpcUrl: baseRpcUrl,
    searchWindowSlots: 512,
    destinationSearchWindowBlocks: 2048,
  });
  const bundle = await prover.proveStorageSlot({
    account: vaultAddress,
    slot: slotKey,
    blockNumber,
  });

  const borrowHash = await baseWallet.writeContract({
    address: lenderAddress,
    abi: lenderAbi,
    functionName: "borrow",
    args: [bundle],
  });
  await basePublic.waitForTransactionReceipt({ hash: borrowHash });

  console.log(
    JSON.stringify(
      {
        borrower,
        slotKey,
        lockTx: lockHash,
        borrowTx: borrowHash,
        sourceBlockNumber: blockNumber.toString(),
      },
      (_, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    ),
  );
}

function computeVaultSlot(borrower: `0x${string}`): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [borrower, 0n],
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
