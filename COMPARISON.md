# UConsole Module Comparison

## Quick Comparison: Original Modules vs Jetson

| Specification | CM4                     | A06                  | R01         | **Jetson Orin Nano**     |
| ------------- | ----------------------- | -------------------- | ----------- | ------------------------ |
| **Processor** | BCM2711 (4×A72)         | RK3399 (2×A72+4×A53) | D1 (RISC-V) | **Orin (6×A78AE)**       |
| **GPU/AI**    | VideoCore VI (HW Video) | Mali-T860 (3D only)  | None        | **1024 CUDA + 67 TOPS**  |
| **RAM**       | Up to 8GB               | 4GB                  | 1GB         | **8GB LPDDR5**           |
| **Power**     | 2-8W                    | 5-10W                | 1-2W        | **7-25W (configurable)** |
| **AI/ML**     | Limited                 | No                   | No          | **Full CUDA + TensorRT** |
| **Display**   | DSI/HDMI                | DSI/HDMI             | RGB         | **DSI/HDMI/DP**          |
| **USB**       | 2.0/3.0                 | 3.0                  | 2.0         | **3.2 Gen2**             |
| **Price**     | ~$25-75                 | ~$100                | ~$25        | **~$499**                |

## What You Gain with Jetson

✅ **Massive AI Acceleration**: 67 TOPS for on-device ML (vs 0 on CM4/A06)  
✅ **CUDA Ecosystem**: Full desktop GPU software compatibility  
✅ **Modern Architecture**: ARM Cortex-A78AE cores (2022 vs 2015)  
✅ **Better I/O**: USB 3.2 Gen2, PCIe Gen4  
✅ **Video Encode/Decode**: Hardware-accelerated H.265/AV1  
✅ **Development**: Same software stack as desktop Linux

## Trade-offs

⚠️ **Higher Power**: 7W minimum (vs 2W CM4 idle)  
⚠️ **Higher Cost**: ~$499 module (vs $25-100)  
⚠️ **Thermal Design**: Requires proper heatsinking  
⚠️ **Battery Life**: 4-5 hours at 7W (vs 8-10 hours CM4)  
⚠️ **Custom Carrier**: Must design/build carrier board

## Ideal Use Cases

| Use Case           | CM4          | Jetson              |
| ------------------ | ------------ | ------------------- |
| Terminal/SSH       | ✅ Excellent | ✅ Good             |
| Web Browsing       | ✅ Good      | ✅ Excellent        |
| Coding/Development | ✅ Good      | ✅ Excellent        |
| AI/ML Inference    | ❌ Poor      | ✅ Excellent        |
| Computer Vision    | ❌ Poor      | ✅ Excellent        |
| Robotics           | ⚠️ Limited   | ✅ Excellent        |
| Video Processing   | ⚠️ Limited   | ✅ Excellent        |
| Gaming             | ⚠️ Limited   | ✅ Good (emulation) |

## Power Modes Explained

### Jetson Orin Nano Power Profiles

```
┌─────────────────────────────────────────────────────────────┐
│  MODE 0: MAXN (25W)                                         │
│  • 6 CPU cores @ 2.0 GHz                                    │
│  • GPU at max clocks                                        │
│  • For: AI training, heavy inference, video encoding        │
│  • Battery: ~1.5 hours (5000mAh)                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  MODE 1: 15W (Default)                                      │
│  • 4 CPU cores active                                       │
│  • Reduced GPU clocks                                       │
│  • For: Balanced performance, development                   │
│  • Battery: ~2.5 hours (5000mAh)                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  MODE 2: 7W (Recommended for portable)                      │
│  • 4 CPU cores @ reduced frequency                          │
│  • Minimal GPU power                                        │
│  • For: Terminal work, coding, light tasks                  │
│  • Battery: ~4-5 hours (5000mAh)                            │
└─────────────────────────────────────────────────────────────┘
```

## GPIO Compatibility Mapping

| UConsole Function | CM4 GPIO | Jetson GPIO | Notes                    |
| ----------------- | -------- | ----------- | ------------------------ |
| Screen Power      | GPIO 9   | GPIO 08     | 3.3V - Direct compatible |
| SPI CS            | GPIO 10  | GPIO 09     | 3.3V - Direct compatible |
| 4G Reset          | GPIO 15  | GPIO 14     | 3.3V - Direct compatible |
| 4G Power          | GPIO 24  | GPIO 16     | 3.3V - Direct compatible |
| PWM Backlight     | GPIO 18  | PWM0        | May need config          |
| I2C SDA           | GPIO 2   | I2C0_SDA    | 3.3V - Direct compatible |
| I2C SCL           | GPIO 3   | I2C0_SCL    | 3.3V - Direct compatible |

## Display Compatibility

| Aspect     | UConsole Panel  | Jetson Capability  |
| ---------- | --------------- | ------------------ |
| Resolution | 1280×720        | ✅ Native support  |
| Interface  | MIPI DSI 4-lane | ✅ 2× 4-lane DSI   |
| Touch      | JD9365DA-H3     | ⚠️ May need driver |
| Backlight  | PWM control     | ✅ PWM output      |

**Risk**: Panel initialization sequence may differ from standard. May need custom device tree overlay.

## Community Module Compatibility

| Module              | Interface      | Compatibility      | Notes                     |
| ------------------- | -------------- | ------------------ | ------------------------- |
| 4G/LTE (SIM7600G-H) | USB 2.0 + GPIO | ✅ Yes             | GPIO control verified     |
| GPIO Expansion      | 40-pin header  | ⚠️ Verify voltages | May need level shifters   |
| Camera Module       | CSI            | ✅ Yes             | Jetson has 2× CSI         |
| Thermal Printer     | USB/UART       | ✅ Yes             | Standard interfaces       |
| Gamepad Module      | GPIO/I2C       | ⚠️ Test required   | Depends on implementation |

## Software-First Recommendation

Before spending on hardware, recommend:

1. **Host Platform**: Existing laptop/desktop running Ubuntu 22.04, WSL2, or a Linux VM
2. **Display Target**: Force the UI into 1280x720 to match the UConsole panel
3. **Input Path**: Use USB keyboard or gamepad mappings to emulate handheld controls
4. **Mock Services**: Stub battery, modem, backlight, thermal, and GPIO behavior in software
5. **Software Stack**: Run the intended Linux app stack natively or in containers, using host GPU acceleration if available
6. **Decision Gate**: Only buy Jetson hardware after the core workflows and assumptions survive this pass

## Recommended Starter Configuration After Software PoC

Once the software-only proof of concept passes, recommend:

1. **Module**: Jetson Orin Nano 8GB
2. **Power Mode**: 7W (nvpmodel -m 8)
3. **Display**: Direct MIPI DSI connection
4. **Battery**: 2x 18650 3500mAh (7000mAh total)
5. **Cooling**: Thermal pad to chassis, monitor temps
6. **OS**: JetPack 6.0 with custom device tree

Target hardware experience after bring-up:

- 4-5 hour battery life
- Cool chassis (under 70C)
- Responsive Linux desktop
- Ability to run AI models (LLaMA, Stable Diffusion, YOLO)
- Full compatibility with UConsole peripherals

## Next Steps Checklist

- [ ] Define the software proof-of-concept scope and success criteria
- [ ] Run the target UI/app in a 1280x720 Linux environment
- [ ] Mock battery, GPIO, modem, backlight, and thermal interfaces
- [ ] Compile or draft panel driver and device tree changes
- [ ] Estimate runtime for 7W, 15W, and 25W modes
- [ ] Decide whether buying or borrowing Jetson hardware is justified

