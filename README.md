# UConsole Jetson V1 - Consolidated Research

**Date:** March 18, 2026  
**Status:** V1 Architecture Aligned - Ready for Implementation

---

## 1. Executive Summary

This document consolidates all research for the UConsole Jetson V1 custom carrier board. V1 focuses on three core differentiators:

1. **Internal NVMe storage** (PCIe x4)
2. **Internal LTE connectivity** (USB 2.0)
3. **Desk docking capability** (USB 3.x + power + debug)

The design prioritizes internal performance and reliability over external expansion for the first revision.

---

## 2. Target Compute Module

### Primary: Jetson Orin NX 16GB

| Specification  | Value                                |
| -------------- | ------------------------------------ |
| AI Performance | 157 TOPS                             |
| Memory         | 16GB LPDDR5 (102GB/s)                |
| Power Range    | 10W - 40W (configurable)             |
| Form Factor    | 69.6 × 45 × 5 mm                     |
| Connector      | 260-pin SODIMM (0.5mm pitch)         |
| PCIe           | Gen4 x7 lanes                        |
| USB            | 3x USB 3.2 Gen2, 5x USB 2.0          |
| Display        | MIPI DSI 2×4-lane, HDMI 2.1, DP 1.4a |

### Fallback: Jetson Orin Nano 8GB

| Specification  | Value                              |
| -------------- | ---------------------------------- |
| AI Performance | 67 TOPS                            |
| Memory         | 8GB LPDDR5 (102GB/s)               |
| Power Range    | 7W - 25W (configurable)            |
| Form Factor    | 69.6 × 45 × 5 mm (same as Orin NX) |
| Connector      | 260-pin SODIMM (identical)         |

### Module Compatibility Notes

- Both modules share the **same 260-pin SODIMM connector**
- Carrier board designed for Orin NX 16GB will work with Orin Nano 8GB
- Upgrade path: Users can swap modules on the same carrier
- Height clearance: 5mm module + thermal solution must fit UConsole chassis

---

## 3. V1 Port Budget Allocation

Based on V1 architecture priorities, the lane/budget allocation is:

| Resource                  | Assignment                  | Priority    | Rationale                                          |
| ------------------------- | --------------------------- | ----------- | -------------------------------------------------- |
| **PCIe Gen4 x4**          | Internal M.2 Key M NVMe     | Must-have   | Premium Linux responsiveness requires fast storage |
| **PCIe Gen4 x1**          | Internal M.2 Key E Wi-Fi/BT | Must-have   | Standard replaceable wireless module               |
| **USB 2.0**               | Internal LTE modem          | Must-have   | Keeps LTE off primary PCIe budget                  |
| **USB 2.0**               | Keyboard controller         | Must-have   | Preserves UConsole internal keyboard               |
| **USB 3.x**               | Dock uplink                 | Must-have   | Enables desk expansion                             |
| **Display**               | Internal MIPI DSI panel     | Must-have   | Core handheld experience                           |
| **GbE**                   | Through dock                | Should-have | Better for desk than handheld                      |
| **UART**                  | Dock + debug header         | Should-have | Critical for bring-up                              |
| **I2C/GPIO/PWM**          | Battery, backlight, modem   | Must-have   | Core handheld plumbing                             |
| **OCuLink/external PCIe** | Deferred                    | V2          | Not a Rev A priority                               |

---

## 4. Storage Architecture

### Internal NVMe (M.2 Key M)

```
Jetson Orin NX
      │
      │ PCIe Gen4 x4
      ▼
+-------------+
│ M.2 Key M   │─── NVMe SSD (boot + storage)
│ 2280/2242   │    - 2230: Compact, limited capacity
│ supported   │    - 2242: Balanced option
+-------------+    - 2280: Maximum capacity
```

**Recommended SSD Form Factors:**

| Size | Capacity Range | Use Case               |
| ---- | -------------- | ---------------------- |
| 2230 | 256GB - 1TB    | Minimal internal space |
| 2242 | 512GB - 2TB    | Balanced option        |
| 2280 | 1TB - 4TB+     | Maximum storage        |

**Key Requirements:**

- PCIe Gen4 x4 interface
- NVMe boot support in Jetson bootloader
- Power: ~7W peak (within Jetson power budget)

### Why NVMe First (V1 Philosophy)

The fastest way to make the system feel like a premium Linux machine is fast internal storage. NVMe matters more every day than external PCIe experiments.

---

## 5. Wireless Connectivity

### Wi-Fi / Bluetooth (M.2 Key E)

```
Jetson Orin NX
      │
      │ PCIe Gen4 x1 + USB 2.0
      ▼
+-------------+
│ M.2 Key E   │─── Wi-Fi 6/6E + Bluetooth 5.x module
│ 2230        │    - Intel AX210/AX211
+-------------+    - Realtek RTL8852BE
```

**Recommended Modules:**

| Module            | Wi-Fi    | Bluetooth | Notes              |
| ----------------- | -------- | --------- | ------------------ |
| Intel AX210       | Wi-Fi 6E | BT 5.3    | Good Linux support |
| Intel AX211       | Wi-Fi 6E | BT 5.3    | Requires CNVi      |
| Realtek RTL8852BE | Wi-Fi 6  | BT 5.2    | Lower cost         |

### LTE Modem (USB 2.0)

```
Jetson Orin NX
      │
      │ USB 2.0 + GPIO control
      ▼
+-------------+
│ LTE Modem   │─── 4G LTE connectivity
│ (internal)  │    - nano-SIM slot
+-------------+    - eSIM option
```

**V1 Decision: LTE Over USB, Not PCIe**

LTE is important but does not deserve the main PCIe budget in V1. A USB-based modem path is simpler and protects the high-value x4 storage path.

**Recommended Modem Options:**

| Modem          | Interface | Speed    | Features                     |
| -------------- | --------- | -------- | ---------------------------- |
| Quectel EC25   | USB 2.0   | 150 Mbps | Reliable, good Linux support |
| Quectel EG25-G | USB 2.0   | 300 Mbps | Global bands                 |
| SIM7600G-H     | USB 2.0   | 150 Mbps | UConsole proven              |

---

## 6. Display Interface

### Internal Panel: MIPI DSI

| Parameter  | Specification                |
| ---------- | ---------------------------- |
| Interface  | MIPI DSI 4-lane              |
| Resolution | 1280 × 720                   |
| Panel      | JD9365DA-H3 (UConsole stock) |
| Touch      | I2C-based capacitive         |
| Backlight  | PWM controlled               |

**Jetson DSI Compatibility:**

| Feature   | Jetson Orin NX      | UConsole Panel              |
| --------- | ------------------- | --------------------------- |
| DSI Lanes | 2× 4-lane           | 4-lane (uses one interface) |
| Data Rate | Up to 2.5 Gbps/lane | Compatible                  |
| Voltage   | 1.2V HS / 1.8V LP   | Compatible                  |

**Implementation Notes:**

- Direct DSI connection preferred (lowest power, no latency)
- May need custom panel driver for JD9365DA-H3
- Device tree overlay required for panel timing

### External Display (Dock)

| Interface        | Support Level       |
| ---------------- | ------------------- |
| HDMI 2.1         | Available on module |
| DisplayPort 1.4a | Available via USB-C |
| eDP 1.4          | Available           |

**V1 Decision:** External display through dock is "should-have" - nice for desktop mode but not a blocker for board bring-up.

---

## 7. Dock Architecture

### Recommended Dock Role

A simple desk dock that adds:

- External power input
- Ethernet (GbE)
- 2-4 USB host ports
- Debug/UART access
- Optional external display output

### Dock Connector Signals

| Signal Group     | Signals                    | Purpose                     |
| ---------------- | -------------------------- | --------------------------- |
| Power            | VIN, GND                   | Charging + peripheral power |
| USB 3.x          | SSTX+, SSTX-, SSRX+, SSRX- | High-speed data             |
| USB 2.0          | D+, D-                     | Keyboard, slow devices      |
| UART             | TX, RX, GND                | Debug console               |
| Control          | Dock detect, Wake          | State management            |
| Video (optional) | DP/HDMI lanes              | External display            |

**V1 Philosophy:** Prefer a dedicated dock interface over complex "one USB-C does everything" design. This reduces signal integrity risk and simplifies the first revision.

---

## 8. Power Architecture

### Power Requirements

| Module        | Mode | Power | Battery Life\* |
| ------------- | ---- | ----- | -------------- |
| Orin NX 16GB  | 10W  | 10W   | ~3-4 hours     |
| Orin NX 16GB  | 15W  | 15W   | ~2-2.5 hours   |
| Orin NX 16GB  | 25W  | 25W   | ~1-1.5 hours   |
| Orin NX 16GB  | 40W  | 40W   | ~45 min-1 hour |
| Orin Nano 8GB | 7W   | 7W    | ~4-5 hours     |
| Orin Nano 8GB | 15W  | 15W   | ~2-2.5 hours   |
| Orin Nano 8GB | 25W  | 25W   | ~1-1.5 hours   |

\*Based on 5000mAh @ 7.4V battery pack

### Power Supply Chain

```
USB-C Input (5V-20V)
      │
      ▼
+-------------+
│ USB-PD      │─── Power negotiation
│ Controller  │
+-------------+
      │
      ▼
+-------------+
│ Charge/Boost│─── Battery charging + 5V system rail
│ (BQ25895)   │    - 5V @ 5A for Jetson
+-------------+    - Battery management
      │
      ▼
+-------------+
│ 3.3V Buck   │─── Peripherals
│ (TPS62203)  │
+-------------+
      │
      ▼
+-------------+
│ 1.8V LDO    │─── DSI, GPIO
│ (TPS7A91)   │
+-------------+
```

### Voltage Level Translation

| Signal   | Jetson Level      | UConsole Level | Solution                   |
| -------- | ----------------- | -------------- | -------------------------- |
| GPIO     | 1.8V/3.3V         | 3.3V           | Configure to 3.3V mode     |
| MIPI DSI | 1.2V HS / 1.8V LP | 1.2V/1.8V      | Direct compatible          |
| I2C      | 1.8V/3.3V         | 3.3V           | 3.3V mode or level shifter |
| USB      | 3.3V              | 5V             | Built-in USB PHY           |

---

## 9. Thermal Design

### Thermal Specifications

| Module        | TDP     | Cooling Required   |
| ------------- | ------- | ------------------ |
| Orin Nano 4GB | 7W-15W  | Passive or active  |
| Orin Nano 8GB | 7W-25W  | Active recommended |
| Orin NX 8GB   | 10W-25W | Active recommended |
| Orin NX 16GB  | 10W-40W | Active required    |

### Thermal Interface

```
Jetson Module
      │
      │ Thermal Pad (2mm, >6W/mK)
      ▼
Copper Slug/Spreading Plate
      │
      ▼
UConsole Aluminum Chassis (heatsink)
```

**Thermal Management Strategy:**

- Use UConsole aluminum chassis as heatsink
- Thermal pad: 1.5-2mm thickness, >5W/mK conductivity
- Max case temperature: 80°C
- Thermal throttling: Automatic at 97°C
- Thermal shutdown: Hardware protection at 105°C

---

## 10. Physical Design

### PCB Stackup

| Parameter | Specification                                |
| --------- | -------------------------------------------- |
| Layers    | 6-layer (signal/GND/power/signal/GND/signal) |
| Thickness | 1.0mm or 1.2mm for rigidity                  |
| Copper    | 1oz outer, 0.5oz inner                       |

### Connector Placement Requirements

Must align with UConsole chassis:

1. **Display FPC** - Position matches original mainboard
2. **Keyboard FPC** - Internal USB connection
3. **Battery Connector** - 2-pin JST PH or similar
4. **USB-C** - External charging port
5. **M.2 Key M** - Internal NVMe access
6. **M.2 Key E** - Internal Wi-Fi/BT
7. **LTE Module** - Internal or daughterboard
8. **Dock Connector** - New addition for V1

### Serviceability Goals

- SSD replaceable without complete disassembly
- Modem replaceable or on small daughtercard
- Antenna paths short and planned early
- Reserve chassis/thermal volume for Orin NX

---

## 11. Software Stack

### Operating System

- **JetPack 6.0** (Ubuntu 22.04 based)
- **Kernel:** Linux 5.15 LTS
- **Display:** DRM/KMS with custom panel driver
- **Power:** nvpmodel for power mode switching

### Power Mode Configuration

```bash
# Set 10W power mode (recommended for battery)
sudo nvpmodel -m 8

# Set 15W for balanced performance
sudo nvpmodel -m 2

# Set 25W for maximum performance (docked)
sudo nvpmodel -m 0
```

### Device Tree Requirements

- Custom device tree overlay for UConsole hardware
- Panel timing for JD9365DA-H3
- GPIO mappings for screen power, modem control
- USB host configuration
- PCIe configuration for NVMe and Wi-Fi

---

## 12. Comparison: Original UConsole vs Jetson V1

| Specification    | CM4             | A06                  | **Jetson V1 (Orin NX)**       |
| ---------------- | --------------- | -------------------- | ----------------------------- |
| **Processor**    | BCM2711 (4×A72) | RK3399 (2×A72+4×A53) | **Orin (8×A78AE)**            |
| **GPU/AI**       | VideoCore VI    | Mali-T860            | **2048 CUDA + 157 TOPS**      |
| **RAM**          | Up to 8GB       | 4GB                  | **16GB LPDDR5**               |
| **Storage**      | microSD         | eMMC + microSD       | **NVMe Gen4 x4**              |
| **Power**        | 2-8W            | 5-10W                | **10-40W (configurable)**     |
| **AI/ML**        | Limited         | No                   | **Full CUDA + TensorRT**      |
| **Internal LTE** | No              | No                   | **Yes (USB 2.0)**             |
| **Dock Support** | Limited         | Limited              | **Full desk dock**            |
| **Upgrade Path** | Module swap     | None                 | **Module swap (Orin family)** |

---

## 13. Build of Materials (V1)

| Category   | Component                  | Qty  | Est. Cost      |
| ---------- | -------------------------- | ---- | -------------- |
| Compute    | Jetson Orin NX 16GB        | 1    | $599           |
| PCB        | 6-layer carrier PCB        | 1    | $75-150        |
| Power      | BQ25895 + passives         | 1    | $15            |
| Storage    | M.2 Key M 2242 NVMe        | 1    | $50-100        |
| Wireless   | M.2 Key E Wi-Fi/BT         | 1    | $15-25         |
| LTE        | Quectel EC25 or similar    | 1    | $30-50         |
| Connectors | FPC, JST, USB-C, M.2       | 15   | $30            |
| Passives   | Caps, resistors, inductors | ~100 | $15            |
| Thermal    | Thermal pad, copper        | 1    | $15            |
| **Total**  |                            |      | **~$850-1000** |

---

## 14. Development Roadmap (V1 Focus)

### Phase 1: Software-Only Proof of Concept ✅

- [x] Define user stories for desktop Linux environment
- [x] Run target software stack at 1280x720
- [x] Mock keyboard, battery, modem, backlight, GPIO
- [x] Compile panel driver and device tree changes
- [x] Build power/thermal budget model
- [x] Document blockers requiring hardware

### Phase 2: Hardware-Assisted Feasibility

- [ ] Acquire Jetson Orin Nano Dev Kit
- [ ] Verify MIPI DSI display compatibility
- [ ] Test keyboard USB interface
- [ ] Validate power consumption at different modes

### Phase 3: Schematic Design

- [ ] Design carrier schematic per V1 architecture
- [ ] Review with Jetson design guide
- [ ] Power analysis and thermal simulation
- [ ] Dock connector specification

### Phase 4: PCB Layout

- [ ] Layout carrier board to UConsole dimensions
- [ ] High-speed routing (DSI, USB, PCIe)
- [ ] Thermal interface design
- [ ] Dock connector placement

### Phase 5: Prototype & Test

- [ ] Fabricate PCB
- [ ] Assemble and test power
- [ ] Bring up display and keyboard
- [ ] LTE module integration
- [ ] Dock functionality

### Phase 6: Optimization

- [ ] Power consumption tuning
- [ ] Thermal optimization
- [ ] Community module testing

---

## 15. Risk Assessment (V1)

| Risk                       | Likelihood | Impact | Mitigation                                   |
| -------------------------- | ---------- | ------ | -------------------------------------------- |
| Display incompatibility    | Medium     | High   | Order panel datasheet; have HDMI fallback    |
| Thermal issues             | Medium     | High   | Conservative power mode; good thermal design |
| PCIe signal integrity      | Medium     | High   | Follow NVIDIA layout guidelines; simulation  |
| Dock connector complexity  | Medium     | Medium | Start with simpler USB-only dock             |
| Mechanical fit             | Medium     | Medium | 3D model chassis before fabrication          |
| Power consumption too high | Low        | Medium | 10W mode should suffice; validate early      |

---

## 16. What To Avoid In Rev A

Per V1 architecture philosophy:

1. ❌ **Spending PCIe x4 on anything other than NVMe** - This is the premium storage path
2. ❌ **Making docked external display a hard blocker** - Can come in V1.1
3. ❌ **Forcing LTE onto PCIe** - USB 2.0 satisfies the use case
4. ❌ **Adding OCuLink before basics are solid** - Defer to V2
5. ❌ **Overcommitting to "single-cable USB-C does everything"** - Dedicated dock interface is safer

---

## 17. Decisions for Next Phase

Based on research and V1 architecture priorities, here are the decisions:

### 17.1 SSD Form Factor: 2242

**Decision:** Use **M.2 2242** (22mm × 42mm) for NVMe SSD

**Rationale:**

- 2230 too limited in capacity (max ~1TB, expensive)
- 2280 too long for UConsole chassis (~120mm × 80mm internal space)
- 2242 is the sweet spot: 512GB-2TB capacity, widely available, fits mechanically
- UConsole has limited internal height; 2242 modules are widely available in thin formats

**Recommended SSD:** WD SN740 2242 or Samsung PM991a 2242

### 17.2 LTE Modem: USB Daughterboard

**Decision:** USB 2.0 LTE module on small daughterboard

**Rationale:**

- UConsole stock uses SIM7600G-H (USB 2.0 + GPIO control)
- Quectel EC25-E (USB 2.0) is proven in Linux, cost-effective (~$25-35)
- M.2 Key B modems exist but consume more power and space
- Daughterboard allows antenna placement flexibility and serviceability

**Implementation:**

- Quectel EC25-E or EG25-G (global bands)
- Mini-PCIe or custom connector to daughterboard
- GPIO control for power/reset (GPIO24/GPIO15 on Jetson)

### 17.3 Dock Video: Deferred to V1.1

**Decision:** No video in V1.0 dock

**Rationale:**

- V1 priority is "useful desk dock" not "full desktop replacement"
- USB 3.x + Ethernet + power + debug = immediate value
- Video adds signal integrity complexity and cost
- HDMI/DP available on module for direct connection if needed
- Can add video in V1.1 after core dock is validated

### 17.4 Dock Connector: Custom 24-Pin

**Decision:** Custom 24-pin dock connector (similar to DevTerm EXT)

**Rationale:**

- USB-C "everything" is complex for signal integrity
- Proprietary connector allows controlled pinout
- Reference: DevTerm uses non-standard mPCI-E slot for EXT
- 24 pins sufficient for: power, USB 3.x, USB 2.0, UART, dock detect

**Pin Budget:**
| Pins | Function |
|------|----------|
| 4 | Power (VIN, GND ×2) |
| 8 | USB 3.x (SSTX±, SSRX±) |
| 2 | USB 2.0 (D+, D-) |
| 3 | UART (TX, RX, GND) |
| 2 | Ethernet (RGMII data pair) |
| 2 | Control (Dock detect, Wake) |
| 3 | Reserved/ground |

### 17.5 Dock Current Budget: 3A

**Decision:** 3A @ 5V (15W) dock power budget

**Breakdown:**
| Load | Current | Notes |
|------|---------|-------|
| Device charging | 1.5A | Fast charge while docked |
| USB peripherals | 1A | Keyboard, mouse, storage |
| Ethernet | 0.3A | GbE PHY |
| Headroom | 0.2A | Safety margin |

**Total:** 3A @ 5V = 15W (plus device charging at higher voltage)

### 17.6 Panel Interface: Direct MIPI DSI

**Decision:** Direct MIPI DSI connection to JD9365DA-H3

**Rationale:**

- UConsole panel uses JD9365DA-H3 controller (4-lane DSI)
- Jetson Orin has 2× 4-lane DSI interfaces (compatible)
- Direct connection = lowest power, no latency, no bridge chip cost
- Risk: May need custom panel driver (acceptable for V1)

**Next Action:** Find JD9365DA-H3 datasheet for initialization sequence

---

## 18. Immediate Next Steps

### Week 1-2: Software PoC

1. Set up Ubuntu 22.04 VM at 1280x720
2. Create mock hardware abstraction layer
3. Validate UI workflows at target resolution

### Week 3: Hardware Decision Gate

1. Review software PoC results
2. **Decision:** Buy Jetson Orin Nano Dev Kit (~$499) or continue software-only?
3. Order JD9365DA-H3 datasheet if available

### Week 4: Dev Kit Validation (if purchased)

1. Verify DSI display compatibility
2. Test USB keyboard interface
3. Measure power consumption at 7W/15W/25W modes

### Month 2: Schematic Design

1. Design carrier schematic
2. Define dock connector pinout
3. Power analysis and thermal simulation

---

## 18. References

### NVIDIA Documentation

- Jetson Orin NX Series Data Sheet
- Jetson Orin Nano Series Data Sheet
- Jetson Orin Nano Developer Kit Carrier Board Specification
- Jetson Module Thermal Design Guide
- Jetson Orin NX/Nano Design Guide

### UConsole Documentation

- ClockworkPi UConsole Wiki
- UConsole GitHub Repository
- CM4/A06/R01 GPIO mappings

### Similar Projects

- ClockworkPi DevTerm
- Radxa CM5 UConsole adapter (community)
- Various Jetson carrier board reference designs

---

## 19. Software Proof of Concept Plan

### Goal

Prove that the UConsole + Jetson idea is worth hardware spend by validating software UX, Linux stack assumptions, and integration boundaries before buying a Jetson module, dev kit, or custom PCB.

### What This Phase Can Validate

| Area                                          | Can Validate in Software? | Notes                                                                |
| --------------------------------------------- | ------------------------- | -------------------------------------------------------------------- |
| UI layout at 1280x720                         | Yes                       | Use a desktop or VM at the target resolution                         |
| Core application workflows                    | Yes                       | Validate boot flow, login flow, app switching, and responsiveness    |
| Keyboard-driven interaction                   | Yes                       | Map a USB keyboard or gamepad to the expected handheld controls      |
| Linux package and service dependencies        | Yes                       | Use Ubuntu 22.04 natively, in a VM, or in WSL2                       |
| Mock modem, battery, GPIO, and backlight APIs | Yes                       | Use software stubs to lock down interface contracts                  |
| Device tree and panel driver buildability     | Partial                   | Compilation and review are possible, but not electrical verification |
| Battery runtime and thermal budget            | Partial                   | Estimate with a model, not with measurements                         |
| MIPI DSI electrical compatibility             | No                        | Requires the actual panel and carrier wiring                         |
| Power sequencing and charging behavior        | No                        | Requires real regulators, batteries, and load testing                |
| Mechanical fit and connector placement        | No                        | Requires physical measurements and CAD                               |

### Recommended PoC Environment

- **Host system**: Existing desktop or laptop
- **OS target**: Ubuntu 22.04, either native, VM, or WSL2-backed Linux workflow
- **Display target**: 1280x720 window or fullscreen mode to match the UConsole panel density
- **Input devices**: USB keyboard, external gamepad, or both
- **Runtime model**: Native Linux processes or containers
- **Hardware abstraction**: Mock battery, modem, GPIO, backlight, and thermal telemetry endpoints

### Suggested Software Architecture

1. Keep the UI and application logic independent from Jetson-specific drivers.
2. Put hardware interactions behind a thin abstraction layer.
3. Implement a mock backend for battery, modem, GPIO, and backlight state.
4. Use configuration flags to switch between mock mode and future hardware mode.
5. Treat CUDA, DSI, and board-specific GPIO as phase-2 integrations rather than phase-1 blockers.

### Concrete PoC Deliverables

- A runnable Linux desktop demo at 1280x720
- Keyboard mappings that approximate the UConsole control scheme
- Mock services or CLI stubs for battery, modem, backlight, GPIO, and thermal state
- A short note describing any kernel, device tree, or panel driver work that can already be drafted
- A power budget table covering 7W, 15W, and 25W assumptions
- A go/no-go decision on whether hardware is still justified

### Mock Interfaces to Define Early

| Interface | Minimum Software Stub                                                         |
| --------- | ----------------------------------------------------------------------------- |
| Battery   | Report percentage, charging state, and low-battery warning                    |
| GPIO      | Accept named signals such as `screen_power`, `modem_reset`, and `modem_power` |
| Backlight | Accept brightness level and on/off state                                      |
| Modem     | Report present/not present, signal state, and reset behavior                  |
| Thermal   | Report CPU, skin, and battery temperature estimates                           |

### Exit Criteria Before Buying Hardware

- The main user journeys run correctly in Linux at 1280x720.
- The input scheme feels usable on a keyboard or gamepad approximation.
- The software stack has no hidden dependency on real Jetson hardware for basic operation.
- The hardware abstraction boundaries are clear enough to swap mocks for real drivers later.
- The remaining risks are mostly electrical, mechanical, thermal, or power-related.

### What Still Requires Real Hardware Later

- MIPI DSI panel bring-up and initialization tuning
- Backlight PWM tuning and brightness behavior
- USB wiring for the UConsole keyboard controller
- Battery charging, boost conversion, and shutdown behavior
- Real thermal behavior inside the aluminum chassis
- Mechanical fit, connector reach, and assembly tolerances

### Recommended Decision Rule

Do not buy hardware just to continue software work. Buy or borrow hardware only when the next unresolved question is impossible to answer without electrical, thermal, or mechanical validation.

---

## 20. Bottom Line

**If only three extras are allowed in V1, they should be:**

1. **Internal NVMe** (PCIe Gen4 x4)
2. **Internal LTE option** (USB 2.0)
3. **Useful desk dock** (USB 3.x + power + debug)

That combination makes the device meaningfully more powerful and modern than a stock UConsole while staying realistic for a first custom carrier board.

---

## 21. Architecture Philosophy

### Why This Budget Makes Sense

#### NVMe First

The fastest way to make the system feel like a premium Linux machine is to give it fast internal storage. NVMe matters more every day than an external PCIe experiment.

#### LTE Over USB, Not PCIe

LTE is important to the product, but it does not deserve the main PCIe budget in V1. A USB-based modem path is simpler and protects the high-value x4 storage path.

#### Docking Without Overcommitting

V1 docking should make the handheld more useful on a desk, not turn it into a fragile signal-integrity project. Power, USB expansion, Ethernet, and debug access provide immediate value. External display is worth supporting if the internal display path and board layout allow it cleanly.

### V1 Feature Boundaries

**Must-Have:**

- Jetson Orin NX / Orin Nano module compatibility
- Internal NVMe boot storage
- Internal Wi-Fi / Bluetooth
- LTE modem path
- Battery and charge management
- Working handheld display path
- Working internal keyboard path
- Dock connector with at least power + USB expansion + debug support

**Should-Have:**

- Ethernet through the dock
- External monitor support through the dock
- SSD and modem serviceability
- Clean thermal path into chassis

**Deferred to V2:**

- OCuLink
- eGPU-oriented design
- Dual NVMe
- 5G-first modem design
- "Single-cable does everything" USB-C dock behavior

---

## 22. Sources

- NVIDIA Jetson Orin official specs: https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/
- Jetson Orin Nano Developer Kit User Guide: https://developer.nvidia.com/embedded/learn/jetson-orin-nano-devkit-user-guide/index.html
- Jetson Orin Nano Developer Kit Carrier Board Specification: https://developer.nvidia.com/downloads/assets/embedded/secure/jetson/orin_nano/docs/jetson_orin_nano_devkit_carrier_board_specification_sp.pdf
- NVIDIA Jetson product lifecycle: https://developer.nvidia.com/embedded/lifecycle
- ClockworkPi UConsole Wiki: https://wiki.clockworkpi.com/
- UConsole GitHub: https://github.com/clockworkpi/uConsole

---

_Research consolidated: March 18, 2026_  
_Next step: Phase 2 - Hardware-assisted feasibility testing_
