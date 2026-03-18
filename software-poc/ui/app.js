const scenarios = window.MOCK_SCENARIOS ?? {};
const scenarioNames = Object.keys(scenarios);
const app = document.getElementById("app");

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

function render() {
  const state = scenarios[activeScenario];
  const modemQuality = signalQuality(state.modem.signalDbm);
  const workflows = workflowChecks(state);

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
          <div class="chip">Display ${state.display.mode}</div>
          <div class="chip">Modem ${state.modem.technology}</div>
          <div class="chip">Dock ${state.dock.connected ? "connected" : "disconnected"}</div>
        </div>
      </div>
    </section>

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
          ${Object.entries(state.gpio)
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
