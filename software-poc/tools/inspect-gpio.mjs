import { readFile, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { loadProjectEnv } from "./load-env.mjs";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

async function readTextFile(filePath) {
  try {
    return (await readFile(filePath, "utf8")).trim();
  } catch {
    return null;
  }
}

async function runCommand(command, args) {
  try {
    const result = await execFileAsync(command, args, {
      timeout: 3000,
      maxBuffer: 1024 * 1024
    });
    return result.stdout.trim();
  } catch {
    return null;
  }
}

function printSection(title, lines) {
  console.log(`\n${title}`);
  for (const line of lines) {
    console.log(line);
  }
}

function interestingEnvEntries() {
  const keys = [
    "GPIO_DOCK_DETECT_NUMBER",
    "GPIO_DOCK_DETECT_PATH",
    "GPIO_DOCK_DETECT_CHIP",
    "GPIO_DOCK_DETECT_LINE",
    "GPIO_DOCK_DETECT_ACTIVE_LOW",
    "GPIO_DOCK_DETECT_INVERT",
    "DOCK_INFER_FROM_ETHERNET"
  ];

  return keys
    .filter((key) => process.env[key])
    .map((key) => `- ${key}=${process.env[key]}`);
}

async function gpioChipDevices() {
  try {
    const entries = await readdir("/dev");
    return entries.filter((entry) => entry.startsWith("gpiochip"));
  } catch {
    return [];
  }
}

async function currentMachineHint() {
  const productName = await readTextFile("/sys/class/dmi/id/product_name");
  const sysVendor = await readTextFile("/sys/class/dmi/id/sys_vendor");
  const machine = [sysVendor, productName].filter(Boolean).join(" ").trim();

  if (!machine) {
    return null;
  }

  return machine;
}

function looksVirtualized(machineHint) {
  if (!machineHint) {
    return false;
  }

  return /(virtualbox|vmware|kvm|qemu|virtual machine|hyper-v)/i.test(machineHint);
}

async function gpioInfoCandidates() {
  const output = await runCommand("gpioinfo", []);
  if (!output) {
    return null;
  }

  const matches = output
    .split("\n")
    .filter((line) => /(dock|wake|detect|extcon|hpd|hall|desk)/i.test(line));

  return matches.length > 0 ? matches : [];
}

async function deviceTreeCandidates() {
  const roots = ["/proc/device-tree", "/sys/firmware/devicetree/base"];

  for (const root of roots) {
    const output = await runCommand("grep", ["-R", "-n", "-a", "-i", "dock\\|wake\\|detect\\|extcon", root]);
    if (output) {
      return output.split("\n").slice(0, 20);
    }
  }

  return [];
}

await loadProjectEnv(rootDir);

const machineHint = await currentMachineHint();
const chips = await gpioChipDevices();
const envEntries = interestingEnvEntries();
const gpioCandidates = await gpioInfoCandidates();
const deviceTreeHints = await deviceTreeCandidates();

printSection("Machine", [
  `- ${machineHint ?? "Unknown machine"}`,
  `- Virtualized: ${looksVirtualized(machineHint) ? "yes" : "no"}`
]);

printSection(
  "Current Dock Config",
  envEntries.length > 0 ? envEntries : ["- No dock-related env vars are currently set."]
);

printSection(
  "GPIO Access",
  chips.length > 0
    ? chips.map((chip) => `- /dev/${chip}`)
    : ["- No /dev/gpiochip* devices are visible on this machine."]
);

if (gpioCandidates === null) {
  printSection("Named Line Candidates", [
    "- gpioinfo is not available, so named GPIO lines could not be queried."
  ]);
} else if (gpioCandidates.length === 0) {
  printSection("Named Line Candidates", [
    "- gpioinfo is available, but no line names matched dock/wake/detect keywords."
  ]);
} else {
  printSection("Named Line Candidates", gpioCandidates.map((line) => `- ${line}`));
}

printSection(
  "Device Tree Hints",
  deviceTreeHints.length > 0
    ? deviceTreeHints.map((line) => `- ${line}`)
    : ["- No dock-related device tree strings were found from the visible device-tree roots."]
);

if (chips.length === 0) {
  printSection("Recommendation", [
    "- This environment cannot reveal the real dock GPIO number.",
    "- Run `node tools/inspect-gpio.mjs` on the actual Jetson target after the carrier GPIOs are exposed."
  ]);
} else {
  printSection("Recommendation", [
    "- If one of the candidate lines above looks right, copy it into `software-poc/.env.local` as `GPIO_DOCK_DETECT_NUMBER`, `GPIO_DOCK_DETECT_CHIP` + `GPIO_DOCK_DETECT_LINE`, or `GPIO_DOCK_DETECT_PATH`.",
    "- If the dock signal is active-low, also set `GPIO_DOCK_DETECT_ACTIVE_LOW=1`.",
    "- Re-run `npm run serve:real` and check whether the dock warning clears in the UI."
  ]);
}
