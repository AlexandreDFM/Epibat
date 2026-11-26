/**
 * File Name: constants.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Shared constants - Socket.io events, floor mappings, and API paths.
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

// ─── Socket.io ─────────────────────────────────────────────────────────────

export const SOCKET_EVENTS = {
  DEVICES_UPDATE: "devices:update",
  ROOM_OCCUPANCY: "room:occupancy",
  DEVICE_MOVED: "device:moved",
  DEVICE_ENTERED: "device:entered",
  DEVICE_LEFT: "device:left",
  FLOOR_SUBSCRIBE: "floor:subscribe",
  FLOOR_UNSUBSCRIBE: "floor:unsubscribe",
  USER_OPTIN: "user:optin",
} as const;

// ─── Occupancy thresholds ──────────────────────────────────────────────────

/** fillRatio ranges mapped to OccupancyStatus */
export const OCCUPANCY_THRESHOLDS = {
  empty: 0,
  low: 0.25,
  medium: 0.5,
  high: 0.75,
  full: 1.0,
} as const;

// ─── Colors (hex) for occupancy status ─────────────────────────────────────

export const OCCUPANCY_COLORS: Record<string, string> = {
  empty: "#22c55e",   // green-500
  low: "#84cc16",     // lime-500
  medium: "#eab308",  // yellow-500
  high: "#f97316",    // orange-500
  full: "#ef4444",    // red-500
};

// ─── Mist API ──────────────────────────────────────────────────────────────

export const MIST_WS_URL = "wss://api.mist.com/api-ws/v1/stream";
export const MIST_API_BASE = "https://api.mist.com/api/v1";

// ─── Kalman filter defaults ────────────────────────────────────────────────

export const KALMAN_DEFAULTS = {
  processNoise: 0.1,
  measurementNoise: 1.0,
  estimatedError: 1.0,
} as const;

// ─── Presence ──────────────────────────────────────────────────────────────

/** Seconds after which a device is considered "gone" */
export const DEVICE_TIMEOUT_SECONDS = 300; // 5 minutes

/** Interval (ms) between presence cleanup sweeps */
export const PRESENCE_CLEANUP_INTERVAL_MS = 30_000;

/** Interval (ms) between broadcasting occupancy updates */
export const OCCUPANCY_BROADCAST_INTERVAL_MS = 5_000;
