import { AnywareClient } from "anyware-prover";

const client = new AnywareClient({
  network: "sepolia-base-sepolia",
});

const report = await client.preflight();
console.log(JSON.stringify(report, null, 2));

if (!report.overallOk) {
  process.exitCode = 1;
}
