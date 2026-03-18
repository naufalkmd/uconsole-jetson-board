# Ubuntu 22.04 VM Setup

This is the recommended host-side setup for the Week 1-2 software proof of concept.

## Host Goal

Run a Linux environment that matches the planned handheld display size and is good enough to test:

- UI layout at `1280x720`
- keyboard-driven workflows
- browser + terminal multitasking
- mock battery, LTE, thermal, and dock states

## Recommended VM Profile

| Setting | Recommendation |
| --- | --- |
| Guest OS | Ubuntu 22.04 LTS Desktop |
| vCPU | 4 minimum, 6 preferred |
| Memory | 8 GB minimum, 12-16 GB preferred |
| Disk | 64 GB minimum, 128 GB preferred |
| Graphics | Enable 3D acceleration if your hypervisor supports it |
| Networking | NAT is fine for basic PoC; bridged is useful for SSH/admin workflows |

## Hypervisor Notes

- Hyper-V, VMware Workstation, and VirtualBox are all acceptable.
- If one of them has poor graphics performance on your machine, switch rather than fighting it.
- Use the simplest configuration that gives you a smooth Ubuntu desktop.

## Ubuntu Install Checklist

1. Install Ubuntu 22.04 LTS Desktop.
2. Run updates:

   ```bash
   sudo apt update
   sudo apt upgrade -y
   ```

3. Install the basic PoC tools:

   ```bash
   sudo apt install -y git curl build-essential nodejs npm
   ```

4. Clone this repo into the VM.
5. Run the Software PoC tools from `software-poc/`.

## Display Setup

The software PoC should be exercised at a target viewport of `1280x720`.

### Preferred Method

Use the Ubuntu display settings and set the VM window or guest display to `1280x720`.

### If GNOME Does Not Offer 1280x720

You can add or switch to it with `xrandr`:

```bash
xrandr
xrandr --output <display-name> --mode 1280x720
```

Replace `<display-name>` with the output listed by `xrandr`, such as `Virtual-1`.

## PoC Success Conditions

- Ubuntu remains responsive at `1280x720`
- Terminal and browser workflows feel usable
- The static preview in `software-poc/ui/` fits without clipped controls
- The mock HAL states are sufficient for the UI you plan to build next

## Recommended Manual Checks

- Open a browser, terminal, and editor at the same time
- Confirm text is readable without aggressive scaling
- Confirm the docked scenario still reads clearly at the same resolution
- Confirm the field-work scenario is usable without an external monitor
