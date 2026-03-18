# Software PoC Workspace

This folder turns the README's Week 1-2 plan into concrete artifacts:

1. Ubuntu 22.04 VM setup guidance at `1280x720`
2. A mock hardware abstraction layer for battery, modem, backlight, GPIO, thermal, dock, and display state
3. A lightweight UI preview and workflow validation harness

## Quick Start

1. Generate the mock scenario bundle:

   ```powershell
   node tools/export-state.mjs
   ```

2. Preview the UI locally:

   ```powershell
   node tools/dev-server.mjs
   ```

3. Validate the workflow scenarios:

   ```powershell
   node tools/validate-workflows.mjs
   ```

## Folder Layout

- `docs/ubuntu-22.04-vm-setup.md`: recommended VM profile and host setup
- `docs/workflow-validation.md`: manual validation checklist for the target workflows
- `hal/mock-hal.mjs`: mock hardware abstraction layer
- `tools/export-state.mjs`: generates UI-friendly mock scenario data
- `tools/dev-server.mjs`: serves the preview UI
- `tools/validate-workflows.mjs`: writes a workflow validation report
- `ui/`: static 1280x720 preview

## What This Gives You

- A stable interface contract for future hardware-backed services
- A repeatable set of "field handheld" and "docked desk" scenarios
- A place to test UI layout before buying hardware

## What It Does Not Do Yet

- Create the Ubuntu VM for you
- Confirm real DSI panel timing
- Measure real Jetson power or thermal behavior

Those still require either your host hypervisor or real hardware.
