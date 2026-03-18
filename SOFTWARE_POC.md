# Software-Only Proof of Concept Plan

## Goal

Prove that the UConsole + Jetson idea is worth hardware spend by validating software UX, Linux stack assumptions, and integration boundaries before buying a Jetson module, dev kit, or custom PCB.

## What This Phase Can Validate

| Area | Can Validate in Software? | Notes |
| --- | --- | --- |
| UI layout at 1280x720 | Yes | Use a desktop or VM at the target resolution |
| Core application workflows | Yes | Validate boot flow, login flow, app switching, and responsiveness |
| Keyboard-driven interaction | Yes | Map a USB keyboard or gamepad to the expected handheld controls |
| Linux package and service dependencies | Yes | Use Ubuntu 22.04 natively, in a VM, or in WSL2 |
| Mock modem, battery, GPIO, and backlight APIs | Yes | Use software stubs to lock down interface contracts |
| Device tree and panel driver buildability | Partial | Compilation and review are possible, but not electrical verification |
| Battery runtime and thermal budget | Partial | Estimate with a model, not with measurements |
| MIPI DSI electrical compatibility | No | Requires the actual panel and carrier wiring |
| Power sequencing and charging behavior | No | Requires real regulators, batteries, and load testing |
| Mechanical fit and connector placement | No | Requires physical measurements and CAD |

## Recommended PoC Environment

- **Host system**: Existing desktop or laptop
- **OS target**: Ubuntu 22.04, either native, VM, or WSL2-backed Linux workflow
- **Display target**: 1280x720 window or fullscreen mode to match the UConsole panel density
- **Input devices**: USB keyboard, external gamepad, or both
- **Runtime model**: Native Linux processes or containers
- **Hardware abstraction**: Mock battery, modem, GPIO, backlight, and thermal telemetry endpoints

## Suggested Software Architecture

1. Keep the UI and application logic independent from Jetson-specific drivers.
2. Put hardware interactions behind a thin abstraction layer.
3. Implement a mock backend for battery, modem, GPIO, and backlight state.
4. Use configuration flags to switch between mock mode and future hardware mode.
5. Treat CUDA, DSI, and board-specific GPIO as phase-2 integrations rather than phase-1 blockers.

## Concrete PoC Deliverables

- A runnable Linux desktop demo at 1280x720
- Keyboard mappings that approximate the UConsole control scheme
- Mock services or CLI stubs for battery, modem, backlight, GPIO, and thermal state
- A short note describing any kernel, device tree, or panel driver work that can already be drafted
- A power budget table covering 7W, 15W, and 25W assumptions
- A go/no-go decision on whether hardware is still justified

## Mock Interfaces to Define Early

| Interface | Minimum Software Stub |
| --- | --- |
| Battery | Report percentage, charging state, and low-battery warning |
| GPIO | Accept named signals such as `screen_power`, `modem_reset`, and `modem_power` |
| Backlight | Accept brightness level and on/off state |
| Modem | Report present/not present, signal state, and reset behavior |
| Thermal | Report CPU, skin, and battery temperature estimates |

## Exit Criteria Before Buying Hardware

- The main user journeys run correctly in Linux at 1280x720.
- The input scheme feels usable on a keyboard or gamepad approximation.
- The software stack has no hidden dependency on real Jetson hardware for basic operation.
- The hardware abstraction boundaries are clear enough to swap mocks for real drivers later.
- The remaining risks are mostly electrical, mechanical, thermal, or power-related.

## What Still Requires Real Hardware Later

- MIPI DSI panel bring-up and initialization tuning
- Backlight PWM tuning and brightness behavior
- USB wiring for the UConsole keyboard controller
- Battery charging, boost conversion, and shutdown behavior
- Real thermal behavior inside the aluminum chassis
- Mechanical fit, connector reach, and assembly tolerances

## Recommended Decision Rule

Do not buy hardware just to continue software work. Buy or borrow hardware only when the next unresolved question is impossible to answer without electrical, thermal, or mechanical validation.
