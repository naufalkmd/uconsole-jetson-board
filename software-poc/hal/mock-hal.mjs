function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round(value, digits = 1) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

class MockBattery {
  constructor() {
    this.percentage = 82;
    this.charging = false;
    this.warning = false;
    this.voltage = 7.8;
    this.runtimeMinutes = 210;
  }

  snapshot() {
    return {
      percentage: this.percentage,
      charging: this.charging,
      warning: this.warning,
      voltage: this.voltage,
      runtimeMinutes: this.runtimeMinutes
    };
  }
}

class MockGPIO {
  constructor() {
    this.signals = {
      screen_power: true,
      modem_power: true,
      modem_reset: false,
      dock_detect: false,
      wake_request: false
    };
  }

  snapshot() {
    return { ...this.signals };
  }
}

class MockBacklight {
  constructor() {
    this.enabled = true;
    this.brightness = 72;
  }

  snapshot() {
    return {
      enabled: this.enabled,
      brightness: this.brightness
    };
  }
}

class MockModem {
  constructor() {
    this.present = true;
    this.powered = true;
    this.sim = "ready";
    this.network = "registered";
    this.signalDbm = -82;
    this.technology = "LTE";
    this.carrier = "MockTel";
    this.ipAssigned = true;
  }

  snapshot() {
    return {
      present: this.present,
      powered: this.powered,
      sim: this.sim,
      network: this.network,
      signalDbm: this.signalDbm,
      technology: this.technology,
      carrier: this.carrier,
      ipAssigned: this.ipAssigned
    };
  }
}

class MockThermal {
  constructor() {
    this.cpuC = 58;
    this.skinC = 39;
    this.batteryC = 33;
    this.fan = "off";
  }

  snapshot() {
    return {
      cpuC: this.cpuC,
      skinC: this.skinC,
      batteryC: this.batteryC,
      fan: this.fan
    };
  }
}

class MockDock {
  constructor() {
    this.connected = false;
    this.ethernet = false;
    this.usbDevices = 0;
    this.charging = false;
    this.powerBudgetW = 0;
  }

  snapshot() {
    return {
      connected: this.connected,
      ethernet: this.ethernet,
      usbDevices: this.usbDevices,
      charging: this.charging,
      powerBudgetW: this.powerBudgetW
    };
  }
}

class MockDisplay {
  constructor() {
    this.width = 1280;
    this.height = 720;
    this.scale = 1;
    this.mode = "handheld";
  }

  snapshot() {
    return {
      width: this.width,
      height: this.height,
      scale: this.scale,
      mode: this.mode
    };
  }
}

class MockKeyboard {
  constructor() {
    this.connected = true;
    this.layout = "uconsole";
    this.inputMode = "keyboard";
  }

  snapshot() {
    return {
      connected: this.connected,
      layout: this.layout,
      inputMode: this.inputMode
    };
  }
}

export class MockHardwareAbstractionLayer {
  constructor() {
    this.battery = new MockBattery();
    this.gpio = new MockGPIO();
    this.backlight = new MockBacklight();
    this.modem = new MockModem();
    this.thermal = new MockThermal();
    this.dock = new MockDock();
    this.display = new MockDisplay();
    this.keyboard = new MockKeyboard();
  }

  snapshot() {
    return {
      generatedAt: new Date().toISOString(),
      battery: this.battery.snapshot(),
      gpio: this.gpio.snapshot(),
      backlight: this.backlight.snapshot(),
      modem: this.modem.snapshot(),
      thermal: this.thermal.snapshot(),
      dock: this.dock.snapshot(),
      display: this.display.snapshot(),
      keyboard: this.keyboard.snapshot()
    };
  }
}

export function createScenario(name = "default") {
  const hal = new MockHardwareAbstractionLayer();

  switch (name) {
    case "field-lte":
      hal.battery.percentage = 67;
      hal.battery.runtimeMinutes = 160;
      hal.modem.signalDbm = -74;
      hal.modem.carrier = "FieldNet";
      hal.modem.network = "attached";
      hal.display.mode = "field";
      break;
    case "low-battery":
      hal.battery.percentage = 14;
      hal.battery.warning = true;
      hal.battery.runtimeMinutes = 24;
      hal.backlight.brightness = 38;
      hal.thermal.cpuC = 49;
      hal.modem.signalDbm = -92;
      break;
    case "docked-desk":
      hal.battery.percentage = 91;
      hal.battery.charging = true;
      hal.battery.runtimeMinutes = 999;
      hal.gpio.signals.dock_detect = true;
      hal.dock.connected = true;
      hal.dock.ethernet = true;
      hal.dock.usbDevices = 3;
      hal.dock.charging = true;
      hal.dock.powerBudgetW = 15;
      hal.display.mode = "docked";
      hal.thermal.cpuC = 63;
      hal.thermal.skinC = 36;
      break;
    case "modem-outage":
      hal.battery.percentage = 53;
      hal.battery.runtimeMinutes = 120;
      hal.modem.present = false;
      hal.modem.powered = false;
      hal.modem.sim = "missing";
      hal.modem.network = "searching";
      hal.modem.signalDbm = -120;
      hal.modem.ipAssigned = false;
      hal.gpio.signals.modem_power = false;
      hal.gpio.signals.modem_reset = true;
      break;
    case "keyboard-disconnected":
      hal.battery.percentage = 48;
      hal.battery.runtimeMinutes = 95;
      hal.keyboard.connected = false;
      hal.keyboard.inputMode = "touch";
      hal.display.mode = "handheld";
      hal.backlight.brightness = 78;
      break;
    default:
      break;
  }

  hal.backlight.brightness = clamp(hal.backlight.brightness, 0, 100);
  hal.battery.percentage = clamp(hal.battery.percentage, 0, 100);
  hal.battery.voltage = round(6.8 + hal.battery.percentage * 0.012, 2);
  hal.thermal.skinC = round(hal.thermal.skinC, 1);

  return hal.snapshot();
}

export function listScenarios() {
  return [
    "default",
    "field-lte",
    "low-battery",
    "docked-desk",
    "modem-outage",
    "keyboard-disconnected"
  ];
}
