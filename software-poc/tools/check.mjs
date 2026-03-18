import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function runStep(label, command, args, extraEnv = {}) {
  console.log(`\n==> ${label}`);

  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env: {
        ...process.env,
        ...extraEnv
      },
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} failed with exit code ${code}`));
    });
  });
}

await runStep("Fixture Tests", npmCommand(), ["test"]);
await runStep("Workflow Validation", npmCommand(), ["run", "validate"]);
await runStep("Mock Export", npmCommand(), ["run", "export-state"]);
await runStep("Real Export", process.execPath, ["tools/export-state.mjs"], {
  DATA_SOURCE: "real"
});
await runStep("Restore Mock Export", npmCommand(), ["run", "export-state"]);

console.log("\nAll software-poc checks passed.");
