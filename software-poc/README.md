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

   Or generate a real-HAL stub bundle:

   ```powershell
   DATA_SOURCE=real node tools/export-state.mjs
   ```

   `tools/export-state.mjs` auto-loads `software-poc/.env` and `software-poc/.env.local` if present.

2. Preview the UI locally:

   ```powershell
   node tools/dev-server.mjs
   ```

   Or preview against the real-HAL stub:

   ```powershell
   DATA_SOURCE=real node tools/dev-server.mjs
   ```

   Or use the shortcut script:

   ```powershell
   npm run serve:real
   ```

3. Validate the workflow scenarios:

   ```powershell
   node tools/validate-workflows.mjs
   ```

4. Run the full software PoC check:

   ```powershell
   npm run check
   ```

5. Run the fixture-based regression tests:

   ```powershell
   npm test
   ```

6. Inspect GPIO visibility on the current machine:

   ```powershell
   npm run gpio:inspect
   ```

## Folder Layout

- `docs/ubuntu-22.04-vm-setup.md`: recommended VM profile and host setup
- `docs/workflow-validation.md`: manual validation checklist for the target workflows
- `hal/mock-hal.mjs`: mock hardware abstraction layer
- `hal/real-hal.mjs`: real hardware abstraction layer stub with the same snapshot contract
- `tests/fixtures/real-hal/`: captured command-output fixtures for real-HAL parser tests
- `tests/real-hal.test.mjs`: fixture-based regression tests for display, keyboard, modem, and dock logic
- `tools/export-state.mjs`: generates UI-friendly mock scenario data
- `tools/check.mjs`: runs tests, validation, and both mock/real export passes in one command
- `tools/dev-server.mjs`: serves the preview UI
- `tools/inspect-gpio.mjs`: surveys dock-related GPIO visibility and candidate lines on the current machine
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

## Real HAL Notes

- `DATA_SOURCE=real` now routes through `hal/real-hal.mjs`.
- The real HAL currently attempts Linux `sysfs` reads for battery, thermal, and backlight.
- The real HAL now attempts modem discovery through `mmcli`/ModemManager and normalizes that data back into the mock snapshot shape.
- GPIO now attempts named `libgpiod` reads first, then env-configured sysfs GPIO values such as `GPIO_DOCK_DETECT_NUMBER=24`.
- Any GPIO signal can be inverted with `GPIO_<SIGNAL>_ACTIVE_LOW=1` or `GPIO_<SIGNAL>_INVERT=1`, which is especially useful for dock-detect lines.
- Dock state defaults to the dedicated `dock_detect` signal, with optional `DOCK_INFER_FROM_ETHERNET=1` fallback if you want to infer docked mode during bring-up.
- Keyboard state now reads `/proc/bus/input/devices`, with optional overrides such as `KEYBOARD_NAME_HINT` or `KEYBOARD_CONNECTED=0`.
- Display size now prefers `xrandr`, then framebuffer and DRM state, with optional overrides such as `DISPLAY_WIDTH=1280` and `DISPLAY_HEIGHT=720`.
- Set `REAL_HAL_TRACE=1` to print per-probe timing during `export-state` or `serve:real` when you need to debug slow startup.

## Bring-Up Config

- `software-poc/.env.example` contains the current real-HAL bring-up variables.
- `software-poc/.env.local` is ignored by git and loaded automatically by `export-state` and `dev-server`.
- The current research-backed modem control mapping is `GPIO_MODEM_POWER_NUMBER=24` and `GPIO_MODEM_RESET_NUMBER=15`.
- `GPIO_DOCK_DETECT_NUMBER` is intentionally left for your final carrier mapping because that line is not fixed in the repo yet.
- If the dock-detect line is active-low on your board, add `GPIO_DOCK_DETECT_ACTIVE_LOW=1`.
- Keyboard and display overrides are optional; they are mainly useful during early bring-up when the board presents generic Linux device names.

## Automation

- `npm run check` is the local “is everything still healthy?” command.
- `.github/workflows/software-poc-check.yml` runs that same check on pushes and pull requests touching `software-poc/`.
