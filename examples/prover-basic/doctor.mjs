import { ElsewareClient } from "@elseware/prover";

const client = new ElsewareClient({
  network: "sepolia-base-sepolia",
});

const report = await client.preflight();
console.log(JSON.stringify(report, null, 2));

if (!report.overallOk) {
  process.exitCode = 1;
}
