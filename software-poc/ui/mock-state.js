window.MOCK_SCENARIOS = {
  "default": {
    "generatedAt": "2026-03-18T09:45:28.804Z",
    "battery": {
      "percentage": 82,
      "charging": false,
      "warning": false,
      "voltage": 7.78,
      "runtimeMinutes": 210
    },
    "gpio": {
      "screen_power": true,
      "modem_power": true,
      "modem_reset": false,
      "dock_detect": false,
      "wake_request": false
    },
    "backlight": {
      "enabled": true,
      "brightness": 72
    },
    "modem": {
      "present": true,
      "powered": true,
      "sim": "ready",
      "network": "registered",
      "signalDbm": -82,
      "technology": "LTE",
      "carrier": "MockTel",
      "ipAssigned": true
    },
    "thermal": {
      "cpuC": 58,
      "skinC": 39,
      "batteryC": 33,
      "fan": "off"
    },
    "dock": {
      "connected": false,
      "ethernet": false,
      "usbDevices": 0,
      "charging": false,
      "powerBudgetW": 0
    },
    "display": {
      "width": 1280,
      "height": 720,
      "scale": 1,
      "mode": "handheld"
    },
    "keyboard": {
      "connected": true,
      "layout": "uconsole",
      "inputMode": "keyboard"
    }
  },
  "field-lte": {
    "generatedAt": "2026-03-18T09:45:28.807Z",
    "battery": {
      "percentage": 67,
      "charging": false,
      "warning": false,
      "voltage": 7.6,
      "runtimeMinutes": 160
    },
    "gpio": {
      "screen_power": true,
      "modem_power": true,
      "modem_reset": false,
      "dock_detect": false,
      "wake_request": false
    },
    "backlight": {
      "enabled": true,
      "brightness": 72
    },
    "modem": {
      "present": true,
      "powered": true,
      "sim": "ready",
      "network": "attached",
      "signalDbm": -74,
      "technology": "LTE",
      "carrier": "FieldNet",
      "ipAssigned": true
    },
    "thermal": {
      "cpuC": 58,
      "skinC": 39,
      "batteryC": 33,
      "fan": "off"
    },
    "dock": {
      "connected": false,
      "ethernet": false,
      "usbDevices": 0,
      "charging": false,
      "powerBudgetW": 0
    },
    "display": {
      "width": 1280,
      "height": 720,
      "scale": 1,
      "mode": "field"
    },
    "keyboard": {
      "connected": true,
      "layout": "uconsole",
      "inputMode": "keyboard"
    }
  },
  "low-battery": {
    "generatedAt": "2026-03-18T09:45:28.807Z",
    "battery": {
      "percentage": 14,
      "charging": false,
      "warning": true,
      "voltage": 6.97,
      "runtimeMinutes": 24
    },
    "gpio": {
      "screen_power": true,
      "modem_power": true,
      "modem_reset": false,
      "dock_detect": false,
      "wake_request": false
    },
    "backlight": {
      "enabled": true,
      "brightness": 38
    },
    "modem": {
      "present": true,
      "powered": true,
      "sim": "ready",
      "network": "registered",
      "signalDbm": -92,
      "technology": "LTE",
      "carrier": "MockTel",
      "ipAssigned": true
    },
    "thermal": {
      "cpuC": 49,
      "skinC": 39,
      "batteryC": 33,
      "fan": "off"
    },
    "dock": {
      "connected": false,
      "ethernet": false,
      "usbDevices": 0,
      "charging": false,
      "powerBudgetW": 0
    },
    "display": {
      "width": 1280,
      "height": 720,
      "scale": 1,
      "mode": "handheld"
    },
    "keyboard": {
      "connected": true,
      "layout": "uconsole",
      "inputMode": "keyboard"
    }
  },
  "docked-desk": {
    "generatedAt": "2026-03-18T09:45:28.807Z",
    "battery": {
      "percentage": 91,
      "charging": true,
      "warning": false,
      "voltage": 7.89,
      "runtimeMinutes": 999
    },
    "gpio": {
      "screen_power": true,
      "modem_power": true,
      "modem_reset": false,
      "dock_detect": true,
      "wake_request": false
    },
    "backlight": {
      "enabled": true,
      "brightness": 72
    },
    "modem": {
      "present": true,
      "powered": true,
      "sim": "ready",
      "network": "registered",
      "signalDbm": -82,
      "technology": "LTE",
      "carrier": "MockTel",
      "ipAssigned": true
    },
    "thermal": {
      "cpuC": 63,
      "skinC": 36,
      "batteryC": 33,
      "fan": "off"
    },
    "dock": {
      "connected": true,
      "ethernet": true,
      "usbDevices": 3,
      "charging": true,
      "powerBudgetW": 15
    },
    "display": {
      "width": 1280,
      "height": 720,
      "scale": 1,
      "mode": "docked"
    },
    "keyboard": {
      "connected": true,
      "layout": "uconsole",
      "inputMode": "keyboard"
    }
  }
};
