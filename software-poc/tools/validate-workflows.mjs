import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createScenario } from "../hal/mock-hal.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const reportsDir = path.join(rootDir, "reports");
const reportPath = path.join(reportsDir, "workflow-validation-report.md");

const scenarios = {
  "Terminal / Coding": createScenario("default"),
  "Browser / Docs / Admin": createScenario("default"),
  "LTE Field Work": createScenario("field-lte"),
  "Docked Desk Mode": createScenario("docked-desk"),
  "Low Battery Alerting": createScenario("low-battery"),
  "Modem Outage Handling": createScenario("modem-outage"),
  "Keyboard Disconnect Handling": createScenario("keyboard-disconnected")
};

const checks = [
  {
    workflow: "Terminal / Coding",
    reason: "Needs 1280x720 layout, keyboard input, backlight, and healthy battery headroom.",
    test: (state) =>
      state.display.width === 1280 &&
      state.display.height === 720 &&
      state.keyboard.connected &&
      state.backlight.enabled &&
      state.battery.percentage >= 30
  },
  {
    workflow: "Browser / Docs / Admin",
    reason: "Needs readable status surfaces and available connectivity.",
    test: (state) =>
      state.display.width === 1280 &&
      state.display.height === 720 &&
      (state.modem.network === "registered" || state.modem.network === "attached")
  },
  {
    workflow: "LTE Field Work",
    reason: "Needs a live modem path, handheld mode, and adequate battery.",
    test: (state) =>
      state.modem.present &&
      state.modem.powered &&
      state.modem.signalDbm >= -90 &&
      state.display.mode === "field" &&
      !state.dock.connected
  },
  {
    workflow: "Docked Desk Mode",
    reason: "Needs dock detection, Ethernet, charging, and multiple peripherals.",
    test: (state) =>
      state.dock.connected &&
      state.dock.ethernet &&
      state.dock.usbDevices >= 2 &&
      state.dock.charging
  },
  {
    workflow: "Low Battery Alerting",
    reason: "Needs a warning state and reduced-brightness fallback.",
    test: (state) =>
      state.battery.warning &&
      state.battery.percentage <= 15 &&
      state.backlight.brightness <= 40
  },
  {
    workflow: "Modem Outage Handling",
    reason: "Needs explicit modem fault signals when modem hardware path is unavailable.",
    test: (state) =>
      !state.modem.present &&
      !state.modem.powered &&
      state.modem.sim === "missing" &&
      !state.modem.ipAssigned &&
      !state.gpio.modem_power &&
      state.gpio.modem_reset
  },
  {
    workflow: "Keyboard Disconnect Handling",
    reason: "Needs handheld fallback when keyboard is unavailable.",
    test: (state) =>
      !state.keyboard.connected &&
      state.keyboard.inputMode === "touch" &&
      state.display.mode === "handheld" &&
      state.backlight.enabled
  }
];

const results = checks.map((check) => {
  const state = scenarios[check.workflow];
  return {
    ...check,
    passed: check.test(state)
  };
});

const report = [
  "# Workflow Validation Report",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Summary",
  "",
  ...results.map((result) => {
    const status = result.passed ? "PASS" : "FAIL";
    return `- ${status}: ${result.workflow} - ${result.reason}`;
  }),
  "",
  "## Notes",
  "",
  "- This report validates the mock scenario contract, not real hardware behavior.",
  "- Visual validation at 1280x720 still needs a human pass inside the Ubuntu VM.",
  ""
].join("\n");

await mkdir(reportsDir, { recursive: true });
await writeFile(reportPath, report, "utf8");

console.log(report);
console.log(`Saved report to ${reportPath}`);

if (results.some((result) => !result.passed)) {
  process.exitCode = 1;
}
