import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createScenario, listScenarios } from "../hal/mock-hal.mjs";
import { createRealSnapshot } from "../hal/real-hal.mjs";
import { loadProjectEnv } from "./load-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const uiDir = path.join(rootDir, "ui");
const outputFile = path.join(uiDir, "mock-state.js");

function selectedDataSource() {
  return process.env.DATA_SOURCE === "real" ? "real" : "mock";
}

async function buildScenarioBundle(dataSource) {
  if (dataSource === "real") {
    const snapshot = await createRealSnapshot();
    return { live: snapshot };
  }

  return Object.fromEntries(
    listScenarios().map((name) => [name, createScenario(name)])
  );
}

export async function writeStateFile() {
  await loadProjectEnv(rootDir);
  const dataSource = selectedDataSource();
  const scenarios = await buildScenarioBundle(dataSource);

  const payload =
    "window.MOCK_SCENARIOS = " +
    JSON.stringify(scenarios, null, 2) +
    ";\n";

  await mkdir(uiDir, { recursive: true });
  await writeFile(outputFile, payload, "utf8");

  return {
    dataSource,
    outputFile
  };
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const result = await writeStateFile();
  console.log(`Wrote ${result.dataSource} state bundle to ${result.outputFile}`);
}
