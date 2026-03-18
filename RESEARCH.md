# UConsole + NVIDIA Jetson Motherboard Research

## Project Overview

Design a custom motherboard that replaces the standard UConsole CM4/A06/R01 module carrier with an NVIDIA Jetson Orin Nano (or similar) carrier, while maintaining compatibility with UConsole's display, keyboard, power system, and community modules.

---

## 1. UConsole System Architecture

### 1.1 Original Motherboard (CPI v3.14 Mainboard)

- **Form Factor**: ~120mm × 80mm (estimated from chassis)
- **Compute Interface**: Swappable CORE modules (CM4, A06, R01)
- **Keyboard**: FPC connector → STM32F103R USB HID controller
- **Display**: MIPI DSI FPC → JD9365DA-H3 5" 720p IPS panel
- **Battery**: 2× 18650 parallel (3.7V nominal) with integrated charger
- **4G Module**: Proprietary connector for SIM7600G-H (USB 2.0 + GPIO control)

### 1.2 Key Interfaces to Preserve

| Interface    | Type            | Notes                                           |
| ------------ | --------------- | ----------------------------------------------- |
| Display      | MIPI DSI 4-lane | JD9365DA-H3 controller, 1280×720, PWM backlight |
| Keyboard     | USB HID         | Via FPC to STM32F103R                           |
| Battery      | 2-pin JST       | 3.7V Li-ion, charging management needed         |
| Power Button | Hardware        | Soft power-off support                          |
| 4G Module    | USB 2.0 + GPIO  | Power/reset via GPIO                            |
| Audio        | Analog 3.5mm    | I2S codec or PWM audio                          |
| Expansion    | SPI/I2C/GPIO    | Community module compatibility                  |

---

## 2. NVIDIA Jetson Module Analysis

### 2.1 Recommended Module: Jetson Orin Nano 8GB

```
AI Performance:  67 TOPS
Memory:          8GB LPDDR5 (102GB/s)
Power:           7W - 25W (configurable)
Form Factor:     69.6 × 45 × 5 mm
Connector:       260-pin SODIMM (0.5mm pitch)
Display:         MIPI DSI 2x 4-lane, HDMI 2.1, DP 1.4a
USB:             USB 3.2 Gen2, USB 2.0
PCIe:            Gen4 x4
GPIO:            Configurable 1.8V/3.3V
```

### 2.2 Power Requirements

| Mode | Power | Battery Life\* | Use Case                    |
| ---- | ----- | -------------- | --------------------------- |
| 7W   | 7W    | 4-5 hours      | Low-power, coding, terminal |
| 15W  | 15W   | 2-2.5 hours    | Balanced performance        |
| 25W  | 25W   | 1-1.5 hours    | AI/ML workloads             |

\*Based on 5000mAh @ 7.4V battery pack

### 2.3 Critical Voltage Level Considerations

| Signal   | Jetson Level      | UConsole Level | Solution                   |
| -------- | ----------------- | -------------- | -------------------------- |
| GPIO     | 1.8V/3.3V         | 3.3V           | Configure to 3.3V mode     |
| MIPI DSI | 1.2V HS / 1.8V LP | 1.2V/1.8V      | Direct compatible          |
| I2C      | 1.8V/3.3V         | 3.3V           | Level shifter or 3.3V mode |
| USB      | 3.3V              | 5V             | Built-in USB PHY           |

---

## 3. Design Challenges & Solutions

### 3.1 Challenge: Form Factor Compatibility

**Problem**: Jetson modules are 69.6×45mm but UConsole uses a different compute module layout

**Solution**:

- Design a carrier PCB that fits UConsole's mounting holes
- Position Jetson module centrally with connectors aligned to UConsole chassis cutouts
- Use flex cables or carefully positioned FPC connectors for display/keyboard

### 3.2 Challenge: Display Interface

**Problem**: Need to drive JD9365DA-H3 MIPI DSI panel from Jetson

**Solution**:

- Jetson Orin has 2× 4-lane MIPI DSI outputs
- JD9365DA-H3 uses 4-lane DSI (compatible)
- Need to verify panel initialization sequence (may need custom driver)
- Consider using an FPGA bridge if timing doesn't match directly

**Display Bridge Options**:

1. **Direct DSI Connection**: Best option if compatible (lowest power, no latency)
2. **HDMI-to-DSI Bridge**: Use chip like LT8912B (adds cost/latency)
3. **eDP-to-DSI**: If using eDP output

### 3.3 Challenge: Keyboard Interface

**Problem**: UConsole keyboard uses STM32F103R USB HID controller

**Solution**:

- Jetson has USB 2.0/3.0 host ports
- Connect keyboard FPC to internal USB header
- May need custom USB hub chip if port count limited

### 3.4 Challenge: Battery & Power Management

**Problem**: Jetson needs 5V @ up to 5A; UConsole provides 3.7V from 18650s

**Solution**:

```
2× 18650 (3.7V parallel) → BQ25895 (Charge/Boost) → 5V/5A → Jetson
                              ↓
                         3.3V LDO → Peripherals
```

**Recommended PMIC**: TI BQ25895 or similar

- Handles charging from USB-C
- Boosts 3.7V to 5V efficiently
- I2C interface for battery monitoring

### 3.5 Challenge: Thermal Management

**Problem**: Jetson Orin Nano at 7W+ needs heat dissipation

**Solution**:

- UConsole has aluminum chassis (use as heatsink)
- Design copper slug or thermal pad interface
- Thermal pad: 1.5-2mm thickness, >5W/mK conductivity
- Max case temperature: 80°C

### 3.6 Challenge: GPIO Compatibility

**Problem**: UConsole expects specific GPIO behavior for screen power, 4G modem

**Solution**:

- Map Jetson GPIOs to UConsole expected functions
- Configure Jetson GPIOs to 3.3V mode where possible
- Use level shifters (TXB0108) if needed

| UConsole Function | GPIO   | Jetson Pin | Level Shifter |
| ----------------- | ------ | ---------- | ------------- |
| Screen Power      | GPIO9  | GPIO08     | No (3.3V)     |
| 4G Reset          | GPIO15 | GPIO14     | No (3.3V)     |
| 4G Power          | GPIO24 | GPIO16     | No (3.3V)     |

---

## 4. Proposed Architecture

```
                    ┌─────────────────────────────────────┐
                    │      UConsole Aluminum Chassis      │
                    │  ┌─────────────────────────────┐    │
    Keyboard FPC    │  │   Jetson Orin Nano Module   │    │
         │          │  │    (260-pin SODIMM)         │    │
         ▼          │  └──────────────┬──────────────┘    │
    ┌─────────┐     │                 │                   │
    │ USB Hub │◄────┘    ┌────────────┼────────────┐      │
    │(optional)│        │            │            │       │
    └────┬────┘    ┌────▼───┐   ┌────▼───┐   ┌────▼────┐  │
         │         │ MIPI   │   │  I2C   │   │  GPIO   │  │
         │         │  DSI   │   │        │   │         │  │
         │         └───┬────┘   └───┬────┘   └────┬────┘  │
    ┌────▼────┐        │            │             │       │
    │Keyboard │        │       ┌────▼────┐        │       │
    │STM32F103│        │       │  PMIC   │        │       │
    └─────────┘        │       │BQ25895  │        │       │
                       │       └────┬────┘        │       │
    ┌─────────┐        │            │             │       │
    │ 5" DSI  │◄───────┘            │             │       │
    │ Display │                     │             │       │
    └─────────┘              ┌──────┴──────┐      │       │
                             │             │      │       │
                        ┌────▼───┐   ┌─────▼──┐   │       │
                        │Battery │   │ USB-C  │   │       │
                        │2×18650 │   │  Port  │   │       │
                        └────────┘   └────────┘   │       │
                                                 ┌▼───────┴┐
                                                 │ 4G Slot │
                                                 └─────────┘
```

---

## 5. Component Selection

### 5.1 Power Management

| Component      | Function                      | Part Number | Notes                |
| -------------- | ----------------------------- | ----------- | -------------------- |
| Charge/Boost   | Battery management + 5V boost | TI BQ25895  | Single chip solution |
| Buck Converter | 5V → 3.3V                     | TPS62203    | 95% efficiency       |
| LDO            | 3.3V → 1.8V                   | TPS7A91     | Clean power for DSI  |

### 5.2 Display Interface

| Component        | Function          | Part Number      | Notes            |
| ---------------- | ----------------- | ---------------- | ---------------- |
| DSI Connector    | MIPI DSI to panel | FH35C-19S-0.3SHW | Matches UConsole |
| Backlight Driver | LED boost         | TPS61169         | PWM dimmable     |

### 5.3 USB/Peripherals

| Component     | Function     | Part Number | Notes                |
| ------------- | ------------ | ----------- | -------------------- |
| USB Hub       | Expand ports | USB2514B    | 4-port hub           |
| Level Shifter | 1.8V ↔ 3.3V  | TXB0108     | 8-bit auto-direction |

---

## 6. Software/Firmware Considerations

### 6.1 Device Tree

- Custom device tree overlay for UConsole hardware
- Panel timing for JD9365DA-H3
- GPIO mappings for screen power, 4G modem
- USB host configuration

### 6.2 Display Driver

- May need custom panel driver for JD9365DA-H3
- Reference: drivers/gpu/drm/panel/panel-jd9365da.c
- MIPI DSI initialization sequence from UConsole source

### 6.3 Power Profiles

```bash
# Set 7W power mode for battery operation
sudo nvpmodel -m 8

# Or set 15W for balanced
sudo nvpmodel -m 2
```

### 6.4 Known Working Software Stack

- **OS**: JetPack 6.0 (Ubuntu 22.04 based)
- **Kernel**: Linux 5.15 LTS
- **Display**: DRM/KMS with custom panel driver
- **Power**: nvpmodel for power mode switching

### 6.5 Software-Only Proof of Concept Strategy

Before buying hardware, treat the first milestone as a software feasibility pass:

- Run the target software stack on Ubuntu 22.04 desktop, VM, or WSL2 at the native UConsole resolution (1280x720)
- Use a standard USB keyboard or gamepad to emulate the UConsole input path
- Replace battery, modem, backlight, and GPIO control with mock services or CLI stubs
- Validate UI density, workflow ergonomics, and application startup time before committing to a carrier board
- Compile device tree overlays and panel driver changes where possible, but defer electrical validation until hardware is available
- Use this phase to reduce unknowns in software architecture, not to prove signal integrity or thermal behavior

See `SOFTWARE_POC.md` for the detailed plan and exit criteria.

---
## 7. Physical Design Considerations

### 7.1 PCB Stackup

- **Layers**: 6-layer recommended (signal/GND/power/signal/GND/signal)
- **Thickness**: 1.0mm or 1.2mm for rigidity
- **Copper**: 1oz outer, 0.5oz inner

### 7.2 Connector Placement

Must align with UConsole chassis:

1. **Display FPC**: Position matches original mainboard
2. **Keyboard FPC**: Internal USB connection
3. **Battery Connector**: 2-pin JST PH or similar
4. **USB-C**: External charging port
5. **4G Slot**: Proprietary connector location

### 7.3 Thermal Interface

```
Jetson Module
     │
     ▼
Thermal Pad (2mm, 6W/mK)
     │
     ▼
Copper Slug/Spreading Plate
     │
     ▼
UConsole Aluminum Chassis (heatsink)
```

---

## 8. Build of Materials (BoM) - Estimated

| Category   | Component                  | Qty | Est. Cost     |
| ---------- | -------------------------- | --- | ------------- |
| Compute    | Jetson Orin Nano 8GB       | 1   | $499          |
| PCB        | 6-layer carrier PCB        | 1   | $50-100       |
| Power      | BQ25895 + passives         | 1   | $15           |
| Connectors | FPC, JST, USB-C            | 10  | $20           |
| Passives   | Caps, resistors, inductors | ~50 | $10           |
| Thermal    | Thermal pad, copper        | 1   | $10           |
| **Total**  |                            |     | **~$600-650** |

---

## 9. Development Roadmap

### Phase 1: Software-Only Proof of Concept

- [ ] Define the user stories to prove on a desktop Linux environment
- [ ] Run the target software stack in a 1280x720 window or fullscreen layout
- [ ] Mock keyboard, battery, modem, backlight, and GPIO interfaces
- [ ] Compile panel driver and device tree changes where possible without hardware
- [ ] Build a power and thermal budget model for 7W, 15W, and 25W operation
- [ ] Record the blockers that still require a real Jetson or UConsole chassis

### Phase 2: Hardware-Assisted Feasibility

- [ ] Borrow or buy Jetson hardware only after the software proof of concept passes
- [ ] Verify MIPI DSI display compatibility
- [ ] Test keyboard USB interface
- [ ] Validate power consumption at different modes

### Phase 3: Schematic Design

- [ ] Design carrier schematic
- [ ] Review with Jetson design guide
- [ ] Power analysis and thermal simulation

### Phase 4: PCB Layout

- [ ] Layout carrier board to UConsole dimensions
- [ ] High-speed routing (DSI, USB)
- [ ] Thermal interface design

### Phase 5: Prototype & Test

- [ ] Fabricate PCB
- [ ] Assemble and test power
- [ ] Bring up display and keyboard
- [ ] 4G module integration

### Phase 6: Optimization

- [ ] Power consumption tuning
- [ ] Thermal optimization
- [ ] Community module testing
---

## 10. References & Resources

### UConsole Documentation

- ClockworkPi UConsole Wiki: https://wiki.clockworkpi.com/
- UConsole GitHub: https://github.com/clockworkpi/uConsole
- CM4 GPIO mapping: `uConsole/patch/cm4/cm4.sh`

### Jetson Documentation

- Jetson Orin Nano Design Guide: https://developer.nvidia.com/embedded/jetson-orin-nano
- Jetson Module Pinout: Jetson_Xavier_NX_Pinmux_Configuration
- Thermal Design Guide: Jetson_Orin_Nano_Thermal_Design_Guide

### Similar Projects

- ClockworkPi DevTerm (same mainboard family)
- Radxa CM5 UConsole adapter (community project)
- Various Raspberry Pi CM4 carrier boards (reference designs)

---

## 11. Risk Assessment

| Risk                       | Likelihood | Impact | Mitigation                                   |
| -------------------------- | ---------- | ------ | -------------------------------------------- |
| Display incompatibility    | Medium     | High   | Order panel datasheet; have HDMI fallback    |
| Thermal issues             | Medium     | High   | Conservative power mode; good thermal design |
| Power consumption too high | Low        | Medium | 7W mode should suffice; validate early       |
| GPIO mapping issues        | Low        | Medium | Level shifters; software workarounds         |
| Mechanical fit issues      | Medium     | Medium | 3D model chassis before fabrication          |

---

_Research compiled: March 18, 2026_
_Next step: Phase 1 - Software-only proof of concept_

