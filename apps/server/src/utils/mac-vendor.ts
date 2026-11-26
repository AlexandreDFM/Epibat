/**
 * File Name: mac-vendor.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: MAC address vendor/OUI lookup for device classification.
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

import * as os from "os";
import * as https from "https";

// ─── MAC Address Utilities ──────────────────────────────────────────────────

/**
 * Normalize a MAC address: pad each octet to 2 hex digits, uppercase.
 * Handles ARP-output shortened MACs like "6c:a1:0:15:8f:70" → "6C:A1:00:15:8F:70"
 */
export function normalizeMac(mac: string): string | null {
    if (!mac) return null;
    const parts = mac.split(":");
    if (parts.length !== 6) return null;
    return parts.map((p) => p.padStart(2, "0").toUpperCase()).join(":");
}

/**
 * Check if a MAC is locally administered (randomized).
 * Bit 1 of the first byte indicates a locally administered address.
 * iOS, Android, Windows 10+ randomize MAC by default on WiFi.
 */
export function isRandomizedMac(mac: string): boolean {
    const normalized = normalizeMac(mac);
    if (!normalized) return false;
    const firstByte = parseInt(normalized.substring(0, 2), 16);
    return (firstByte & 0x02) !== 0;
}

/**
 * Check if a MAC is a multicast address.
 * Bit 0 of the first byte indicates multicast.
 */
export function isMulticastMac(mac: string): boolean {
    const normalized = normalizeMac(mac);
    if (!normalized) return false;
    const firstByte = parseInt(normalized.substring(0, 2), 16);
    return (firstByte & 0x01) !== 0;
}

/**
 * Get local machine IP addresses (all network interfaces).
 */
export function getLocalIPs(): string[] {
    const interfaces = os.networkInterfaces();
    const ips: string[] = [];

    for (const iface of Object.values(interfaces)) {
        if (!iface) continue;
        for (const info of iface) {
            if (info.family === "IPv4" && !info.internal) {
                ips.push(info.address);
            }
        }
    }

    return ips;
}

/**
 * Get local machine MAC addresses.
 */
export function getLocalMACs(): string[] {
    const interfaces = os.networkInterfaces();
    const macs: string[] = [];

    for (const iface of Object.values(interfaces)) {
        if (!iface) continue;
        for (const info of iface) {
            if (
                info.mac &&
                info.mac !== "00:00:00:00:00:00" &&
                !info.internal
            ) {
                macs.push(info.mac.toLowerCase());
            }
        }
    }

    return [...new Set(macs)];
}

// ─── OUI Vendor Database ────────────────────────────────────────────────────
// Key: first 3 bytes of MAC, uppercase, no separators (e.g. "3CE9F7")
// Value: vendor name

const OUI_DATABASE: Record<string, string> = {
    // ── Apple ────────────────────────────
    "3CE9F7": "Apple",
    E4C767: "Apple",
    A483E7: "Apple",
    "149877": "Apple",
    ACBC32: "Apple",
    F0DBE2: "Apple",
    DCA4CA: "Apple",
    "38C986": "Apple",
    C869CD: "Apple",
    "647033": "Apple",
    "28ED6A": "Apple",
    "80E650": "Apple",
    F84D89: "Apple",
    "7831C1": "Apple",
    DC56E7: "Apple",
    "14109F": "Apple",
    B065BD: "Apple",
    F0C1F1: "Apple",
    D4619D: "Apple",
    AC61EA: "Apple",
    "1C9E46": "Apple",
    "6476BA": "Apple",
    F437B7: "Apple",
    "8866A5": "Apple",
    "302490": "Apple",
    "70CD60": "Apple",
    D8004D: "Apple",
    A8FAD8: "Apple",
    "5855CA": "Apple",
    B844D9: "Apple",
    "6C709F": "Apple",
    "786C1C": "Apple",
    D0817A: "Apple",
    BCB1F3: "Apple",
    CC785F: "Apple",
    "3C2EF9": "Apple",
    "484BAA": "Apple",
    B853AC: "Apple",
    "18AF61": "Apple",
    A4B197: "Apple",
    "0C3021": "Apple",
    C0B658: "Apple",
    F0B479: "Apple",
    "8C8590": "Apple",
    AC7F3E: "Apple",
    A860B6: "Apple",
    "985FD3": "Apple",
    A45E60: "Apple",
    "041552": "Apple",
    "60F81D": "Apple",
    "24F094": "Apple",
    C82A14: "Apple",

    // ── Samsung ──────────────────────────
    "843838": "Samsung",
    "500IBB": "Samsung",
    A87C01: "Samsung",
    D087E2: "Samsung",
    "9463D1": "Samsung",
    C8BA94: "Samsung",
    "3414B5": "Samsung",
    D83134: "Samsung",
    BC4486: "Samsung",
    "78471D": "Samsung",
    "842599": "Samsung",
    "8C F5A3": "Samsung",
    E47CF9: "Samsung",
    "501ABB": "Samsung",
    "5077D5": "Samsung",
    F425B7: "Samsung",
    F87B7A: "Samsung",
    C45006: "Samsung",
    "6C2F2C": "Samsung",
    "58C38B": "Samsung",
    B4791C: "Samsung",
    CC07AB: "Samsung",
    AC5F3E: "Samsung",

    // ── Google / Pixel ───────────────────
    "3C5AB4": "Google",
    "546009": "Google",
    F4F5D8: "Google",
    F4F5E8: "Google",
    "94EB2C": "Google",
    A47733: "Google",
    "30FD38": "Google",
    "48D6D5": "Google",
    "58CB52": "Google",
    F80FF9: "Google",

    // ── Microsoft / Xbox ─────────────────
    "0050F2": "Microsoft",
    "281878": "Microsoft",
    "7C1E52": "Microsoft",
    DCB4C4: "Microsoft",
    "0025AE": "Microsoft",
    "28187D": "Microsoft",
    B4AE2B: "Microsoft",

    // ── Dell ─────────────────────────────
    "001422": "Dell",
    "246E96": "Dell",
    "3417EB": "Dell",
    F8B156: "Dell",
    "801844": "Dell",
    B083FE: "Dell",
    D4BED9: "Dell",
    F48E38: "Dell",
    D481D7: "Dell",
    "509A4C": "Dell",
    "8CEC4B": "Dell",
    A4BADB: "Dell",
    F8DABB: "Dell",
    F0D4E2: "Dell",

    // ── HP / HPE ─────────────────────────
    "0017A4": "HP",
    "101F74": "HP",
    "3CD92B": "HP",
    "9457A5": "HP",
    "308D99": "HP",
    "3C4A92": "HP",
    "6C3B6B": "HP",
    B8AF67: "HP",
    F0921C: "HP",
    "000A57": "HP",
    "0010E3": "HP",
    "001560": "HP",

    // ── Lenovo ───────────────────────────
    "28D244": "Lenovo",
    "5C5015": "Lenovo",
    "54EE75": "Lenovo",
    "98FA9B": "Lenovo",
    FC4482: "Lenovo",
    "507B9D": "Lenovo",
    "6CF049": "Lenovo",
    C85B76: "Lenovo",
    "68F728": "Lenovo",
    D057B6: "Lenovo",
    E86A64: "Lenovo",
    A434D9: "Lenovo",

    // ── Intel ────────────────────────────
    "001E64": "Intel",
    "3CF862": "Intel",
    "4851B7": "Intel",
    "8086F2": "Intel",
    A088B4: "Intel",
    D07E35: "Intel",
    E4F042: "Intel",
    F0D5BF: "Intel",
    B496BF: "Intel",
    D43B04: "Intel",
    "9C4E36": "Intel",
    A4C494: "Intel",
    "7C5CF8": "Intel",

    // ── Cisco / Meraki ───────────────────
    "00000C": "Cisco",
    "3C5731": "Cisco",
    "0026CB": "Cisco",
    "70DB98": "Cisco",
    "001BD4": "Cisco",
    BCEB18: "Cisco",
    "00184D": "Cisco",
    "001C01": "Cisco",
    "0016C7": "Cisco",
    D4D7C8: "Cisco",
    "000B85": "Cisco",
    "001A2F": "Cisco",
    "0C8DDB": "Cisco Meraki",
    "0C2724": "Cisco Meraki",
    AC17C8: "Cisco Meraki",
    "E0CB BC": "Cisco Meraki",

    // ── Juniper / Mist ───────────────────
    "5C5B35": "Juniper",
    "88E0F3": "Juniper",
    "2C2172": "Juniper",
    AC4BC8: "Juniper",
    F077C3: "Juniper",
    "3C6104": "Juniper",
    "40B4F0": "Juniper",
    "648788": "Juniper",
    D420B0: "Juniper Mist",
    "5CE91E": "Juniper Mist",

    // ── TP-Link ──────────────────────────
    "0023CD": "TP-Link",
    "14CC20": "TP-Link",
    "30B5C2": "TP-Link",
    "503EAA": "TP-Link",
    B0A737: "TP-Link",
    C025E9: "TP-Link",
    "6C5D3A": "TP-Link",
    E848B8: "TP-Link",
    "60E327": "TP-Link",
    "5C899A": "TP-Link",
    A842A1: "TP-Link",

    // ── Netgear ──────────────────────────
    "00146C": "Netgear",
    "001E2A": "Netgear",
    "001F33": "Netgear",
    "002275": "Netgear",
    "008EF2": "Netgear",
    "204E7F": "Netgear",
    C43DC7: "Netgear",
    "6CB0CE": "Netgear",

    // ── Ubiquiti / UniFi ─────────────────
    "0418D6": "Ubiquiti",
    "18E829": "Ubiquiti",
    "24A43C": "Ubiquiti",
    "44D9E7": "Ubiquiti",
    "687251": "Ubiquiti",
    "74ACB9": "Ubiquiti",
    "788A20": "Ubiquiti",
    "802AA8": "Ubiquiti",
    B4FBE4: "Ubiquiti",
    F09FC2: "Ubiquiti",
    FCECDA: "Ubiquiti",

    // ── Aruba / HPE Aruba ────────────────
    "000B86": "Aruba",
    "001A1E": "Aruba",
    "00246C": "Aruba",
    "204C03": "Aruba",
    "24DEC6": "Aruba",
    "6CAAB3": "Aruba",
    "9C1C12": "Aruba",
    D8C7C8: "Aruba",

    // ── Huawei ───────────────────────────
    "001882": "Huawei",
    "001E10": "Huawei",
    "00259E": "Huawei",
    "04C06F": "Huawei",
    "20A680": "Huawei",
    "48D539": "Huawei",
    "5C7D5E": "Huawei",
    "707BE8": "Huawei",
    "88CEFA": "Huawei",
    C8D15E: "Huawei",
    F4C714: "Huawei",

    // ── Xiaomi ───────────────────────────
    "009EC8": "Xiaomi",
    "04CF8C": "Xiaomi",
    "286C07": "Xiaomi",
    "64CC2E": "Xiaomi",
    "7C1DD9": "Xiaomi",
    "8CBEBE": "Xiaomi",
    F48B32: "Xiaomi",
    F8A45F: "Xiaomi",
    "34CE00": "Xiaomi",
    B0E235: "Xiaomi",

    // ── ASUS ─────────────────────────────
    "000C6E": "ASUS",
    "001731": "ASUS",
    "002354": "ASUS",
    "049226": "ASUS",
    "107B44": "ASUS",
    "1C872C": "ASUS",
    "2C4D54": "ASUS",
    "3085A9": "ASUS",
    "50465D": "ASUS",
    AC9E17: "ASUS",
    C86000: "ASUS",
    F832E4: "ASUS",

    // ── Raspberry Pi ─────────────────────
    B827EB: "Raspberry Pi",
    DCA632: "Raspberry Pi",
    E45F01: "Raspberry Pi",
    D83ADD: "Raspberry Pi",
    "2CCF67": "Raspberry Pi",

    // ── Sony / PlayStation ───────────────
    "001D0D": "Sony",
    "00041F": "Sony",
    "001FA7": "Sony",
    "28:0D:FC": "Sony",
    F8D0AC: "Sony PlayStation",

    // ── Nintendo ─────────────────────────
    "002709": "Nintendo",
    "00191D": "Nintendo",
    "001656": "Nintendo",
    "002444": "Nintendo",
    "34AF2C": "Nintendo",
    "7CBB8A": "Nintendo",
    E84ECE: "Nintendo",
    "98B6E9": "Nintendo",

    // ── Broadcom ─────────────────────────
    "001018": "Broadcom",
    "001BE9": "Broadcom",
    "0010C6": "Broadcom",
    C87B5B: "Broadcom",

    // ── Qualcomm / Atheros ───────────────
    "001374": "Qualcomm Atheros",
    "001A6B": "Qualcomm Atheros",
    "001CDF": "Qualcomm Atheros",
    "045453": "Qualcomm Atheros",

    // ── Realtek ──────────────────────────
    "001020": "Realtek",
    "000CE6": "Realtek",
    "00E04C": "Realtek",
    "526B55": "Realtek",
    D8EB46: "Realtek",

    // ── D-Link ───────────────────────────
    "001346": "D-Link",
    "001195": "D-Link",
    "001CF0": "D-Link",
    "1CAFF7": "D-Link",
    "340804": "D-Link",
    "9094E4": "D-Link",

    // ── Synology ─────────────────────────
    "001132": "Synology",
    "0011320": "Synology",

    // ── Amazon (Echo, Kindle, etc.) ──────
    "00FC8B": "Amazon",
    "0C47C9": "Amazon",
    F0F0A4: "Amazon",
    "44650D": "Amazon",
    "6837E9": "Amazon",
    A002DC: "Amazon",
    FC65DE: "Amazon",
    "74C246": "Amazon",

    // ── Sonos ────────────────────────────
    "000E58": "Sonos",
    "5CAAFD": "Sonos",
    B8E937: "Sonos",
    "7828CA": "Sonos",
    "48A6B8": "Sonos",

    // ── MediaTek ─────────────────────────
    "000CE7": "MediaTek",
    C4E510: "MediaTek",

    // ── LG ───────────────────────────────
    "000631": "LG",
    "0010B5": "LG",
    "001C62": "LG",
    "0022A3": "LG",
    "3CCD93": "LG",
    "6C5C3D": "LG",
    A8CA7B: "LG",
    CC2D83: "LG",

    // ── Motorola / Zebra ─────────────────
    "000BAD": "Motorola",
    "001247": "Motorola",
    "0017B0": "Motorola",

    // ── OnePlus ──────────────────────────
    "94652D": "OnePlus",
    C0EE40: "OnePlus",
};

// ─── Vendor Lookup ──────────────────────────────────────────────────────────

// In-memory vendor cache (OUI prefix → vendor name)
const vendorCache = new Map<string, string>();

/**
 * Lookup vendor from MAC address.
 * 1. Detect randomized MACs (locally administered bit)
 * 2. Check embedded OUI database
 * 3. Fallback: try macvendors.com API (cached)
 */
export async function lookupVendor(mac: string): Promise<string> {
    if (!mac) return "Inconnu";

    if (isMulticastMac(mac)) return "Multicast";
    if (isRandomizedMac(mac)) return "MAC privée";

    const normalized = normalizeMac(mac);
    if (!normalized) return "Inconnu";

    const ouiKey = normalized.replace(/:/g, "").substring(0, 6);

    // Check in-memory cache
    if (vendorCache.has(ouiKey)) {
        return vendorCache.get(ouiKey)!;
    }

    // Check embedded database
    if (OUI_DATABASE[ouiKey]) {
        vendorCache.set(ouiKey, OUI_DATABASE[ouiKey]);
        return OUI_DATABASE[ouiKey];
    }

    // Try macvendors.com API (free, no key needed)
    try {
        const vendor = await fetchVendorFromAPI(normalized);
        if (vendor) {
            vendorCache.set(ouiKey, vendor);
            return vendor;
        }
    } catch {
        // API failed, ignore
    }

    vendorCache.set(ouiKey, "Inconnu");
    return "Inconnu";
}

/**
 * Synchronous vendor lookup (embedded DB only, no API).
 * Use this when you can't await (e.g. in a tight loop).
 */
export function lookupVendorSync(mac: string): string {
    if (!mac) return "Inconnu";
    if (isMulticastMac(mac)) return "Multicast";
    if (isRandomizedMac(mac)) return "MAC privée";

    const normalized = normalizeMac(mac);
    if (!normalized) return "Inconnu";

    const ouiKey = normalized.replace(/:/g, "").substring(0, 6);

    if (vendorCache.has(ouiKey)) return vendorCache.get(ouiKey)!;
    if (OUI_DATABASE[ouiKey]) {
        vendorCache.set(ouiKey, OUI_DATABASE[ouiKey]);
        return OUI_DATABASE[ouiKey];
    }

    return "Inconnu";
}

/**
 * Batch-resolve vendors for a list of MACs (with API + concurrency limit).
 */
export async function batchLookupVendors(
    macs: string[],
): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    const toResolve: string[] = [];

    // First pass: resolve everything that's already known
    for (const mac of macs) {
        const sync = lookupVendorSync(mac);
        if (sync !== "Inconnu") {
            result.set(mac, sync);
        } else {
            toResolve.push(mac);
        }
    }

    // Second pass: API lookups for unknowns (max 5 concurrent, 500ms delay)
    const MAX_CONCURRENT = 5;
    for (let i = 0; i < toResolve.length; i += MAX_CONCURRENT) {
        const batch = toResolve.slice(i, i + MAX_CONCURRENT);
        const vendors = await Promise.allSettled(
            batch.map((mac) => lookupVendor(mac)),
        );

        for (let j = 0; j < batch.length; j++) {
            const v = vendors[j];
            result.set(
                batch[j],
                v.status === "fulfilled" ? v.value : "Inconnu",
            );
        }

        // Rate limiting: wait 500ms between batches if using API
        if (i + MAX_CONCURRENT < toResolve.length) {
            await new Promise((r) => setTimeout(r, 500));
        }
    }

    return result;
}

// ─── API Lookup ─────────────────────────────────────────────────────────────

function fetchVendorFromAPI(mac: string): Promise<string | null> {
    return new Promise((resolve) => {
        const url = `https://api.macvendors.com/${encodeURIComponent(mac)}`;

        const timeout = setTimeout(() => resolve(null), 3000);

        const req = https.get(url, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                clearTimeout(timeout);
                if (
                    res.statusCode === 200 &&
                    data &&
                    !data.includes("Not Found")
                ) {
                    // Truncate very long vendor names
                    resolve(data.trim().substring(0, 40));
                } else {
                    resolve(null);
                }
            });
        });

        req.on("error", () => {
            clearTimeout(timeout);
            resolve(null);
        });
    });
}

// ─── Device Type Detection ──────────────────────────────────────────────────

export type DeviceType = "laptop" | "desktop" | "phone" | "tablet" | "tv" | "console" | "iot" | "server" | "unknown";

/**
 * Guess device type from hostname and vendor string.
 * Returns a human-readable label and the device category.
 */
export function guessDeviceType(
    hostname?: string | null,
    vendor?: string | null,
): { type: DeviceType; label: string } {
    const h = (hostname ?? "").toLowerCase();
    const v = (vendor ?? "").toLowerCase();

    // ── Hostname patterns ─────────────────────────────
    if (/macbook|mac-book/i.test(h)) return { type: "laptop", label: "MacBook" };
    if (/imac|mac-?pro|mac-?mini|mac-?studio/i.test(h)) return { type: "desktop", label: "Mac" };
    if (/iphone/i.test(h)) return { type: "phone", label: "iPhone" };
    if (/ipad/i.test(h)) return { type: "tablet", label: "iPad" };
    if (/apple-?tv|appletv/i.test(h)) return { type: "tv", label: "Apple TV" };
    if (/galaxy|samsung/i.test(h)) return { type: "phone", label: "Samsung" };
    if (/pixel/i.test(h)) return { type: "phone", label: "Pixel" };
    if (/android/i.test(h)) return { type: "phone", label: "Android" };
    if (/huawei/i.test(h)) return { type: "phone", label: "Huawei" };
    if (/xiaomi|redmi|poco/i.test(h)) return { type: "phone", label: "Xiaomi" };
    if (/oneplus/i.test(h)) return { type: "phone", label: "OnePlus" };
    if (/playstation|ps[45]/i.test(h)) return { type: "console", label: "PlayStation" };
    if (/xbox/i.test(h)) return { type: "console", label: "Xbox" };
    if (/nintendo|switch/i.test(h)) return { type: "console", label: "Nintendo" };
    if (/laptop|notebook/i.test(h)) return { type: "laptop", label: "Laptop" };
    if (/desktop|pc-|workstation/i.test(h)) return { type: "desktop", label: "PC" };
    if (/chromecast|roku|fire-?tv/i.test(h)) return { type: "tv", label: "Streaming" };
    if (/printer|epson|canon|brother|hp-/i.test(h)) return { type: "iot", label: "Imprimante" };
    if (/raspberry|esp32|esp8266|arduino/i.test(h)) return { type: "iot", label: "IoT" };

    // ── Vendor-based fallback ─────────────────────────
    if (v === "apple") return { type: "unknown", label: "Apple" };
    if (v.includes("dell") || v.includes("lenovo") || v.includes("hp") || v.includes("asus") || v.includes("acer"))
        return { type: "laptop", label: vendor!.split(" ")[0] };
    if (v.includes("samsung")) return { type: "phone", label: "Samsung" };
    if (v.includes("huawei")) return { type: "phone", label: "Huawei" };
    if (v.includes("xiaomi")) return { type: "phone", label: "Xiaomi" };
    if (v.includes("intel")) return { type: "desktop", label: "PC (Intel)" };
    if (v.includes("microsoft")) return { type: "desktop", label: "Microsoft" };
    if (v.includes("sony")) return { type: "console", label: "Sony" };
    if (v.includes("raspberry")) return { type: "iot", label: "Raspberry Pi" };

    return { type: "unknown", label: "" };
}

/**
 * Get the real hardware MAC address of the local machine.
 * On macOS with Private Wi-Fi Address, os.networkInterfaces() may return
 * a randomized MAC. We try system_profiler to get the real one.
 */
export function getHardwareVendorForLocal(): string {
    try {
        const { execSync } = require("child_process");
        const platform = os.platform();

        if (platform === "darwin") {
            // Try system_profiler to get hardware model
            const model = execSync(
                "sysctl -n hw.model 2>/dev/null || echo unknown",
                { encoding: "utf8", timeout: 3000 }
            ).trim();

            if (model.toLowerCase().includes("macbook")) return "Apple";
            if (model.toLowerCase().includes("imac")) return "Apple";
            if (model.toLowerCase().includes("mac")) return "Apple";
        }

        if (platform === "linux") {
            const vendor = execSync(
                "cat /sys/class/dmi/id/sys_vendor 2>/dev/null || echo unknown",
                { encoding: "utf8", timeout: 3000 }
            ).trim();
            if (vendor !== "unknown") return vendor;
        }
    } catch {
        // ignore
    }
    return "";
}

/**
 * Get the model name of the local machine (e.g. "MacBookPro18,1").
 */
export function getLocalModelName(): string {
    try {
        const { execSync } = require("child_process");
        const platform = os.platform();

        if (platform === "darwin") {
            return execSync("sysctl -n hw.model 2>/dev/null", {
                encoding: "utf8",
                timeout: 3000,
            }).trim();
        }

        if (platform === "linux") {
            return execSync(
                "cat /sys/class/dmi/id/product_name 2>/dev/null || cat /proc/device-tree/model 2>/dev/null || echo unknown",
                { encoding: "utf8", timeout: 3000 }
            ).trim();
        }
    } catch {
        // ignore
    }
    return "";
}
