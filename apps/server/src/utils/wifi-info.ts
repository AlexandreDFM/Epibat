/**
 * File Name: wifi-info.ts
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: WiFi network information retrieval (SSID, BSSID, signal).
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

/**
 * WiFi Information Utility
 *
 * Attempts to retrieve the BSSID (WiFi access point MAC) of the currently
 * connected network. On macOS ≥ 14, BSSID is restricted without Location
 * Services entitlement. Multiple strategies are tried:
 *
 * 1. `system_profiler SPAirPortDataType` (may be redacted)
 * 2. `wdutil info` (requires root — skipped unless elevated)
 * 3. Fallback to WiFi channel + SSID for manual AP mapping
 */

import { execSync } from "child_process";

export interface WiFiInfo {
  ssid?: string;
  bssid?: string;
  channel?: number;
  band?: string; // "2.4GHz" | "5GHz" | "6GHz"
  rssi?: number;
  security?: string;
  /** Whether BSSID was actually resolved (false = redacted/unavailable) */
  bssidResolved: boolean;
}

/**
 * Try to get WiFi info from the system.
 */
export function getWiFiInfo(): WiFiInfo {
  const info: WiFiInfo = { bssidResolved: false };

  // Strategy 1: system_profiler
  try {
    const output = execSync(
      "system_profiler SPAirPortDataType 2>/dev/null",
      { encoding: "utf-8", timeout: 10_000 }
    );

    // Parse SSID — look for "Current Network Information:" section
    const currentNetMatch = output.match(
      /Current Network Information:\s*\n\s*(\S[^\n:]+):/
    );
    if (currentNetMatch) {
      info.ssid = currentNetMatch[1].trim();
    }

    // Parse BSSID
    const bssidMatch = output.match(/BSSID:\s*([0-9a-fA-F:]{17})/);
    if (bssidMatch) {
      info.bssid = bssidMatch[1].toLowerCase();
      info.bssidResolved = true;
    }

    // Parse Channel
    const channelMatch = output.match(/Channel:\s*(\d+)/);
    if (channelMatch) {
      const ch = parseInt(channelMatch[1], 10);
      info.channel = ch;
      if (ch <= 14) info.band = "2.4GHz";
      else if (ch <= 177) info.band = "5GHz";
      else info.band = "6GHz";
    }

    // Parse Security
    const secMatch = output.match(/Security:\s*(.+)/);
    if (secMatch) {
      info.security = secMatch[1].trim();
    }

    // Parse RSSI/Signal
    const rssiMatch = output.match(/Signal\s*\/\s*Noise:\s*(-?\d+)/);
    if (rssiMatch) {
      info.rssi = parseInt(rssiMatch[1], 10);
    }
  } catch {
    // system_profiler not available (Linux etc.)
  }

  // Strategy 2: try `networksetup -getairportnetwork en0` for SSID
  if (!info.ssid) {
    try {
      const output = execSync(
        "networksetup -getairportnetwork en0 2>/dev/null",
        { encoding: "utf-8", timeout: 5000 }
      );
      const match = output.match(/Current Wi-Fi Network:\s*(.+)/);
      if (match) {
        info.ssid = match[1].trim();
      }
    } catch {
      // not available
    }
  }

  // Strategy 3: on Linux, try `iwconfig` or `nmcli`
  if (!info.ssid) {
    try {
      const output = execSync("iwconfig 2>/dev/null", {
        encoding: "utf-8",
        timeout: 5000,
      });
      const ssidMatch = output.match(/ESSID:"([^"]+)"/);
      if (ssidMatch) info.ssid = ssidMatch[1];

      const apMatch = output.match(
        /Access Point:\s*([0-9A-Fa-f:]{17})/
      );
      if (apMatch) {
        info.bssid = apMatch[1].toLowerCase();
        info.bssidResolved = true;
      }

      const freqMatch = output.match(/Frequency:(\d+(?:\.\d+)?)\s*GHz/);
      if (freqMatch) {
        const freq = parseFloat(freqMatch[1]);
        if (freq < 3) info.band = "2.4GHz";
        else if (freq < 6) info.band = "5GHz";
        else info.band = "6GHz";
      }
    } catch {
      // Linux tools not available
    }
  }

  return info;
}

/**
 * AP Configuration — manually map known APs to rooms.
 * This is used when BSSID cannot be automatically detected (macOS restriction).
 *
 * Format: Map<bssid, { floorLevel, roomName }>
 */
export interface APLocationConfig {
  bssid: string;
  floorLevel: number;
  roomName: string;
  channel?: number;
  description?: string;
}

/**
 * Load AP location mappings from environment variable.
 * Format: BSSID:floorLevel:roomName,BSSID:floorLevel:roomName,...
 * Example: "aa:bb:cc:dd:ee:ff:3:Salle 301,11:22:33:44:55:66:3:Salle 302"
 */
export function loadAPLocations(): APLocationConfig[] {
  const raw = process.env.MIST_AP_LOCATIONS;
  if (!raw) return [];

  return raw.split(",").map((entry) => {
    // Format: MAC(17):level:roomName
    const bssid = entry.substring(0, 17).toLowerCase();
    const rest = entry.substring(18);
    const colonIdx = rest.indexOf(":");
    const floorLevel = parseInt(rest.substring(0, colonIdx), 10);
    const roomName = rest.substring(colonIdx + 1);

    return { bssid, floorLevel, roomName };
  });
}

/**
 * Get a summary string of the current WiFi connection.
 */
export function getWiFiSummary(): string {
  const info = getWiFiInfo();
  const parts: string[] = [];

  if (info.ssid) parts.push(`SSID: ${info.ssid}`);
  if (info.bssidResolved && info.bssid) parts.push(`BSSID: ${info.bssid}`);
  else parts.push("BSSID: unavailable (macOS restriction)");
  if (info.channel) parts.push(`Channel: ${info.channel} (${info.band})`);
  if (info.rssi) parts.push(`RSSI: ${info.rssi} dBm`);

  return parts.join(", ") || "WiFi info unavailable";
}
