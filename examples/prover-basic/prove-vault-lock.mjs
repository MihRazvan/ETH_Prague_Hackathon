import { AnywareClient } from "anyware-prover";

const vault = process.env.VAULT_ADDRESS;
const borrower = process.env.BORROWER_ADDRESS;

if (!vault || !borrower) {
  throw new Error("Set VAULT_ADDRESS and BORROWER_ADDRESS before running this example.");
}

const client = new AnywareClient({
  network: "sepolia-base-sepolia",
});

const bundle = await client.proveVaultLock({
  vault,
  borrower,
});

console.log(JSON.stringify(client.toBundleEnvelope(bundle), null, 2));
