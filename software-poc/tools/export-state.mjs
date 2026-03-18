import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createScenario, listScenarios } from "../hal/mock-hal.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const uiDir = path.join(rootDir, "ui");
const outputFile = path.join(uiDir, "mock-state.js");

export async function writeMockStateFile() {
  const scenarios = Object.fromEntries(
    listScenarios().map((name) => [name, createScenario(name)])
  );

  const payload =
    "window.MOCK_SCENARIOS = " +
    JSON.stringify(scenarios, null, 2) +
    ";\n";

  await mkdir(uiDir, { recursive: true });
  await writeFile(outputFile, payload, "utf8");

  return outputFile;
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const written = await writeMockStateFile();
  console.log(`Wrote mock scenario bundle to ${written}`);
}
