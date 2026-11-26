/**
 * File Name: network-scanner.service.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Network scanner service - ARP, ping sweep, and traceroute discovery.
 *
 * Copyright (c) 2026 Epitech
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
**/

import { execSync } from "child_process";
import { promises as dns } from "dns";
import os from "os";
import { redis } from "../config/redis.js";
import { prisma } from "../config/database.js";
import { hashMac } from "../utils/hash.js";
import { getIO } from "../plugins/socket.js";
import { batchLookupVendors, lookupVendorSync, getLocalIPs, getLocalMACs, isRandomizedMac, guessDeviceType, getHardwareVendorForLocal, getLocalModelName } from "../utils/mac-vendor.js";
import { getWiFiInfo, getWiFiSummary } from "../utils/wifi-info.js";
import type { Point2D, Device, SceneCoordinate, AccessPointInfo } from "@epibat/shared";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DiscoveredDevice {
  ip: string;
  mac: string;
  hostname?: string;
  vendor?: string;
  deviceType?: string;
  isAP?: boolean;
  isLocal?: boolean;
}

interface SubnetRoomMapping {
  /** CIDR or prefix, e.g. "192.168.1" */
  subnetPrefix: string;
  floorId: string;
  roomId?: string; // Optional — if omitted, devices are distributed across rooms
}

export interface ScanResult {
  timestamp: string;
  devicesFound: number;
  devicesPlaced: number;
  accessPointsFound: number;
  duration: number;
  devices: DiscoveredDevice[];
  accessPoints: DiscoveredDevice[];
}

// ─── Known network infrastructure MAC OUI prefixes ───────────────────────────
// These identify access points, routers, and switches on the network.
// Format: first 3 bytes of MAC in lowercase with colons.

const MIST_JUNIPER_OUIS: string[] = [
  // Juniper Networks
  "5c:5b:35", "88:e0:f3", "2c:21:72", "ac:4b:c8",
  "f0:77:c3", "cc:e1:7f", "d4:04:ff", "3c:61:04",
  "40:b4:f0", "64:87:88", "84:b5:9c", "b0:c6:9a",
  "f8:c1:16", "54:e0:32", "ec:3e:f7", "78:fe:3d",
  "9c:cc:83", "28:c0:da", "dc:38:e1", "44:f4:77",
  "80:ac:ac", "4c:96:14",
  // Mist Systems (acquired by Juniper)
  "d4:20:b0",
];

/** Additional infrastructure vendor OUIs: Cisco, Aruba, Ubiquiti, Ruckus, etc. */
const INFRA_VENDOR_OUIS: string[] = [
  // Cisco Systems
  "3c:57:31", "00:1a:2f", "00:1b:0d", "00:1b:2a", "00:1e:bd",
  "00:21:d8", "00:22:0c", "00:23:ea", "00:24:c3", "00:26:0b",
  "00:26:99", "00:27:0c", "00:50:0f", "00:50:50", "00:60:2f",
  "00:0d:65", "00:11:20", "00:14:69", "00:16:9d", "00:17:59",
  "00:18:b9", "00:19:06", "00:1a:6c", "00:1a:e2", "00:1b:53",
  "00:1b:d5", "00:1c:0e", "00:1c:10", "00:1c:57", "00:1c:58",
  "00:1c:f6", "00:1d:45", "00:1d:46", "00:1d:70", "00:1d:71",
  "00:1e:13", "00:1e:14", "00:1e:49", "00:1e:4a", "00:1e:79",
  "00:1e:f6", "00:1e:f7", "00:1f:26", "00:1f:27", "00:1f:6c",
  "00:1f:6d", "00:1f:9d", "00:1f:9e", "00:21:1b", "00:21:1c",
  "00:21:55", "00:21:56", "00:21:a0", "00:21:a1", "00:21:be",
  "00:21:d7", "00:22:0d", "00:22:3a", "00:22:55", "00:22:56",
  "00:22:bd", "00:22:ce", "00:23:04", "00:23:33", "00:23:5d",
  "00:23:5e", "00:23:ab", "00:23:ac", "00:23:be", "00:23:eb",
  "00:24:50", "00:24:51", "00:24:97", "00:24:98", "00:24:c4",
  "00:25:2e", "00:25:45", "00:25:46", "00:25:83", "00:25:84",
  "00:25:b4", "00:25:b5", "00:26:51", "00:26:52", "00:26:98",
  "00:26:cb", "00:26:cc", "00:27:0d", "18:33:9d", "28:6f:7f",
  "38:20:56", "44:58:29", "4c:00:82", "58:97:bd", "5c:50:15",
  "64:a0:e7", "68:bc:0c", "6c:41:6a", "70:db:98", "74:a2:e6",
  "78:da:6e", "80:e0:1d", "84:78:ac", "88:f0:31", "8c:b6:4f",
  "f4:cf:e2", "f8:72:ea",
  // Aruba / HPE Aruba
  "00:0b:86", "00:1a:1e", "00:24:6c", "04:bd:88", "18:64:72",
  "20:4c:03", "24:de:c6", "40:e3:d6", "6c:f3:7f", "70:3a:0e",
  "84:d4:7e", "94:b4:0f", "9c:1c:12", "ac:a3:1e", "b4:5d:50",
  "d8:c7:c8",
  // Ubiquiti
  "04:18:d6", "18:e8:29", "24:5a:4c", "44:d9:e7", "68:72:51",
  "74:83:c2", "78:8a:20", "80:2a:a8", "b4:fb:e4", "e0:63:da",
  "f0:9f:c2", "fc:ec:da",
  // Ruckus / CommScope / Brocade
  "00:25:c4", "04:4f:aa", "08:86:3b", "0c:f4:d5", "18:bd:27",
  "1c:c7:f8", "24:79:2a", "58:b6:33", "5c:e8:83", "70:10:5c",
  "74:91:1a", "84:18:3a", "8c:0c:90", "94:f6:65", "a4:5e:60",
  "b4:79:c8", "d0:d0:4b",
  // TP-Link
  "00:31:92", "10:27:f5", "14:eb:b6", "30:de:4b", "50:c7:bf",
  "54:af:97", "60:32:b1", "64:66:b3", "70:4f:57", "74:da:88",
  "98:da:c4", "a8:42:e3", "b0:a7:b9", "c0:06:c3", "d8:47:32",
  "e8:48:b8", "f4:f2:6d",
  // Netgear
  "00:14:6c", "00:1e:2a", "00:1f:33", "00:24:b2", "00:26:f2",
  "08:bd:43", "10:0d:7f", "20:e5:2a", "28:80:88", "2c:b0:5d",
  "30:46:9a", "44:94:fc", "6c:b0:ce", "84:1b:5e", "9c:3d:cf",
  "a0:04:60", "a4:2b:8c", "c0:ff:d4", "c4:3d:c7", "e0:91:f5",
];

/** Vendors commonly associated with network infrastructure */
const INFRA_VENDOR_NAMES = [
  "cisco", "juniper", "mist", "aruba", "ubiquiti", "unifi",
  "ruckus", "meraki", "fortinet", "mikrotik", "tp-link", "netgear",
  "zyxel", "d-link", "dlink", "huawei", "h3c", "extreme",
  "brocade", "commscope", "cambium", "engenius", "peplink",
];

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Network scanner service that discovers devices on the local network
 * via ARP table scanning and places them in building rooms.
 *
 * Used as a fallback when Mist AI credentials are not configured.
 */
export class NetworkScannerService {
  private scanInterval: ReturnType<typeof setInterval> | null = null;
  private subnetMappings: SubnetRoomMapping[] = [];
  private lastScanResult: ScanResult | null = null;
  private scanning = false;

  // Room polygon cache: floorId -> rooms[]
  private roomCache: Map<string, Array<{ id: string; polygon: Point2D[] }>> =
    new Map();

  // Stable position cache: macHash -> position (so devices don't jump around)
  private positionCache: Map<string, SceneCoordinate> = new Map();

  // Hostname cache: ip -> hostname (persists across scans)
  private hostnameCache: Map<string, string> = new Map();

  // Negative cache: IPs that failed resolution (skip for 10 min)
  private hostnameMisses: Map<string, number> = new Map();
  private static readonly MISS_TTL = 10 * 60 * 1000; // 10 minutes

  // Local machine IPs (to tag "this device")
  private localIPs: Set<string> = new Set();

  // Access point tracking: macHash -> AP info
  private accessPoints: Map<string, { mac: string; ip: string; roomId: string | null; floorId: string; position: SceneCoordinate }> = new Map();

  // Device → AP mapping: device macHash -> AP macHash
  private deviceToAp: Map<string, string> = new Map();

  // Current WiFi BSSID (MAC of AP the local device is connected to)
  private currentBssid: string | null = null;

  constructor(
    private intervalMs: number = 60_000,
    private defaultFloorId?: string,
  ) {}

  // ── Lifecycle ────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    console.log("🔍 Network Scanner starting...");

    // Load subnet → room mappings from env or DB
    await this.loadMappings();

    // First scan immediately
    await this.scan();

    // Then periodic scans
    this.scanInterval = setInterval(async () => {
      await this.scan();
    }, this.intervalMs);

    console.log(
      `📡 Network Scanner active — scanning every ${this.intervalMs / 1000}s`
    );
  }

  stop(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    console.log("🛑 Network Scanner stopped");
  }

  getLastResult(): ScanResult | null {
    return this.lastScanResult;
  }

  isScanning(): boolean {
    return this.scanning;
  }

  // ── Network scanning ─────────────────────────────────────────────────────

  async scan(): Promise<ScanResult> {
    if (this.scanning) {
      return this.lastScanResult ?? {
        timestamp: new Date().toISOString(),
        devicesFound: 0,
        devicesPlaced: 0,
        accessPointsFound: 0,
        duration: 0,
        devices: [],
        accessPoints: [],
      };
    }

    this.scanning = true;
    const start = Date.now();

    try {
      // Log WiFi context
      const wifiInfo = getWiFiInfo();
      console.log(`📶 WiFi: ${getWiFiSummary()}`);

      // Capture the BSSID for precise local device → AP association
      this.currentBssid = wifiInfo.bssidResolved && wifiInfo.bssid
        ? wifiInfo.bssid
        : null;

      const discovered = this.discoverDevices();

      // Detect local machine
      this.localIPs = new Set(getLocalIPs());
      const localMACs = getLocalMACs();

      // Mark discovered devices that match our IPs
      for (const d of discovered) {
        if (this.localIPs.has(d.ip)) d.isLocal = true;
      }

      // Fallback: if the local device wasn't found in ARP, inject it manually
      const hasLocal = discovered.some((d) => d.isLocal);
      if (!hasLocal && this.localIPs.size > 0) {
        const ifaces = os.networkInterfaces();
        for (const [, entries] of Object.entries(ifaces)) {
          if (!entries) continue;
          for (const info of entries as os.NetworkInterfaceInfo[]) {
            if (info.family === "IPv4" && !info.internal && this.localIPs.has(info.address)) {
              // Check if the IP is already in discovered (with wrong MAC comparison etc.)
              const existing = discovered.find((d) => d.ip === info.address);
              if (existing) {
                existing.isLocal = true;
              } else {
                discovered.push({
                  ip: info.address,
                  mac: info.mac.toLowerCase(),
                  hostname: os.hostname(),
                  isLocal: true,
                });
              }
              console.log(`📍 Local device injected: ${info.address} (${info.mac})`);
              break;
            }
          }
          if (discovered.some((d) => d.isLocal)) break;
        }
      }

      // Enrich with reverse DNS hostnames
      await this.resolveHostnames(discovered);

      // Resolve MAC vendors (batch, with API fallback)
      await this.resolveVendors(discovered);

      // Separate APs from regular devices
      const { aps, clients } = this.classifyDevices(discovered);

      // Place APs first (1 AP per room), then clients relative to their AP
      const placedAps = await this.placeAccessPoints(aps);
      const placedClients = await this.placeClientDevices(clients);

      const result: ScanResult = {
        timestamp: new Date().toISOString(),
        devicesFound: clients.length,
        devicesPlaced: placedClients,
        accessPointsFound: aps.length,
        duration: Date.now() - start,
        devices: clients,
        accessPoints: aps,
      };

      this.lastScanResult = result;

      console.log(
        `📡 Scan complete: ${aps.length} APs, ${clients.length} clients, ${placedAps + placedClients} placed (${result.duration}ms)`
      );

      return result;
    } catch (err) {
      console.error("❌ Network scan failed:", err);
      return {
        timestamp: new Date().toISOString(),
        devicesFound: 0,
        devicesPlaced: 0,
        accessPointsFound: 0,
        duration: Date.now() - start,
        devices: [],
        accessPoints: [],
      };
    } finally {
      this.scanning = false;
    }
  }

  /**
   * Discover devices on the network using multiple strategies:
   * 1. Active ping sweep of infrastructure IPs per configured subnet
   * 2. Traceroute-based intermediate hop discovery
   * 3. ARP table scan (passive — reads existing cache)
   *
   * Deduplicates by MAC address (keeps first IP seen).
   */
  private scanCount = 0;

  private discoverDevices(): DiscoveredDevice[] {
    this.scanCount++;

    // Phase 1: Probe infrastructure IPs to populate ARP cache
    this.probeInfrastructure();

    // Phase 2: Read ARP table (now enriched by ping sweep)
    const arpDevices = this.readArpTable();

    // Phase 3: Traceroute — only on first scan (slow, results are stable)
    const traceDevices = this.scanCount <= 1
      ? this.discoverViaTraceroute()
      : [];

    // Merge & deduplicate by MAC
    const byMac = new Map<string, DiscoveredDevice>();
    for (const d of [...arpDevices, ...traceDevices]) {
      const mac = d.mac.toLowerCase();
      if (!byMac.has(mac)) {
        byMac.set(mac, d);
      }
      // If we already have this MAC but with a "less useful" IP (e.g. 169.254.x), prefer the better one
      else {
        const existing = byMac.get(mac)!;
        if (existing.ip.startsWith("169.254.") && !d.ip.startsWith("169.254.")) {
          byMac.set(mac, d);
        }
      }
    }

    const devices = [...byMac.values()];
    console.log(`🔎 Discovery #${this.scanCount}: ${arpDevices.length} ARP + ${traceDevices.length} traceroute → ${devices.length} unique devices`);
    return devices;
  }

  /**
   * Actively probe infrastructure IPs to populate the ARP cache.
   * Pings common router/AP IPs on each configured subnet:
   * - .1, .2, .254 (common gateways)
   * - .1 through .10 and .250 through .254 (infra ranges)
   * - Gateway subnet broader scan
   *
   * Uses parallel pings with very short timeout for speed.
   */
  private probeInfrastructure(): void {
    const targetIPs: Set<string> = new Set();

    // 1. Probe infrastructure IPs for each configured subnet mapping
    for (const mapping of this.subnetMappings) {
      const prefix = mapping.subnetPrefix; // e.g. "10.73.190"
      // Common infra IPs
      for (let i = 1; i <= 10; i++) targetIPs.add(`${prefix}.${i}`);
      for (let i = 250; i <= 254; i++) targetIPs.add(`${prefix}.${i}`);
    }

    // 2. Probe the gateway subnet more broadly (often has switches/APs)
    const gateway = this.detectGateway();
    if (gateway) {
      const parts = gateway.split(".");
      if (parts.length === 4) {
        const gwPrefix = parts.slice(0, 3).join(".");
        for (let i = 1; i <= 50; i++) targetIPs.add(`${gwPrefix}.${i}`);
        for (let i = 250; i <= 254; i++) targetIPs.add(`${gwPrefix}.${i}`);
      }
    }

    // 3. Also probe 10.73.x.1 for x = [0..10, 187..195] (common infra subnets)
    for (let x = 0; x <= 10; x++) {
      targetIPs.add(`10.73.${x}.1`);
      targetIPs.add(`10.73.${x}.254`);
    }
    for (let x = 187; x <= 195; x++) {
      targetIPs.add(`10.73.${x}.1`);
      targetIPs.add(`10.73.${x}.254`);
    }

    if (targetIPs.size === 0) return;

    console.log(`🏓 Probing ${targetIPs.size} infrastructure IPs...`);

    // Use a single batch ping command for speed
    const ipList = [...targetIPs];
    const platform = process.platform;

    try {
      if (platform === "darwin") {
        // macOS: parallel ping with very short timeout
        // Build a script that pings all in parallel
        const cmds = ipList.map(
          (ip) => `ping -c 1 -W 100 -t 1 ${ip} >/dev/null 2>&1 &`
        );
        // Batch into groups of 100 to avoid too many subprocesses
        for (let i = 0; i < cmds.length; i += 100) {
          const batch = cmds.slice(i, i + 100);
          try {
            execSync(batch.join("\n") + "\nwait", {
              encoding: "utf-8",
              timeout: 5_000,
              shell: "/bin/bash",
            });
          } catch {
            // Timeout or partial failure is OK — we just want ARP populated
          }
        }
      } else {
        // Linux: try fping (fast parallel ping), fallback to sequential
        try {
          execSync(`fping -c 1 -t 150 -q ${ipList.join(" ")} 2>/dev/null`, {
            encoding: "utf-8",
            timeout: 10_000,
          });
        } catch {
          // fping not available, try parallel pings
          const cmds = ipList.map(
            (ip) => `ping -c 1 -W 1 ${ip} >/dev/null 2>&1 &`
          );
          for (let i = 0; i < cmds.length; i += 100) {
            const batch = cmds.slice(i, i + 100);
            try {
              execSync(batch.join("\n") + "\nwait", {
                encoding: "utf-8",
                timeout: 8_000,
                shell: "/bin/bash",
              });
            } catch {
              // OK
            }
          }
        }
      }
    } catch {
      console.warn("⚠️ Infrastructure probe failed (non-critical)");
    }
  }

  /**
   * Discover network infrastructure via traceroute.
   * Runs traceroute to a few targets on different subnets to find intermediate
   * routers, switches, and L3 gateways.
   */
  private discoverViaTraceroute(): DiscoveredDevice[] {
    const hops: DiscoveredDevice[] = [];
    const seenIPs = new Set<string>();

    // Traceroute targets: external + cross-subnet IPs
    const targets: string[] = ["8.8.8.8"]; // Google DNS for hop discovery

    // Also try gateways on other subnets
    for (const mapping of this.subnetMappings) {
      targets.push(`${mapping.subnetPrefix}.1`);
    }

    const platform = process.platform;
    const traceCmd = platform === "darwin" ? "traceroute" : "traceroute";

    for (const target of targets.slice(0, 5)) { // Limit to 5 targets for speed
      try {
        const output = execSync(
          `${traceCmd} -n -m 6 -q 1 -w 1 ${target} 2>/dev/null`,
          { encoding: "utf-8", timeout: 12_000 }
        );

        // Parse: "N  IP  time ms"
        const hopRegex = /^\s*\d+\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s/gm;
        let match: RegExpExecArray | null;
        while ((match = hopRegex.exec(output)) !== null) {
          const ip = match[1];
          if (seenIPs.has(ip)) continue;
          if (ip.startsWith("127.")) continue;
          seenIPs.add(ip);

          // Try to get MAC for this hop from ARP (it was just pinged by traceroute)
          const mac = this.getMacFromArp(ip);
          if (mac) {
            hops.push({
              ip,
              mac,
              hostname: undefined,
              isAP: true, // Traceroute hops are routers by definition
            });
          }
        }
      } catch {
        // Traceroute failed for this target — skip
      }
    }

    if (hops.length > 0) {
      console.log(`🔀 Traceroute found ${hops.length} router hops: ${hops.map(h => h.ip).join(", ")}`);
    }

    return hops;
  }

  /**
   * Look up the MAC address for an IP from the current ARP cache.
   */
  private getMacFromArp(ip: string): string | null {
    try {
      const output = execSync(`arp -n ${ip} 2>/dev/null`, {
        encoding: "utf-8",
        timeout: 2000,
      });
      const macMatch = output.match(/([0-9a-fA-F]{1,2}(?::[0-9a-fA-F]{1,2}){5})/);
      if (macMatch) return macMatch[1].toLowerCase();
    } catch {
      // ARP lookup failed
    }
    return null;
  }

  /**
   * Read the ARP table and return discovered devices.
   */
  private readArpTable(): DiscoveredDevice[] {
    const devices: DiscoveredDevice[] = [];

    try {
      // Try `arp -a` first (works on macOS & most Linux)
      const output = execSync("arp -a 2>/dev/null", {
        encoding: "utf-8",
        timeout: 10_000,
      });

      // macOS format: hostname (ip) at mac on interface [ifscope ...]
      // Linux format: hostname (ip) at mac [ether] on interface
      const arpRegex =
        /(?:(\S+)\s+)?\((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\)\s+at\s+([0-9a-fA-F:]+)/g;

      let match: RegExpExecArray | null;
      while ((match = arpRegex.exec(output)) !== null) {
        const [, hostname, ip, mac] = match;

        // Skip incomplete / broadcast entries
        if (mac === "(incomplete)" || mac === "ff:ff:ff:ff:ff:ff") continue;
        if (ip.endsWith(".255")) continue; // broadcast
        if (ip.startsWith("224.") || ip.startsWith("239.")) continue; // multicast
        if (ip.startsWith("169.254.")) continue; // link-local / APIPA
        if (mac.startsWith("01:00:5e")) continue; // multicast MAC

        devices.push({
          ip,
          mac: mac.toLowerCase(),
          hostname: hostname !== "?" ? hostname : undefined,
        });
      }
    } catch {
      // Fallback: try `ip neigh` on Linux
      try {
        const output = execSync("ip neigh show 2>/dev/null", {
          encoding: "utf-8",
          timeout: 10_000,
        });

        const neighRegex =
          /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+dev\s+\S+\s+lladdr\s+([0-9a-fA-F:]+)/g;

        let match: RegExpExecArray | null;
        while ((match = neighRegex.exec(output)) !== null) {
          const [, ip, mac] = match;
          if (mac === "ff:ff:ff:ff:ff:ff") continue;

          devices.push({
            ip,
            mac: mac.toLowerCase(),
          });
        }
      } catch {
        console.warn("⚠️  Could not read ARP table — is arp or ip available?");
      }
    }

    return devices;
  }

  /**
   * Enrich discovered devices with hostnames using multiple strategies:
   * 1. ARP table hostname (already captured)
   * 2. Hostname cache (from previous scans)
   * 3. Reverse DNS lookup
   * 4. mDNS/Bonjour + NetBIOS (only if SCAN_DEEP_RESOLVE=true)
   *
   * Uses caching + negative cache to avoid re-resolving on every scan.
   */
  private async resolveHostnames(devices: DiscoveredDevice[]): Promise<void> {
    const LOOKUP_TIMEOUT = 2000;
    const MAX_CONCURRENT = 10;
    const deepResolve = process.env.SCAN_DEEP_RESOLVE === "true";
    const now = Date.now();

    // First pass: apply cached hostnames
    for (const device of devices) {
      if (!device.hostname && this.hostnameCache.has(device.ip)) {
        device.hostname = this.hostnameCache.get(device.ip)!;
      }
    }

    // Only resolve devices that still have no hostname and aren't in negative cache
    const unresolved = devices.filter((d) => {
      if (d.hostname) return false;
      const missTime = this.hostnameMisses.get(d.ip);
      if (missTime && now - missTime < NetworkScannerService.MISS_TTL) return false;
      return true;
    });

    if (unresolved.length === 0) return;

    // Batch resolve with concurrency limit
    for (let i = 0; i < unresolved.length; i += MAX_CONCURRENT) {
      const batch = unresolved.slice(i, i + MAX_CONCURRENT);
      await Promise.allSettled(
        batch.map(async (device) => {
          // Try reverse DNS (fast, ~50ms)
          try {
            const hostnames = await Promise.race([
              dns.reverse(device.ip),
              new Promise<string[]>((_, reject) =>
                setTimeout(() => reject(new Error("timeout")), LOOKUP_TIMEOUT)
              ),
            ]);
            if (hostnames.length > 0 && hostnames[0] !== device.ip) {
              device.hostname = hostnames[0];
              this.hostnameCache.set(device.ip, device.hostname);
              return;
            }
          } catch {
            // rDNS failed
          }

          // Deep resolve: mDNS + NetBIOS (slow, off by default)
          if (deepResolve) {
            try {
              const name = await Promise.race([
                this.resolveViaMdnsOrNetbios(device.ip),
                new Promise<string | null>((resolve) =>
                  setTimeout(() => resolve(null), LOOKUP_TIMEOUT)
                ),
              ]);
              if (name) {
                device.hostname = name;
                this.hostnameCache.set(device.ip, name);
                return;
              }
            } catch {
              // mDNS/NetBIOS failed
            }
          }

          // Mark as miss so we don't retry for a while
          this.hostnameMisses.set(device.ip, now);
        })
      );
    }

    const resolved = devices.filter((d) => d.hostname).length;
    if (resolved > 0) {
      console.log(`🏷️  Resolved ${resolved}/${devices.length} hostnames (${this.hostnameCache.size} cached)`);
    }
  }

  /**
   * Try to resolve a hostname via mDNS (Bonjour) or NetBIOS.
   * macOS: uses `dns-sd -Q` for mDNS and `smbutil lookup` for NetBIOS
   * Linux: uses `avahi-resolve-address`
   */
  private async resolveViaMdnsOrNetbios(ip: string): Promise<string | null> {
    const platform = process.platform;

    // Try mDNS (Bonjour) — works for Apple devices, printers, etc.
    try {
      if (platform === "darwin") {
        // macOS: use dns-sd to do a reverse PTR lookup via mDNS
        const arpa = ip.split(".").reverse().join(".") + ".in-addr.arpa";
        const output = execSync(
          `dns-sd -Q "${arpa}" PTR 2>/dev/null & PID=$!; sleep 1; kill $PID 2>/dev/null; wait $PID 2>/dev/null`,
          { encoding: "utf-8", timeout: 2500, shell: "/bin/bash" }
        );
        // Parse: "... PTR hostname.local."
        const ptrMatch = output.match(/PTR\s+(\S+?)\.?$/m);
        if (ptrMatch && ptrMatch[1] && !ptrMatch[1].includes("in-addr.arpa")) {
          return ptrMatch[1].replace(/\.local\.?$/, "");
        }
      } else {
        // Linux: avahi
        const output = execSync(
          `avahi-resolve-address "${ip}" 2>/dev/null`,
          { encoding: "utf-8", timeout: 3000 }
        );
        const parts = output.trim().split(/\s+/);
        if (parts.length >= 2 && parts[1]) {
          return parts[1].replace(/\.local\.?$/, "");
        }
      }
    } catch {
      // mDNS failed
    }

    // Try NetBIOS (Windows devices on LAN)
    try {
      if (platform === "darwin") {
        const output = execSync(
          `smbutil lookup "${ip}" 2>/dev/null`,
          { encoding: "utf-8", timeout: 3000 }
        );
        // Output: "Using IP address of <ip>: <hostname>"
        // or "Got response from <ip>: <hostname>"
        const nameMatch = output.match(
          /(?:Using IP address of|Got response from)\s+\S+:\s+(\S+)/
        );
        if (nameMatch && nameMatch[1]) {
          return nameMatch[1];
        }
      } else {
        const output = execSync(
          `nmblookup -A "${ip}" 2>/dev/null`,
          { encoding: "utf-8", timeout: 3000 }
        );
        // First line with <20> tag is the machine name
        const nameMatch = output.match(/^\s+(\S+)\s+<00>/m);
        if (nameMatch && nameMatch[1]) {
          return nameMatch[1];
        }
      }
    } catch {
      // NetBIOS failed
    }

    return null;
  }

  // ── Vendor resolution ─────────────────────────────────────────────────────

  /**
   * Resolve hardware vendor for each device from MAC OUI.
   * Uses embedded database + macvendors.com API (cached).
   */
  private async resolveVendors(devices: DiscoveredDevice[]): Promise<void> {
    const macs = devices.map((d) => d.mac);
    const vendorMap = await batchLookupVendors(macs);

    for (const device of devices) {
      device.vendor = vendorMap.get(device.mac) ?? lookupVendorSync(device.mac);

      // For local device with randomized MAC, resolve vendor from hardware info
      if (device.isLocal && (!device.vendor || device.vendor === "MAC privée" || device.vendor === "Inconnu")) {
        const hwVendor = getHardwareVendorForLocal();
        if (hwVendor) {
          device.vendor = hwVendor;
        }
      }
    }

    const identified = devices.filter(
      (d) => d.vendor && d.vendor !== "Inconnu"
    ).length;
    const randomized = devices.filter((d) =>
      isRandomizedMac(d.mac)
    ).length;
    const local = devices.filter((d) => d.isLocal).length;

    console.log(
      `🏭 Vendors: ${identified}/${devices.length} identified, ${randomized} randomized MACs, ${local} local`
    );

    // Resolve device type from hostname + vendor
    for (const device of devices) {
      if (device.isLocal) {
        // For local device, use hardware model + hostname detection
        const model = getLocalModelName();
        const hostname = device.hostname ?? os.hostname();
        if (model.toLowerCase().includes("macbook") || hostname.toLowerCase().includes("macbook")) {
          device.deviceType = "MacBook";
        } else if (model.toLowerCase().includes("imac") || hostname.toLowerCase().includes("imac")) {
          device.deviceType = "iMac";
        } else if (model.toLowerCase().includes("mac") || hostname.toLowerCase().includes("mac")) {
          device.deviceType = "Mac";
        } else {
          const guess = guessDeviceType(hostname, device.vendor);
          device.deviceType = guess.label || undefined;
        }
      } else {
        const guess = guessDeviceType(device.hostname, device.vendor);
        if (guess.label) device.deviceType = guess.label;
      }
    }
  }

  // ── Device classification ─────────────────────────────────────────────────

  /**
   * Classify discovered devices into access points and regular clients.
   * APs are identified by:
   * 1. MAC OUI matching known infrastructure vendors (Cisco, Juniper, Aruba, etc.)
   * 2. Vendor name matching known infrastructure brands
   * 3. Gateway IP heuristic (IPs ending in .1 or .254 with infra vendor)
   */
  private classifyDevices(
    devices: DiscoveredDevice[]
  ): { aps: DiscoveredDevice[]; clients: DiscoveredDevice[] } {
    const aps: DiscoveredDevice[] = [];
    const clients: DiscoveredDevice[] = [];

    // Detect default gateway
    const gatewayIp = this.detectGateway();

    for (const device of devices) {
      // Local device is never classified as an AP
      if (device.isLocal) {
        clients.push(device);
      } else if (device.isAP) {
        // Already marked as AP (e.g. from traceroute discovery)
        device.deviceType = device.deviceType || this.getInfraDeviceType(device);
        aps.push(device);
      } else if (this.isNetworkInfra(device, gatewayIp)) {
        device.isAP = true;
        device.deviceType = device.deviceType || this.getInfraDeviceType(device);
        aps.push(device);
      } else {
        clients.push(device);
      }
    }

    if (aps.length > 0) {
      console.log(
        `📶 Found ${aps.length} network infrastructure device(s): ${aps.map((a) => `${a.ip} (${a.vendor ?? "?"})`).join(", ")}`
      );
    }

    // --- Ensure each configured subnet has at least one AP ---
    // On enterprise networks, per-floor APs may be unreachable from L2.
    // For each subnet that has clients but no AP, synthesize a virtual gateway AP.
    const clientsBySubnet = new Map<string, DiscoveredDevice[]>();
    for (const c of clients) {
      const parts = c.ip.split(".");
      if (parts.length === 4) {
        const prefix = parts.slice(0, 3).join(".");
        const existing = clientsBySubnet.get(prefix) || [];
        existing.push(c);
        clientsBySubnet.set(prefix, existing);
      }
    }

    const apSubnets = new Set<string>();
    for (const ap of aps) {
      const parts = ap.ip.split(".");
      if (parts.length === 4) {
        apSubnets.add(parts.slice(0, 3).join("."));
      }
    }

    for (const mapping of this.subnetMappings) {
      const prefix = mapping.subnetPrefix;
      if (apSubnets.has(prefix)) continue; // Already have an AP for this subnet

      // Determine how many clients are on this subnet
      const subnetClients = clientsBySubnet.get(prefix) || [];

      // Generate a virtual gateway AP for this subnet
      const virtualIp = `${prefix}.1`;
      const virtualMac = `00:00:5e:${prefix
        .split(".")
        .slice(1)
        .map((o) => parseInt(o, 10).toString(16).padStart(2, "0"))
        .join(":")}:01`;

      const virtualAP: DiscoveredDevice = {
        ip: virtualIp,
        mac: virtualMac,
        hostname: `gw-${prefix.replace(/\./g, "-")}`,
        vendor: "Virtual Gateway",
        deviceType: `Passerelle ${prefix}`,
        isAP: true,
      };

      aps.push(virtualAP);
      console.log(
        `🏗️  Virtual AP for subnet ${prefix}: ${virtualIp} (${subnetClients.length} clients on subnet)`
      );
    }

    // Also generate virtual APs for subnets that have clients but no mapping
    // (covers cases where devices appear on unexpected subnets)
    for (const [prefix, subnetClients] of clientsBySubnet) {
      if (apSubnets.has(prefix)) continue;
      // Check if we already added a virtual AP for this prefix
      if (aps.some(a => a.ip === `${prefix}.1`)) continue;

      const virtualIp = `${prefix}.1`;
      const virtualMac = `00:00:5e:${prefix
        .split(".")
        .slice(1)
        .map((o) => parseInt(o, 10).toString(16).padStart(2, "0"))
        .join(":")}:01`;

      aps.push({
        ip: virtualIp,
        mac: virtualMac,
        hostname: `gw-${prefix.replace(/\./g, "-")}`,
        vendor: "Virtual Gateway",
        deviceType: `Passerelle ${prefix}`,
        isAP: true,
      });

      console.log(
        `🏗️  Virtual AP for subnet ${prefix} (unmapped): ${virtualIp} (${subnetClients.length} clients)`
      );
    }

    return { aps, clients };
  }

  /**
   * Check if a device is network infrastructure (AP, router, switch).
   */
  private isNetworkInfra(device: DiscoveredDevice, gatewayIp: string | null): boolean {
    const mac = device.mac.toLowerCase();
    const oui = mac.split(":").slice(0, 3).join(":");

    // 1. Direct OUI match (Juniper/Mist)
    if (MIST_JUNIPER_OUIS.includes(oui)) return true;

    // 2. Broader infra vendor OUI match (Cisco, Aruba, Ubiquiti, etc.)
    if (INFRA_VENDOR_OUIS.includes(oui)) return true;

    // 3. Known infrastructure vendor name from OUI lookup
    if (device.vendor) {
      const vendorLower = device.vendor.toLowerCase();
      if (INFRA_VENDOR_NAMES.some((name) => vendorLower.includes(name))) return true;
    }

    // 4. Default gateway IP → always an AP/router
    if (gatewayIp && device.ip === gatewayIp) return true;

    // 5. Multicast / broadcast addresses → skip (not infra)
    if (mac.startsWith("01:") || mac.startsWith("ff:")) return false;

    return false;
  }

  /**
   * Detect the default gateway IP address.
   */
  private detectGateway(): string | null {
    try {
      if (process.platform === "darwin") {
        const output = execSync("route -n get default 2>/dev/null", {
          encoding: "utf-8",
          timeout: 5000,
        });
        const match = output.match(/gateway:\s*(\S+)/);
        if (match) return match[1];
      } else {
        const output = execSync("ip route show default 2>/dev/null", {
          encoding: "utf-8",
          timeout: 5000,
        });
        const match = output.match(/via\s+(\S+)/);
        if (match) return match[1];
      }
    } catch {
      // Gateway detection failed
    }
    return null;
  }

  /**
   * Check if a MAC address matches a known Juniper/Mist OUI.
   */
  private isMistAP(mac: string): boolean {
    const oui = mac.toLowerCase().split(":").slice(0, 3).join(":");
    return MIST_JUNIPER_OUIS.includes(oui);
  }

  /**
   * Get a display-friendly device type for infrastructure devices.
   */
  private getInfraDeviceType(device: DiscoveredDevice): string {
    const vendor = (device.vendor ?? "").toLowerCase();
    if (vendor.includes("cisco") || vendor.includes("meraki")) return "Routeur Cisco";
    if (vendor.includes("juniper") || vendor.includes("mist")) return "Point d'accès Juniper";
    if (vendor.includes("aruba")) return "Point d'accès Aruba";
    if (vendor.includes("ubiquiti") || vendor.includes("unifi")) return "Point d'accès Ubiquiti";
    if (vendor.includes("ruckus")) return "Point d'accès Ruckus";
    if (vendor.includes("tp-link")) return "Routeur TP-Link";
    if (vendor.includes("netgear")) return "Routeur Netgear";
    return "Point d'accès";
  }

  // ── Place access points into rooms ───────────────────────────────────────

  /**
   * Place discovered APs into rooms (1 AP per room, deterministically).
   * Each AP gets a central position in its assigned room.
   */
  private async placeAccessPoints(
    aps: DiscoveredDevice[]
  ): Promise<number> {
    await this.ensureRoomCache();
    const io = getIO();
    let placed = 0;

    // Load persisted router → room assignments from DB
    const assignments = await this.loadRouterAssignments();

    // Clear old AP data
    this.accessPoints.clear();

    for (const ap of aps) {
      const macHash = hashMac(ap.mac);

      // Priority 1: Use persisted assignment from admin panel
      const assignment = assignments.get(macHash);
      let floorId: string | null = null;
      let roomId: string | null = null;

      if (assignment && assignment.floorId) {
        floorId = assignment.floorId;
        roomId = assignment.roomId;
      } else {
        // Priority 2: Resolve from subnet mapping
        const resolved = this.resolveLocation(ap);
        floorId = resolved.floorId;
        roomId = resolved.roomId;
      }

      if (!floorId) continue;

      // AP gets placed at room centroid (stable, center of room)
      const position = this.getAPPosition(floorId, roomId);
      if (!position) continue;

      // Use admin label if available
      const displayLabel = assignment?.label ?? ap.hostname ?? null;

      // Store AP info
      this.accessPoints.set(macHash, {
        mac: ap.mac,
        ip: ap.ip,
        roomId,
        floorId,
        position,
      });

      // Write AP to Redis
      const now = new Date().toISOString();
      const deviceKey = `device:${macHash}`;

      await redis.hset(deviceKey, {
        id: macHash,
        x: position.x.toString(),
        y: position.y.toString(),
        z: position.z.toString(),
        roomId: roomId ?? "",
        floorId,
        lastSeen: now,
        source: "network-scan",
        ip: ap.ip,
        mac: ap.mac,
        hostname: displayLabel ?? ap.hostname ?? "",
        vendor: ap.vendor ?? "",
        deviceType: ap.deviceType ?? this.getInfraDeviceType(ap),
        isAP: "true",
        isLocal: ap.isLocal ? "true" : "false",
      });

      await redis.expire(deviceKey, Math.ceil((this.intervalMs * 3) / 1000));
      await redis.sadd(`floor:${floorId}:devices`, macHash);

      placed++;
    }

    console.log(
      `📡 Placed ${placed} APs into rooms: ${[...this.accessPoints.entries()]
        .map(([id, ap]) => `${ap.ip} → room ${ap.roomId?.slice(-4) ?? "?"}`)
        .join(", ")}`
    );

    return placed;
  }

  /**
   * Load persisted router → room assignments from Postgres.
   */
  private async loadRouterAssignments(): Promise<
    Map<string, { floorId: string | null; roomId: string | null; label: string | null }>
  > {
    const map = new Map<string, { floorId: string | null; roomId: string | null; label: string | null }>();
    try {
      const assignments = await prisma.routerAssignment.findMany();
      for (const a of assignments) {
        map.set(a.macHash, {
          floorId: a.floorId,
          roomId: a.roomId,
          label: a.label,
        });
      }
    } catch (err) {
      console.warn("⚠️ Could not load router assignments:", err);
    }
    return map;
  }

  /**
   * Get AP position: centroid of its assigned room.
   */
  private getAPPosition(floorId: string, roomId: string | null): SceneCoordinate | null {
    const rooms = this.roomCache.get(floorId);
    if (!rooms) return null;

    const room = roomId ? rooms.find((r) => r.id === roomId) : rooms[0];
    if (!room || room.polygon.length < 3) return null;

    const cx = room.polygon.reduce((s, p) => s + p.x, 0) / room.polygon.length;
    const cy = room.polygon.reduce((s, p) => s + p.y, 0) / room.polygon.length;

    return { x: cx, y: 1.2, z: cy }; // Higher Y = mounted on ceiling/wall
  }

  // ── Place client devices & associate to nearest AP ────────────────────────

  /**
   * Place client devices and associate each to the nearest AP.
   * If an AP exists in a room, its clients are placed in that same room.
   */
  private async placeClientDevices(
    clients: DiscoveredDevice[]
  ): Promise<number> {
    await this.ensureRoomCache();
    const io = getIO();
    let placed = 0;

    // Build a list of APs with their subnet info for association
    const apList = [...this.accessPoints.entries()].map(([id, info]) => ({
      id,
      ...info,
      subnet: info.ip.split(".").slice(0, 3).join("."),
    }));

    // Reset device → AP mapping
    this.deviceToAp.clear();

    for (const device of clients) {
      const macHash = hashMac(device.mac);

      // Find the nearest AP to this device
      const nearestAp = this.findNearestAP(device, apList);

      let floorId: string | null;
      let roomId: string | null;
      let connectedApName: string | null = null;

      if (nearestAp) {
        // Device is associated to an AP → place it in the AP's room
        floorId = nearestAp.floorId;
        roomId = nearestAp.roomId;
        this.deviceToAp.set(macHash, nearestAp.id);
        connectedApName = nearestAp.ip; // Use AP IP as display name
      } else {
        // No AP found → fallback to subnet/IP-hash distribution
        const resolved = this.resolveLocation(device);
        floorId = resolved.floorId;
        roomId = resolved.roomId;
      }

      if (!floorId) continue;

      // Get a stable position within the room
      const position = this.getStablePosition(macHash, floorId, roomId);
      if (!position) continue;

      // Write to Redis
      const now = new Date().toISOString();
      const deviceKey = `device:${macHash}`;

      await redis.hset(deviceKey, {
        id: macHash,
        x: position.x.toString(),
        y: position.y.toString(),
        z: position.z.toString(),
        roomId: roomId ?? "",
        floorId,
        lastSeen: now,
        source: "network-scan",
        ip: device.ip,
        mac: device.mac,
        hostname: device.hostname ?? "",
        vendor: device.vendor ?? "",
        deviceType: device.deviceType ?? "",
        isAP: "false",
        isLocal: device.isLocal ? "true" : "false",
        connectedApId: nearestAp?.id ?? "",
        connectedApName: connectedApName ?? "",
      });

      await redis.expire(deviceKey, Math.ceil((this.intervalMs * 3) / 1000));
      await redis.sadd(`floor:${floorId}:devices`, macHash);

      placed++;
    }

    // Broadcast full device list per floor (with AP + mesh data)
    await this.broadcastFloorDevices();

    return placed;
  }

  /**
   * Find the nearest AP to a client device.
   * Strategy:
   * 1. For the local device, match via BSSID (WiFi AP MAC) — most accurate
   * 2. Same subnet, single AP → deterministic
   * 3. Multiple APs on same subnet → closest by last IP octet
   */
  private findNearestAP(
    device: DiscoveredDevice,
    apList: Array<{ id: string; mac: string; ip: string; roomId: string | null; floorId: string; subnet: string }>
  ): (typeof apList)[number] | null {
    if (apList.length === 0) return null;

    // Strategy 1: BSSID match for local device (most reliable)
    if (device.isLocal && this.currentBssid) {
      const bssidMatch = apList.find(
        (ap) => ap.mac.toLowerCase() === this.currentBssid
      );
      if (bssidMatch) {
        console.log(`🎯 Local device linked to AP via BSSID: ${bssidMatch.ip} (${this.currentBssid})`);
        return bssidMatch;
      }
    }

    const deviceSubnet = device.ip.split(".").slice(0, 3).join(".");

    // Filter APs on the same subnet
    const sameSubnet = apList.filter((ap) => ap.subnet === deviceSubnet);

    if (sameSubnet.length === 1) {
      return sameSubnet[0];
    }

    // Multiple APs on same subnet: pick closest by last octet distance
    const candidates = sameSubnet.length > 0 ? sameSubnet : apList;
    const deviceLastOctet = parseInt(device.ip.split(".")[3]);

    let nearest = candidates[0];
    let minDist = Infinity;

    for (const ap of candidates) {
      const apLastOctet = parseInt(ap.ip.split(".")[3]);
      const dist = Math.abs(deviceLastOctet - apLastOctet);
      if (dist < minDist) {
        minDist = dist;
        nearest = ap;
      }
    }

    return nearest;
  }

  /**
   * Broadcast updated device lists (with AP + mesh data) per floor.
   */
  private async broadcastFloorDevices(): Promise<void> {
    const io = getIO();
    const allFloorIds = new Set<string>();

    // Collect all floor IDs from APs and device-to-AP mappings
    for (const [, ap] of this.accessPoints) {
      allFloorIds.add(ap.floorId);
    }

    // Also include floors from subnet mappings
    for (const mapping of this.subnetMappings) {
      allFloorIds.add(mapping.floorId);
    }

    if (this.defaultFloorId) allFloorIds.add(this.defaultFloorId);

    for (const floorId of allFloorIds) {
      const deviceIds = await redis.smembers(`floor:${floorId}:devices`);
      const devices: Device[] = [];

      for (const id of deviceIds) {
        const data = await redis.hgetall(`device:${id}`);
        if (!data?.id) continue;

        devices.push({
          id: data.id,
          position: {
            x: parseFloat(data.x || "0"),
            y: parseFloat(data.y || "0"),
            z: parseFloat(data.z || "0"),
          } as SceneCoordinate,
          roomId: data.roomId || null,
          floorId: data.floorId,
          lastSeen: data.lastSeen,
          hostname: data.hostname || null,
          mac: data.mac || null,
          ip: data.ip || null,
          vendor: data.vendor || null,
          deviceType: data.deviceType || null,
          isLocal: data.isLocal === "true",
          source: data.source || "network-scan",
          isAccessPoint: data.isAP === "true",
          connectedApId: data.connectedApId || null,
          connectedApName: data.connectedApName || null,
        });
      }

      io.to(`floor:${floorId}`).emit("devices:update", devices);
    }
  }

  /**
   * Get structured AP info for the API.
   * Includes connected client device summaries for each AP.
   */
  getAccessPoints(): AccessPointInfo[] {
    const apInfos: AccessPointInfo[] = [];

    for (const [id, ap] of this.accessPoints) {
      // Count connected devices
      const connectedDeviceIds: string[] = [];
      for (const [deviceId, apId] of this.deviceToAp) {
        if (apId === id) connectedDeviceIds.push(deviceId);
      }

      // Build connected client labels from the last scan result
      const connectedClients: Array<{ id: string; label: string }> = [];
      if (this.lastScanResult) {
        for (const d of this.lastScanResult.devices) {
          const dHash = hashMac(d.mac);
          if (connectedDeviceIds.includes(dHash)) {
            const label = d.hostname ?? d.ip ?? dHash.slice(0, 8);
            connectedClients.push({ id: dHash, label });
          }
        }
      }

      apInfos.push({
        id,
        position: ap.position,
        roomId: ap.roomId,
        floorId: ap.floorId,
        mac: ap.mac,
        ip: ap.ip,
        clientCount: connectedDeviceIds.length,
        connectedDeviceIds,
        connectedClients,
      });
    }

    return apInfos;
  }

  // ── Location resolution ──────────────────────────────────────────────────

  /**
   * Resolve a device's location based on subnet mappings.
   * Falls back to distributing across rooms on the default floor.
   */
  private resolveLocation(
    device: DiscoveredDevice
  ): { floorId: string | null; roomId: string | null } {
    // Check explicit subnet mappings first
    for (const mapping of this.subnetMappings) {
      if (device.ip.startsWith(mapping.subnetPrefix)) {
        if (mapping.roomId) {
          return { floorId: mapping.floorId, roomId: mapping.roomId };
        }
        // Floor-level mapping — distribute across rooms on this floor
        return this.distributeToRoom(device, mapping.floorId);
      }
    }

    // Fallback: use default floor, distribute across rooms deterministically
    const floorId = this.defaultFloorId ?? null;
    if (!floorId) return { floorId: null, roomId: null };

    return this.distributeToRoom(device, floorId);
  }

  /**
   * Deterministically distribute a device into a room on the given floor
   * based on its IP address hash.
   */
  private distributeToRoom(
    device: DiscoveredDevice,
    floorId: string
  ): { floorId: string; roomId: string | null } {
    const rooms = this.roomCache.get(floorId);
    if (!rooms || rooms.length === 0) return { floorId, roomId: null };

    // Deterministic room assignment based on IP hash
    const ipNum = device.ip
      .split(".")
      .reduce((acc, octet) => acc * 256 + parseInt(octet), 0);
    const roomIdx = Math.abs(ipNum) % rooms.length;

    return { floorId, roomId: rooms[roomIdx].id };
  }

  // ── Position generation ──────────────────────────────────────────────────

  /**
   * Generate a stable random position within a room's polygon.
   * The position is cached so the device doesn't jump between scans.
   */
  private getStablePosition(
    macHash: string,
    floorId: string,
    roomId: string | null
  ): SceneCoordinate | null {
    // Return cached position if available
    if (this.positionCache.has(macHash)) {
      return this.positionCache.get(macHash)!;
    }

    const rooms = this.roomCache.get(floorId);
    if (!rooms) return null;

    const room = roomId ? rooms.find((r) => r.id === roomId) : rooms[0];
    if (!room) return null;

    // Generate a random point inside the room polygon
    const position = this.randomPointInPolygon(room.polygon);
    const scenePos: SceneCoordinate = {
      x: position.x,
      y: 0.5, // Slightly above floor for visibility
      z: position.y,
    };

    this.positionCache.set(macHash, scenePos);
    return scenePos;
  }

  /**
   * Generate a random point inside a polygon using bounding box + rejection.
   */
  private randomPointInPolygon(polygon: Point2D[]): Point2D {
    if (polygon.length < 3) {
      return polygon[0] ?? { x: 0, y: 0 };
    }

    // Bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const p of polygon) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    // Add margin to keep points away from walls
    const marginX = (maxX - minX) * 0.1;
    const marginY = (maxY - minY) * 0.1;
    minX += marginX;
    maxX -= marginX;
    minY += marginY;
    maxY -= marginY;

    // Rejection sampling
    for (let i = 0; i < 100; i++) {
      const x = minX + Math.random() * (maxX - minX);
      const y = minY + Math.random() * (maxY - minY);

      if (this.isPointInPolygon({ x, y }, polygon)) {
        return { x, y };
      }
    }

    // Fallback: centroid
    const cx = polygon.reduce((s, p) => s + p.x, 0) / polygon.length;
    const cy = polygon.reduce((s, p) => s + p.y, 0) / polygon.length;
    return { x: cx, y: cy };
  }

  private isPointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // ── Configuration loading ────────────────────────────────────────────────

  private async loadMappings(): Promise<void> {
    // Load subnet → room mappings from SCAN_SUBNET_MAP env variable
    // Format: "prefix1:floorId[:roomId],prefix2:floorId[:roomId]"
    // roomId is optional — if omitted, devices are distributed across rooms on the floor
    const mapStr = process.env.SCAN_SUBNET_MAP;
    if (mapStr) {
      this.subnetMappings = mapStr.split(",").map((entry) => {
        const parts = entry.trim().split(":");
        return {
          subnetPrefix: parts[0],
          floorId: parts[1],
          roomId: parts[2] || undefined,
        };
      });
      console.log(
        `📋 Loaded ${this.subnetMappings.length} subnet → room mappings`
      );
    }

    // If no default floor set, pick the first floor from DB
    if (!this.defaultFloorId) {
      const firstFloor = await prisma.floor.findFirst({
        orderBy: { level: "asc" },
        select: { id: true, name: true },
      });
      if (firstFloor) {
        this.defaultFloorId = firstFloor.id;
        console.log(`🏢 Default floor: ${firstFloor.name} (${firstFloor.id})`);
      }
    }
  }

  private async ensureRoomCache(): Promise<void> {
    if (this.roomCache.size > 0) return;

    const floors = await prisma.floor.findMany({
      include: {
        rooms: {
          select: { id: true, polygon: true },
        },
      },
    });

    for (const floor of floors) {
      this.roomCache.set(
        floor.id,
        floor.rooms
          .filter((r) => r.polygon && Array.isArray(r.polygon))
          .map((r) => ({
            id: r.id,
            polygon: r.polygon as unknown as Point2D[],
          }))
      );
    }

    console.log(
      `🗺️  Room cache loaded: ${floors.length} floors, ${floors.reduce((s, f) => s + f.rooms.length, 0)} rooms`
    );
  }
}
