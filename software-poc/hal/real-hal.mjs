import { readFile, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { MockHardwareAbstractionLayer } from "./mock-hal.mjs";

const execFileAsync = promisify(execFile);

async function readTextFile(filePath) {
  try {
    if (filePath.startsWith("/proc/")) {
      const value = await runCommand("cat", [filePath]);
      return value == null ? null : value.trim();
    }

    const value = await readFile(filePath, "utf8");
    return value.trim();
  } catch {
    return null;
  }
}

async function readNumberFile(filePath, divisor = 1) {
  const value = await readTextFile(filePath);

  if (value == null) {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed / divisor;
}

async function readBooleanFile(filePath) {
  const value = await readTextFile(filePath);
  if (value == null) {
    return null;
  }

  const normalized = value.toLowerCase();
  if (["1", "y", "yes", "on", "enabled", "high", "active", "true"].includes(normalized)) {
    return true;
  }

  if (["0", "n", "no", "off", "disabled", "low", "inactive", "false"].includes(normalized)) {
    return false;
  }

  const parsed = Number(normalized);
  if (!Number.isNaN(parsed)) {
    return parsed !== 0;
  }

  return null;
}

async function runCommand(command, args) {
  const label = `${command} ${args.join(" ")}`.trim();
  const startedAt = Date.now();
  traceProbe(`command start ${label}`);

  try {
    const result = await execFileAsync(command, args, {
      timeout: 2000,
      maxBuffer: 1024 * 1024
    });
    const durationMs = roundDuration(Date.now() - startedAt);
    traceProbe(`command done ${label} in ${durationMs}ms`);
    return result.stdout.trim();
  } catch {
    const durationMs = roundDuration(Date.now() - startedAt);
    traceProbe(`command failed ${label} in ${durationMs}ms`);
    return null;
  }
}

function parseJson(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseKeyValueOutput(text) {
  const entries = {};

  for (const line of text.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key) {
      entries[key] = value;
    }
  }

  return entries;
}

function pickFirstValue(record, keys) {
  for (const key of keys) {
    if (record[key]) {
      return record[key];
    }
  }

  return null;
}

function parseNumericValue(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/-?\d+(\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);
  return Number.isNaN(parsed) ? null : parsed;
}

function signalEnvPrefix(signalName) {
  return `GPIO_${signalName.toUpperCase()}`;
}

function signalAliases(signalName) {
  return [signalName, signalName.replace(/_/g, "-"), signalName.replace(/_/g, "")];
}

function signalConfig(signalName) {
  const envPrefix = signalEnvPrefix(signalName);

  return {
    directPath: readStringFromEnv(`${envPrefix}_PATH`),
    chip: readStringFromEnv(`${envPrefix}_CHIP`),
    line: readStringFromEnv(`${envPrefix}_LINE`),
    gpioNumber: readNumberFromEnv(`${envPrefix}_NUMBER`),
    invert:
      readBooleanFromEnv(`${envPrefix}_INVERT`) ??
      readBooleanFromEnv(`${envPrefix}_ACTIVE_LOW`) ??
      false
  };
}

function hasExplicitSignalConfig(config) {
  return Boolean(
    config.directPath ||
      (config.chip && config.line) ||
      config.gpioNumber != null
  );
}

function applySignalPolarity(value, invert) {
  return invert ? !value : value;
}

function annotateSignalSource(source, invert) {
  return invert ? `${source}; invert=true` : source;
}

function extractSignalSource(summary, signalName) {
  if (typeof summary !== "string") {
    return "unknown";
  }

  const prefix = `${signalName}=`;

  for (const part of summary.split("; ")) {
    if (part.startsWith(prefix)) {
      return part.slice(prefix.length);
    }
  }

  return summary;
}

function parseGpioFindOutput(output) {
  if (!output) {
    return null;
  }

  const match = output.match(/(gpiochip\S+)\s+(\d+)/);
  if (!match) {
    return null;
  }

  return {
    chip: match[1],
    line: match[2]
  };
}

function parseGpioValue(output) {
  if (!output) {
    return null;
  }

  const trimmed = output.trim();
  if (trimmed === "0") {
    return false;
  }

  if (trimmed === "1") {
    return true;
  }

  const match = trimmed.match(/(^|[=\s])([01])(\s|$)/);
  if (!match) {
    return null;
  }

  return match[2] === "1";
}

function readNumberFromEnv(envName) {
  const value = process.env[envName];
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function readBooleanFromEnv(envName) {
  const value = process.env[envName];
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

function readStringFromEnv(envName) {
  const value = process.env[envName];
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function isTraceEnabled() {
  return readBooleanFromEnv("REAL_HAL_TRACE") ?? false;
}

function traceProbe(message) {
  if (isTraceEnabled()) {
    console.error(`[real-hal] ${message}`);
  }
}

function roundDuration(durationMs) {
  return Math.round(durationMs * 10) / 10;
}

function createProbeRecorder() {
  const probes = [];

  return {
    probes,
    async measure(name, action) {
      const startedAt = Date.now();
      traceProbe(`start ${name}`);

      try {
        const value = await action();
        const durationMs = roundDuration(Date.now() - startedAt);
        probes.push({
          name,
          durationMs,
          status: "ok"
        });
        traceProbe(`done ${name} in ${durationMs}ms`);
        return value;
      } catch (error) {
        const durationMs = roundDuration(Date.now() - startedAt);
        probes.push({
          name,
          durationMs,
          status: "error",
          error: error instanceof Error ? error.message : String(error)
        });
        traceProbe(`error ${name} in ${durationMs}ms`);
        throw error;
      }
    }
  };
}

function parseResolutionString(value) {
  if (!value) {
    return null;
  }

  const match = value.match(/(\d+)\D+(\d+)/);
  if (!match) {
    return null;
  }

  return {
    width: Number(match[1]),
    height: Number(match[2])
  };
}

async function readGpioSignal(signalName, fallback) {
  const config = signalConfig(signalName);

  if (config.directPath) {
    const value = await readBooleanFile(config.directPath);
    if (value != null) {
      return {
        value: applySignalPolarity(value, config.invert),
        source: annotateSignalSource(`path:${config.directPath}`, config.invert)
      };
    }
  }

  if (config.chip && config.line) {
    const value = parseGpioValue(await runCommand("gpioget", [config.chip, config.line]));
    if (value != null) {
      return {
        value: applySignalPolarity(value, config.invert),
        source: annotateSignalSource(
          `gpioget:${config.chip}:${config.line}`,
          config.invert
        )
      };
    }
  }

  if (config.gpioNumber != null) {
    const sysfsPath = `/sys/class/gpio/gpio${config.gpioNumber}/value`;
    const value = await readBooleanFile(sysfsPath);
    if (value != null) {
      return {
        value: applySignalPolarity(value, config.invert),
        source: annotateSignalSource(`sysfs:${sysfsPath}`, config.invert)
      };
    }
  }

  for (const alias of signalAliases(signalName)) {
    const gpioLine = parseGpioFindOutput(await runCommand("gpiofind", [alias]));
    if (!gpioLine) {
      continue;
    }

    const value = parseGpioValue(await runCommand("gpioget", [gpioLine.chip, gpioLine.line]));
    if (value != null) {
      return {
        value: applySignalPolarity(value, config.invert),
        source: annotateSignalSource(
          `gpioget:${gpioLine.chip}:${gpioLine.line}:${alias}`,
          config.invert
        )
      };
    }
  }

  return {
    value: fallback,
    source: annotateSignalSource(
      hasExplicitSignalConfig(config) ? "fallback:configured-unreadable" : "fallback:unconfigured",
      config.invert
    )
  };
}

function summarizeSignalSources(sources) {
  const uniqueSources = [...new Set(Object.values(sources))];
  if (uniqueSources.length === 1) {
    return uniqueSources[0];
  }

  return Object.entries(sources)
    .map(([signalName, source]) => `${signalName}=${source}`)
    .join("; ");
}

async function readEthernetCarrier() {
  let interfaces;
  try {
    interfaces = await readdir("/sys/class/net");
  } catch {
    return {
      value: false,
      source: "sysfs:/sys/class/net:unavailable"
    };
  }

  for (const interfaceName of interfaces) {
    if (
      interfaceName === "lo" ||
      interfaceName.startsWith("wl") ||
      interfaceName.startsWith("ww")
    ) {
      continue;
    }

    if (!interfaceName.startsWith("en") && !interfaceName.startsWith("eth")) {
      continue;
    }

    const carrierPath = `/sys/class/net/${interfaceName}/carrier`;
    const carrier = await readBooleanFile(carrierPath);
    if (carrier) {
      return {
        value: true,
        source: `sysfs:${carrierPath}`
      };
    }
  }

  return {
    value: false,
    source: "sysfs:/sys/class/net:no-ethernet-carrier"
  };
}

async function countUsbDevices() {
  let entries;
  try {
    entries = await readdir("/sys/bus/usb/devices");
  } catch {
    return {
      value: 0,
      source: "sysfs:/sys/bus/usb/devices:unavailable"
    };
  }

  let count = 0;
  for (const entry of entries) {
    if (!/^\d+(-\d+(\.\d+)*)?$/.test(entry)) {
      continue;
    }

    const basePath = `/sys/bus/usb/devices/${entry}`;
    const vendor = await readTextFile(`${basePath}/idVendor`);
    const product = await readTextFile(`${basePath}/idProduct`);
    if (vendor && product) {
      count += 1;
    }
  }

  return {
    value: count,
    source: "sysfs:/sys/bus/usb/devices"
  };
}

function firstModemPath(listPayload) {
  const modemList = listPayload?.["modem-list"];
  if (!Array.isArray(modemList) || modemList.length === 0) {
    return null;
  }

  const first = modemList[0];
  if (typeof first === "string") {
    return first;
  }

  if (typeof first === "object" && first != null) {
    for (const value of Object.values(first)) {
      if (typeof value === "string" && value.startsWith("/")) {
        return value;
      }
    }
  }

  return null;
}

function networkFromStates(packetServiceState, registrationState, modemState, fallback) {
  const packet = packetServiceState?.toLowerCase() ?? "";
  const registration = registrationState?.toLowerCase() ?? "";
  const state = modemState?.toLowerCase() ?? "";

  if (packet.includes("attached")) {
    return "attached";
  }

  if (
    registration.includes("home") ||
    registration.includes("roaming") ||
    registration.includes("registered") ||
    state.includes("registered") ||
    state.includes("connected")
  ) {
    return "registered";
  }

  if (registration.includes("search") || state.includes("search")) {
    return "searching";
  }

  return fallback;
}

function powerStateToBoolean(powerState, fallback) {
  const normalized = powerState?.toLowerCase() ?? "";

  if (!normalized) {
    return fallback;
  }

  if (normalized.includes("on") || normalized.includes("low")) {
    return true;
  }

  if (normalized.includes("off")) {
    return false;
  }

  return fallback;
}

function simStateFromValue(simValue, fallback) {
  const normalized = simValue?.toLowerCase() ?? "";

  if (!normalized) {
    return fallback;
  }

  if (normalized === "none" || normalized.includes("missing")) {
    return "missing";
  }

  if (normalized.includes("lock") || normalized.includes("pin")) {
    return "locked";
  }

  return "ready";
}

function signalQualityToDbm(qualityPercent, fallback) {
  if (qualityPercent == null) {
    return fallback;
  }

  return Math.round(-110 + qualityPercent * 0.4);
}

function modemUnavailableState(fallback, reason) {
  return {
    ...fallback,
    present: false,
    powered: false,
    sim: "unknown",
    network: "unknown",
    signalDbm: -120,
    carrier: "Unavailable",
    ipAssigned: false,
    source: reason
  };
}

async function readBatteryState(fallback) {
  const percentage = await readNumberFile("/sys/class/power_supply/BAT0/capacity");
  const voltage = await readNumberFile("/sys/class/power_supply/BAT0/voltage_now", 1000000);
  const status = await readTextFile("/sys/class/power_supply/BAT0/status");

  return {
    ...fallback,
    percentage: percentage ?? fallback.percentage,
    voltage: voltage ?? fallback.voltage,
    charging: status === "Charging" ? true : status === "Discharging" ? false : fallback.charging,
    source: "sysfs:/sys/class/power_supply/BAT0"
  };
}

async function readThermalState(fallback) {
  const cpuC = await readNumberFile("/sys/class/thermal/thermal_zone0/temp", 1000);

  return {
    ...fallback,
    cpuC: cpuC ?? fallback.cpuC,
    source: "sysfs:/sys/class/thermal"
  };
}

async function readBacklightState(fallback) {
  const brightness = await readNumberFile("/sys/class/backlight/backlight/brightness");
  const maxBrightness = await readNumberFile("/sys/class/backlight/backlight/max_brightness");

  let computedBrightness = fallback.brightness;
  if (brightness != null && maxBrightness && maxBrightness > 0) {
    computedBrightness = Math.round((brightness / maxBrightness) * 100);
  }

  return {
    ...fallback,
    brightness: computedBrightness,
    enabled: computedBrightness > 0,
    source: "sysfs:/sys/class/backlight"
  };
}

function framebufferDisplayStateFromInputs(virtualSize, modes) {
  const parsedVirtualSize = virtualSize ? parseResolutionString(virtualSize.replace(",", "x")) : null;

  if (parsedVirtualSize) {
    return {
      ...parsedVirtualSize,
      source: "sysfs:/sys/class/graphics/fb0/virtual_size"
    };
  }

  const parsedFramebufferMode = parseResolutionString(modes?.split("\n")[0] ?? null);

  if (parsedFramebufferMode) {
    return {
      ...parsedFramebufferMode,
      source: "sysfs:/sys/class/graphics/fb0/modes"
    };
  }

  return null;
}

async function readFramebufferDisplayState() {
  const virtualSize = await readTextFile("/sys/class/graphics/fb0/virtual_size");
  const modes = await readTextFile("/sys/class/graphics/fb0/modes");
  return framebufferDisplayStateFromInputs(virtualSize, modes);
}

function drmDisplayStateFromInputs({ connector, status, enabled, modes }) {
  if (status !== "connected" || enabled !== "enabled") {
    return null;
  }

  const parsedMode = parseResolutionString(modes?.split("\n")[0] ?? null);
  if (!parsedMode) {
    return null;
  }

  return {
    ...parsedMode,
    source: `sysfs:/sys/class/drm/${connector}`
  };
}

async function readDrmDisplayState() {
  let entries;
  try {
    entries = await readdir("/sys/class/drm");
  } catch {
    return null;
  }

  const connectors = entries.filter(
    (entry) => entry.includes("-") && !entry.startsWith("render")
  );

  for (const connector of connectors) {
    const status = await readTextFile(`/sys/class/drm/${connector}/status`);
    const enabled = await readTextFile(`/sys/class/drm/${connector}/enabled`);
    const modes = await readTextFile(`/sys/class/drm/${connector}/modes`);
    const drmState = drmDisplayStateFromInputs({
      connector,
      status,
      enabled,
      modes
    });
    if (drmState) {
      return drmState;
    }
  }

  return null;
}

function parseXrandrDisplayState(output) {
  if (!output) {
    return null;
  }

  for (const line of output.split("\n")) {
    const match = line.match(/ connected(?: primary)? (\d+)x(\d+)\+\d+\+\d+/);
    if (!match) {
      continue;
    }

    return {
      width: Number(match[1]),
      height: Number(match[2]),
      source: "xrandr:current"
    };
  }

  return null;
}

function buildDisplaySnapshot(
  fallback,
  {
    dockConnected,
    envWidth,
    envHeight,
    envScale,
    envMode,
    xrandrState,
    framebufferState,
    drmState
  }
) {
  const detectedDisplay = xrandrState ?? framebufferState ?? drmState;
  const sourceParts = [];
  if (envWidth != null || envHeight != null || envScale != null || envMode) {
    sourceParts.push("env");
  }
  sourceParts.push(detectedDisplay?.source ?? "fallback");

  return {
    ...fallback,
    width: envWidth ?? detectedDisplay?.width ?? fallback.width,
    height: envHeight ?? detectedDisplay?.height ?? fallback.height,
    scale: envScale ?? fallback.scale,
    mode: envMode ?? (dockConnected ? "docked" : "handheld"),
    source: sourceParts.join("; ")
  };
}

async function readDisplayState(fallback, dock) {
  const envWidth = readNumberFromEnv("DISPLAY_WIDTH");
  const envHeight = readNumberFromEnv("DISPLAY_HEIGHT");
  const envScale = readNumberFromEnv("DISPLAY_SCALE");
  const envMode = readStringFromEnv("DISPLAY_MODE");

  const xrandrState = parseXrandrDisplayState(await runCommand("xrandr", ["--current"]));
  const framebufferState = await readFramebufferDisplayState();
  const drmState = await readDrmDisplayState();

  return buildDisplaySnapshot(fallback, {
    dockConnected: dock.connected,
    envWidth,
    envHeight,
    envScale,
    envMode,
    xrandrState,
    framebufferState,
    drmState
  });
}

function parseInputDeviceBlocks(contents) {
  if (!contents) {
    return [];
  }

  return contents
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const device = {};

      for (const line of block.split("\n")) {
        if (line.startsWith('N: Name="')) {
          device.name = line.slice(9, -1);
          continue;
        }

        if (line.startsWith("H: Handlers=")) {
          device.handlers = line.slice(12).trim().split(/\s+/);
        }
      }

      return device;
    });
}

function isKeyboardLikeDevice(device) {
  if (!device.name || !device.handlers?.includes("kbd")) {
    return false;
  }

  const normalizedName = device.name.toLowerCase();
  return ![
    "power button",
    "sleep button",
    "video bus",
    "lid switch"
  ].includes(normalizedName);
}

function isTouchLikeDevice(device) {
  const normalizedName = device.name?.toLowerCase() ?? "";
  return (
    normalizedName.includes("touch") ||
    normalizedName.includes("tablet") ||
    normalizedName.includes("digitizer")
  );
}

function selectKeyboardDevice(devices, preferredHint) {
  const keyboards = devices.filter(isKeyboardLikeDevice);
  if (keyboards.length === 0) {
    return null;
  }

  if (preferredHint) {
    const normalizedHint = preferredHint.toLowerCase();
    const matched = keyboards.find((device) =>
      device.name.toLowerCase().includes(normalizedHint)
    );
    if (matched) {
      return matched;
    }
  }

  return keyboards[0];
}

function buildKeyboardSnapshot(
  fallback,
  { envConnected, envLayout, envInputMode, nameHint, inputDevices }
) {
  const keyboardDevice = selectKeyboardDevice(inputDevices, nameHint);
  const hasTouchInput = inputDevices.some(isTouchLikeDevice);
  const connected = envConnected ?? Boolean(keyboardDevice);
  const derivedLayout = keyboardDevice
    ? keyboardDevice.name.toLowerCase().includes("uconsole")
      ? "uconsole"
      : "generic"
    : fallback.layout;

  return {
    ...fallback,
    connected,
    layout: envLayout ?? derivedLayout,
    inputMode:
      envInputMode ??
      (connected ? "keyboard" : hasTouchInput ? "touch" : fallback.inputMode),
    source:
      envConnected != null || envLayout || envInputMode || nameHint
        ? "env; procfs:/proc/bus/input/devices"
        : "procfs:/proc/bus/input/devices"
  };
}

async function readKeyboardState(fallback) {
  const envConnected = readBooleanFromEnv("KEYBOARD_CONNECTED");
  const envLayout = readStringFromEnv("KEYBOARD_LAYOUT");
  const envInputMode = readStringFromEnv("KEYBOARD_INPUT_MODE");
  const nameHint = readStringFromEnv("KEYBOARD_NAME_HINT");
  const inputDevices = parseInputDeviceBlocks(await readTextFile("/proc/bus/input/devices"));

  return buildKeyboardSnapshot(fallback, {
    envConnected,
    envLayout,
    envInputMode,
    nameHint,
    inputDevices
  });
}

function buildDockSnapshot(
  fallback,
  { gpio, battery, ethernet, usbDevices, allowEthernetInference, powerBudgetW }
) {
  const dockDetectSource = extractSignalSource(gpio.source, "dock_detect");
  const inferredFromEthernet = !gpio.dock_detect && allowEthernetInference && ethernet.value;
  const connected = gpio.dock_detect || inferredFromEthernet;

  return {
    ...fallback,
    connected,
    ethernet: connected ? ethernet.value : false,
    usbDevices: connected ? usbDevices.value : 0,
    charging: connected ? battery.charging : false,
    powerBudgetW: powerBudgetW ?? fallback.powerBudgetW,
    detectSource: dockDetectSource,
    detectionMode: gpio.dock_detect ? "gpio" : inferredFromEthernet ? "ethernet-inference" : "gpio",
    source:
      `dock_detect=${gpio.dock_detect}; ` +
      `dock_detect_source=${dockDetectSource}; ` +
      `ethernet_inference=${allowEthernetInference}; ` +
      `ethernet=${ethernet.source}; usb=${usbDevices.source}`
  };
}

async function readDockState(fallback, gpio, battery) {
  const ethernet = await readEthernetCarrier();
  const allowEthernetInference = readBooleanFromEnv("DOCK_INFER_FROM_ETHERNET") ?? false;
  const usbDevices = gpio.dock_detect || (allowEthernetInference && ethernet.value)
    ? await countUsbDevices()
    : {
        value: 0,
        source: "derived:not-docked"
      };
  const configuredPowerBudget = readNumberFromEnv("DOCK_POWER_BUDGET_W");

  return buildDockSnapshot(fallback, {
    gpio,
    battery,
    ethernet,
    usbDevices,
    allowEthernetInference,
    powerBudgetW: configuredPowerBudget
  });
}

async function readGpioState(fallback) {
  const signalNames = Object.keys(fallback);
  const resolvedSignals = await Promise.all(
    signalNames.map(async (signalName) => {
      const result = await readGpioSignal(signalName, fallback[signalName]);
      return [signalName, result];
    })
  );

  const nextState = {};
  const sources = {};
  for (const [signalName, result] of resolvedSignals) {
    nextState[signalName] = result.value;
    sources[signalName] = result.source;
  }

  return {
    ...nextState,
    source: summarizeSignalSources(sources)
  };
}

function buildModemSnapshot(
  fallback,
  { modemListOutput, modemDetailsOutput, signalOutput }
) {
  const modemList = parseJson(modemListOutput);

  if (!modemList) {
    return modemUnavailableState(fallback, "mmcli:unavailable");
  }

  const modemPath = firstModemPath(modemList);
  if (!modemPath) {
    return {
      ...fallback,
      present: false,
      powered: false,
      sim: "missing",
      network: "searching",
      signalDbm: -120,
      carrier: "No modem detected",
      ipAssigned: false,
      source: "mmcli:none"
    };
  }

  if (!modemDetailsOutput) {
    return modemUnavailableState(fallback, `mmcli:${modemPath}:unavailable`);
  }

  const modemDetails = parseKeyValueOutput(modemDetailsOutput);
  const signalDetails = signalOutput ? parseKeyValueOutput(signalOutput) : {};

  const qualityPercent = parseNumericValue(
    pickFirstValue(modemDetails, [
      "modem.generic.signal-quality.value",
      "modem.status.signal-quality.value"
    ])
  );

  const measuredDbm = parseNumericValue(
    pickFirstValue(signalDetails, [
      "modem.signal.lte.rsrp",
      "modem.signal.nr5g.rsrp",
      "modem.signal.umts.rscp",
      "modem.signal.gsm.rssi",
      "modem.signal.cdma.rssi"
    ])
  );

  const packetServiceState = pickFirstValue(modemDetails, [
    "modem.3gpp.packet-service-state",
    "modem.status.packet-service-state"
  ]);

  const registrationState = pickFirstValue(modemDetails, [
    "modem.3gpp.registration-state",
    "modem.status.registration-state"
  ]);

  const modemState = pickFirstValue(modemDetails, [
    "modem.generic.state",
    "modem.status.state"
  ]);

  const powerState = pickFirstValue(modemDetails, [
    "modem.generic.power-state",
    "modem.status.power-state"
  ]);

  const carrier = pickFirstValue(modemDetails, [
    "modem.3gpp.operator-name",
    "modem.generic.operator-name"
  ]);

  const accessTechnology = pickFirstValue(modemDetails, [
    "modem.generic.access-technologies",
    "modem.status.access-technologies",
    "modem.generic.access-technology"
  ]);

  const simValue = pickFirstValue(modemDetails, [
    "modem.generic.sim",
    "modem.sim.path",
    "modem.sim.active"
  ]);

  const network = networkFromStates(
    packetServiceState,
    registrationState,
    modemState,
    fallback.network
  );

  const ipAssigned =
    packetServiceState?.toLowerCase().includes("attached") ||
    network === "attached" ||
    fallback.ipAssigned;

  return {
    ...fallback,
    present: true,
    powered: powerStateToBoolean(powerState, fallback.powered),
    sim: simStateFromValue(simValue, fallback.sim),
    network,
    signalDbm:
      measuredDbm ??
      signalQualityToDbm(qualityPercent, fallback.signalDbm),
    technology: accessTechnology ?? fallback.technology,
    carrier: carrier ?? fallback.carrier,
    ipAssigned,
    source: `mmcli:${modemPath}`
  };
}

async function readModemState(fallback) {
  const modemListOutput = await runCommand("mmcli", ["-L", "-J"]);
  const modemList = parseJson(modemListOutput);

  if (!modemList) {
    return modemUnavailableState(fallback, "mmcli:unavailable");
  }

  const modemPath = firstModemPath(modemList);
  const modemDetailsOutput = modemPath
    ? await runCommand("mmcli", ["-m", modemPath, "-K"])
    : null;
  const signalOutput = modemPath
    ? await runCommand("mmcli", ["-m", modemPath, "--signal-get", "-K"])
    : null;

  return buildModemSnapshot(fallback, {
    modemListOutput,
    modemDetailsOutput,
    signalOutput
  });
}

function attachMetadata(state, dataSource, notes) {
  return {
    ...state,
    generatedAt: new Date().toISOString(),
    dataSource,
    integrationNotes: notes
  };
}

export class RealHardwareAbstractionLayer extends MockHardwareAbstractionLayer {
  constructor() {
    super();
  }

  async snapshot() {
    const fallback = super.snapshot();
    const recorder = createProbeRecorder();

    const [battery, gpio, backlight, modem, thermal, keyboard] =
      await Promise.all([
        recorder.measure("battery", () => readBatteryState(fallback.battery)),
        recorder.measure("gpio", () => readGpioState(fallback.gpio)),
        recorder.measure("backlight", () => readBacklightState(fallback.backlight)),
        recorder.measure("modem", () => readModemState(fallback.modem)),
        recorder.measure("thermal", () => readThermalState(fallback.thermal)),
        recorder.measure("keyboard", () => readKeyboardState(fallback.keyboard))
      ]);
    const dock = await recorder.measure("dock", () =>
      readDockState(fallback.dock, gpio, battery)
    );
    const display = await recorder.measure("display", () =>
      readDisplayState(fallback.display, dock)
    );

    return attachMetadata(
      {
        battery,
        gpio,
        backlight,
        modem,
        thermal,
        dock,
        display,
        keyboard,
        diagnostics: {
          probeTimingsMs: recorder.probes,
          tracingEnabled: isTraceEnabled()
        }
      },
      "real",
      [
        "Battery, backlight, and thermal fields attempt sysfs reads first.",
        "Modem fields attempt ModemManager reads through mmcli and then normalize back into the mock snapshot shape.",
        "GPIO fields attempt named libgpiod reads first, then env-configured sysfs paths, before falling back to mock values.",
        "Dock state is derived from dock-detect GPIO plus Ethernet and USB enumeration.",
        "Keyboard state is derived from /proc/bus/input/devices with optional env overrides.",
        "Display size is derived from xrandr, framebuffer, or DRM state with optional env overrides.",
        "Set REAL_HAL_TRACE=1 to print per-probe timing while exporting or serving real-mode state.",
        "Keep this snapshot shape aligned with mock-hal.mjs so the UI can swap providers without code changes."
      ]
    );
  }
}

export async function createRealSnapshot() {
  const hal = new RealHardwareAbstractionLayer();
  return hal.snapshot();
}

export const __test__ = {
  parseJson,
  parseKeyValueOutput,
  pickFirstValue,
  parseNumericValue,
  parseResolutionString,
  parseGpioFindOutput,
  parseGpioValue,
  parseXrandrDisplayState,
  parseInputDeviceBlocks,
  isKeyboardLikeDevice,
  isTouchLikeDevice,
  selectKeyboardDevice,
  firstModemPath,
  networkFromStates,
  powerStateToBoolean,
  simStateFromValue,
  signalQualityToDbm,
  extractSignalSource,
  framebufferDisplayStateFromInputs,
  drmDisplayStateFromInputs,
  buildDisplaySnapshot,
  buildKeyboardSnapshot,
  buildDockSnapshot,
  buildModemSnapshot
};
