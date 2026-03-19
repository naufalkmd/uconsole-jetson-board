# Jetson Bring-Up Checklist

This checklist is for the first real-hardware pass once the target Jetson module and carrier are available.

## Goals

- boot a supported Jetson Linux image
- clone the repo and run the software PoC locally
- switch from mock data to `DATA_SOURCE=real`
- identify which HAL signals are live, missing, or still using fallback values

## Day 1 Checklist

1. Flash the intended Jetson Linux image and complete first boot.
2. Install the baseline tools:

   ```bash
   sudo apt update
   sudo apt install -y git curl build-essential nodejs npm modemmanager
   ```

3. Clone the repo and enter `software-poc/`.
4. Copy `.env.example` to `.env.local` and fill in any board-specific values you already know.
5. Run the local regression check:

   ```bash
   npm run check
   ```

6. Run the preview against the real HAL:

   ```bash
   npm run serve:real
   ```

7. If startup is slow or a probe seems stuck, enable tracing:

   ```bash
   REAL_HAL_TRACE=1 npm run serve:real
   ```

## Board-Specific Inputs To Fill In

- `GPIO_DOCK_DETECT_NUMBER`
- whether dock detect is active-low
- any keyboard or display overrides needed during early bring-up

## Helpful Commands

- `npm run gpio:inspect`: survey available GPIO devices and likely dock-related signals
- `node tools/export-state.mjs`: export the mock bundle
- `DATA_SOURCE=real node tools/export-state.mjs`: export the live bundle from the real HAL
- `npm run validate`: confirm scenario and workflow assumptions still pass

## Success Criteria

- the preview loads using `DATA_SOURCE=real`
- the hardware warnings panel explains any remaining gaps clearly
- modem, display, keyboard, and dock state are either live or explicitly marked as fallback
- the team can capture missing signals as follow-up hardware questions instead of undocumented surprises
