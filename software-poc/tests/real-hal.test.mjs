import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createScenario } from "../hal/mock-hal.mjs";
import { __test__ } from "../hal/real-hal.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, "fixtures", "real-hal");

async function readFixture(fileName) {
  return readFile(path.join(fixtureDir, fileName), "utf8");
}

test("buildDisplaySnapshot prefers xrandr fixture output", async () => {
  const fallback = createScenario("default").display;
  const xrandrOutput = await readFixture("xrandr-handheld.txt");

  const display = __test__.buildDisplaySnapshot(fallback, {
    dockConnected: false,
    envWidth: null,
    envHeight: null,
    envScale: null,
    envMode: null,
    xrandrState: __test__.parseXrandrDisplayState(xrandrOutput),
    framebufferState: __test__.framebufferDisplayStateFromInputs("1280,800", null),
    drmState: null
  });

  assert.equal(display.width, 1280);
  assert.equal(display.height, 720);
  assert.equal(display.mode, "handheld");
  assert.equal(display.source, "xrandr:current");
});

test("buildKeyboardSnapshot labels generic keyboard fixtures as generic", async () => {
  const fallback = createScenario("default").keyboard;
  const inputDevices = __test__.parseInputDeviceBlocks(
    await readFixture("proc-input-generic.txt")
  );

  const keyboard = __test__.buildKeyboardSnapshot(fallback, {
    envConnected: null,
    envLayout: null,
    envInputMode: null,
    nameHint: null,
    inputDevices
  });

  assert.equal(keyboard.connected, true);
  assert.equal(keyboard.layout, "generic");
  assert.equal(keyboard.inputMode, "keyboard");
  assert.equal(keyboard.source, "procfs:/proc/bus/input/devices");
});

test("buildKeyboardSnapshot preserves uconsole layout from fixtures", async () => {
  const fallback = createScenario("default").keyboard;
  const inputDevices = __test__.parseInputDeviceBlocks(
    await readFixture("proc-input-uconsole.txt")
  );

  const keyboard = __test__.buildKeyboardSnapshot(fallback, {
    envConnected: null,
    envLayout: null,
    envInputMode: null,
    nameHint: null,
    inputDevices
  });

  assert.equal(keyboard.connected, true);
  assert.equal(keyboard.layout, "uconsole");
  assert.equal(keyboard.inputMode, "keyboard");
});

test("buildModemSnapshot maps mmcli LTE fixtures into the HAL snapshot shape", async () => {
  const fallback = createScenario("default").modem;

  const modem = __test__.buildModemSnapshot(fallback, {
    modemListOutput: await readFixture("mmcli-list-single.json"),
    modemDetailsOutput: await readFixture("mmcli-modem-lte.kv"),
    signalOutput: await readFixture("mmcli-signal-lte.kv")
  });

  assert.equal(modem.present, true);
  assert.equal(modem.powered, true);
  assert.equal(modem.sim, "ready");
  assert.equal(modem.network, "attached");
  assert.equal(modem.signalDbm, -79);
  assert.equal(modem.technology, "lte");
  assert.equal(modem.carrier, "FieldNet");
  assert.equal(modem.ipAssigned, true);
  assert.equal(modem.source, "mmcli:/org/freedesktop/ModemManager1/Modem/0");
});

test("buildModemSnapshot reports missing hardware when the modem list fixture is empty", async () => {
  const fallback = createScenario("default").modem;

  const modem = __test__.buildModemSnapshot(fallback, {
    modemListOutput: await readFixture("mmcli-list-empty.json"),
    modemDetailsOutput: null,
    signalOutput: null
  });

  assert.equal(modem.present, false);
  assert.equal(modem.powered, false);
  assert.equal(modem.sim, "missing");
  assert.equal(modem.network, "searching");
  assert.equal(modem.carrier, "No modem detected");
  assert.equal(modem.source, "mmcli:none");
});

test("buildDockSnapshot marks Ethernet inference separately from live dock-detect GPIO", () => {
  const fallback = createScenario("default").dock;

  const dock = __test__.buildDockSnapshot(fallback, {
    gpio: {
      dock_detect: false,
      source: "screen_power=fallback:unconfigured; dock_detect=fallback:unconfigured"
    },
    battery: {
      charging: true
    },
    ethernet: {
      value: true,
      source: "sysfs:/sys/class/net/enp0s3/carrier"
    },
    usbDevices: {
      value: 3,
      source: "sysfs:/sys/bus/usb/devices"
    },
    allowEthernetInference: true,
    powerBudgetW: 15
  });

  assert.equal(dock.connected, true);
  assert.equal(dock.detectionMode, "ethernet-inference");
  assert.equal(dock.detectSource, "fallback:unconfigured");
  assert.equal(dock.powerBudgetW, 15);
});

