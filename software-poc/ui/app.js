const scenarios = window.MOCK_SCENARIOS ?? {};
const scenarioNames = Object.keys(scenarios);
const app = document.getElementById("app");
const targetViewport = {
  width: 1280,
  height: 720
};

let activeScenario = scenarioNames.includes("default") ? "default" : scenarioNames[0];

function signalQuality(dbm) {
  if (dbm >= -80) return "strong";
  if (dbm >= -90) return "usable";
  return "weak";
}

function workflowChecks(state) {
  return [
    {
      title: "Terminal / Coding",
      status: state.keyboard.connected && state.battery.percentage >= 30 ? "ready" : "at risk",
      note: "Keyboard, battery, and thermal state remain visible for terminal-first work."
    },
    {
      title: "Browser / Docs / Admin",
      status: state.display.width === 1280 && state.display.height === 720 ? "ready" : "at risk",
      note: "Status panels are sized for the target viewport rather than a desktop monitor."
    },
    {
      title: "LTE Field Work",
      status: !state.dock.connected && state.modem.powered ? "ready" : "at risk",
      note: "Handheld mode keeps modem and battery details obvious."
    },
    {
      title: "Docked Desk Mode",
      status: state.dock.connected ? "ready" : "not active",
      note: "Dock state highlights charging, Ethernet, and USB expansion."
    }
  ];
}

function statusClass(status) {
  if (status === "ready") return "status";
  if (status === "not active") return "status warn";
  return "status bad";
}

function sourceHasFallback(source) {
  return typeof source === "string" && source.includes("fallback");
}

function sourceHasUnavailable(source) {
  return (
    typeof source === "string" &&
    (source.includes("unavailable") || source.includes("todo") || source.includes("none"))
  );
}

function sourceHasConfiguredButUnreadable(source) {
  return typeof source === "string" && source.includes("configured-unreadable");
}

function sourceHasUnconfigured(source) {
  return typeof source === "string" && source.includes("unconfigured");
}

function liveHardwareWarnings(state) {
  if (state.dataSource !== "real") {
    return [];
  }

  const warnings = [];

  if (
    state.display.width !== targetViewport.width ||
    state.display.height !== targetViewport.height
  ) {
    warnings.push({
      severity: "warn",
      title: "Viewport mismatch",
      detail:
        `Live display is ${state.display.width}x${state.display.height}. ` +
        `The target handheld contract is ${targetViewport.width}x${targetViewport.height}.`,
      source: state.display.source
    });
  }

  if (!state.keyboard.connected) {
    warnings.push({
      severity: "bad",
      title: "Keyboard not detected",
      detail: "Terminal-first workflows will stay at risk until a keyboard device is visible.",
      source: state.keyboard.source
    });
  } else if (state.keyboard.layout !== "uconsole") {
    warnings.push({
      severity: "warn",
      title: "Keyboard profile is generic",
      detail:
        "Linux found a keyboard, but it does not yet identify as the intended UConsole layout.",
      source: state.keyboard.source
    });
  }

  if (!state.modem.present || !state.modem.powered || sourceHasUnavailable(state.modem.source)) {
    warnings.push({
      severity: "bad",
      title: "Modem telemetry is offline",
      detail:
        "The live HAL could not confirm an attached, powered modem through ModemManager.",
      source: state.modem.source
    });
  }

  if (sourceHasConfiguredButUnreadable(state.dock.detectSource)) {
    warnings.push({
      severity: "bad",
      title: "Dock detect GPIO is configured but unreadable",
      detail:
        "The dock-detect line is configured, but the real HAL could not read a live value from it.",
      source: state.dock.detectSource
    });
  } else if (sourceHasUnconfigured(state.dock.detectSource)) {
    warnings.push({
      severity: "warn",
      title: "Dock detect GPIO is not configured yet",
      detail:
        "Set the real dock-detect line so docked mode comes from carrier-board hardware instead of fallback behavior.",
      source: state.dock.detectSource
    });
  } else if (state.dock.detectionMode === "ethernet-inference") {
    warnings.push({
      severity: "warn",
      title: "Dock state is inferred from Ethernet",
      detail:
        "The current dock status is being inferred, not confirmed by a dedicated dock-detect signal.",
      source: state.dock.source
    });
  }

  if (sourceHasFallback(state.gpio.source)) {
    warnings.push({
      severity: "warn",
      title: "Some GPIO lines still use fallback values",
      detail:
        "At least one non-display control line is still falling back instead of reading live hardware.",
      source: state.gpio.source
    });
  }

  return warnings;
}

function render() {
  const state = scenarios[activeScenario];
  const modemQuality = signalQuality(state.modem.signalDbm);
  const workflows = workflowChecks(state);
  const gpioSignals = Object.entries(state.gpio).filter(([, value]) => typeof value === "boolean");
  const warnings = liveHardwareWarnings(state);

  app.innerHTML = `
    <section class="topbar">
      <div class="headline">
        <div class="eyebrow">Week 1-2 Software PoC</div>
        <h1>UConsole Jetson Validation Surface</h1>
        <p>Targeting a handheld-first Linux experience at ${state.display.width}x${state.display.height} with mock battery, modem, dock, and thermal data.</p>
      </div>
      <div class="meta">
        <div>
          <div class="eyebrow">Scenario</div>
          <div class="scenario-picker">
            ${scenarioNames
              .map(
                (name) => `
                  <button class="scenario-button" data-scenario="${name}" aria-pressed="${name === activeScenario}">
                    ${name}
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
        <div class="chip-row">
          <div class="chip">Source ${state.dataSource ?? "mock"}</div>
          <div class="chip">Display ${state.display.mode}</div>
          <div class="chip">Modem ${state.modem.technology}</div>
          <div class="chip">Dock ${state.dock.connected ? "connected" : "disconnected"}</div>
        </div>
      </div>
    </section>

    ${
      state.dataSource === "real"
        ? `
          <section class="health-panel">
            <div class="health-summary ${warnings.length ? "alert" : "good"}">
              <div class="eyebrow">Live Hardware Checks</div>
              <h2>${warnings.length ? `${warnings.length} warning${warnings.length === 1 ? "" : "s"}` : "Live hardware matches the current contract"}</h2>
              <p>${
                warnings.length
                  ? "These warnings come from the real HAL snapshot feeding the preview."
                  : "No mismatches were detected between the current live snapshot and the Week 1-2 interface contract."
              }</p>
            </div>
            <div class="warning-list">
              ${
                warnings.length
                  ? warnings
                      .map(
                        (warning) => `
                          <article class="warning-card ${warning.severity}">
                            <div class="warning-title-row">
                              <div class="status ${warning.severity === "bad" ? "bad" : "warn"}">${warning.severity === "bad" ? "blocking" : "watch"}</div>
                              <h3>${warning.title}</h3>
                            </div>
                            <p>${warning.detail}</p>
                            <code>${warning.source}</code>
                          </article>
                        `
                      )
                      .join("")
                  : `
                    <article class="warning-card good">
                      <div class="warning-title-row">
                        <div class="status">ready</div>
                        <h3>Live snapshot looks healthy</h3>
                      </div>
                      <p>Keyboard, display, modem, and GPIO sources currently line up with the preview contract.</p>
                      <code>${state.display.source}</code>
                    </article>
                  `
              }
            </div>
          </section>
        `
        : ""
    }

    <section class="metrics">
      <article class="metric">
        <div class="label">Battery</div>
        <strong>${state.battery.percentage}%</strong>
        <p>${state.battery.charging ? "Charging" : "Battery mode"} · ${state.battery.runtimeMinutes} min left</p>
      </article>
      <article class="metric">
        <div class="label">Thermal</div>
        <strong>${state.thermal.cpuC} C</strong>
        <p>Skin ${state.thermal.skinC} C · Battery ${state.thermal.batteryC} C</p>
      </article>
      <article class="metric">
        <div class="label">LTE Signal</div>
        <strong>${state.modem.signalDbm} dBm</strong>
        <p>${modemQuality} · ${state.modem.carrier}</p>
      </article>
      <article class="metric">
        <div class="label">Dock</div>
        <strong>${state.dock.connected ? "Desk" : "Handheld"}</strong>
        <p>${state.dock.usbDevices} USB devices · ${state.dock.ethernet ? "Ethernet up" : "No Ethernet"}</p>
      </article>
    </section>

    <section class="grid">
      <article class="card">
        <h2>Hardware Abstraction Layer Snapshot</h2>
        <div class="card-grid">
          <div class="tile">
            <div class="label">Battery</div>
            <strong>${state.battery.voltage} V</strong>
            <p>${state.battery.warning ? "Low-battery warning armed" : "No warning active"}</p>
          </div>
          <div class="tile">
            <div class="label">Backlight</div>
            <strong>${state.backlight.brightness}%</strong>
            <p>${state.backlight.enabled ? "Panel lit" : "Backlight disabled"}</p>
          </div>
          <div class="tile">
            <div class="label">Keyboard</div>
            <strong>${state.keyboard.connected ? "Connected" : "Missing"}</strong>
            <p>${state.keyboard.layout} · ${state.keyboard.inputMode}</p>
          </div>
          <div class="tile">
            <div class="label">Modem</div>
            <strong>${state.modem.network}</strong>
            <p>SIM ${state.modem.sim} · IP ${state.modem.ipAssigned ? "assigned" : "none"}</p>
          </div>
        </div>
      </article>

      <article class="card">
        <h2>GPIO and Dock Signals</h2>
        <div class="list">
          ${gpioSignals
            .map(
              ([name, value]) => `
                <span>
                  <strong>${name}</strong>
                  <em>${value ? "high" : "low"}</em>
                </span>
              `
            )
            .join("")}
          <span>
            <strong>Dock Power Budget</strong>
            <em>${state.dock.powerBudgetW} W</em>
          </span>
          <span>
            <strong>Viewport</strong>
            <em>${state.display.width}x${state.display.height}</em>
          </span>
        </div>
      </article>
    </section>

    <section class="workflow-list">
      ${workflows
        .map(
          (workflow) => `
            <article class="workflow">
              <div class="${statusClass(workflow.status)}">${workflow.status}</div>
              <h2>${workflow.title}</h2>
              <p>${workflow.note}</p>
            </article>
          `
        )
        .join("")}
    </section>
  `;

  app.querySelectorAll("[data-scenario]").forEach((button) => {
    button.addEventListener("click", () => {
      activeScenario = button.dataset.scenario;
      render();
    });
  });
}

render();
