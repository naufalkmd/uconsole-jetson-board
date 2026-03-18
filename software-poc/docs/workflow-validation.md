# Workflow Validation Checklist

Use this checklist after generating the mock state bundle and opening the preview UI.

## Target Viewport

- Width: `1280`
- Height: `720`

## Core Workflows

### 1. Terminal / Coding

Pass criteria:

- Battery state is visible at a glance
- Thermal state is visible at a glance
- Keyboard and backlight state are visible
- The layout leaves enough room for terminal-first workflows

### 2. Browser / Docs / Admin

Pass criteria:

- Connectivity status is obvious
- Docked and handheld states are clearly distinguishable
- Alerts such as low battery or modem reset are easy to spot

### 3. LTE Field Work

Pass criteria:

- Modem state, SIM state, and signal quality are visible
- Dock state is clearly shown as disconnected
- The screen still feels useful in handheld-only mode

### 4. Docked Desk Mode

Pass criteria:

- Dock detection is obvious
- Ethernet and USB expansion states are visible
- The screen remains readable without hiding critical handheld states

## Scenarios To Review

- `default`
- `field-lte`
- `low-battery`
- `docked-desk`

## What To Record

- Which UI blocks felt cramped at `1280x720`
- Which states need better naming or grouping
- Which hardware signals still need to be added to the HAL contract
