/**
 * File Name: types.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Shared TypeScript interfaces - Device, Room, Floor, Building, etc.
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

// ─── Geometry & Coordinates ────────────────────────────────────────────────

/** Raw coordinates from Mist API (meters relative to map origin) */
export interface MistCoordinate {
  x: number;
  y: number;
}

/** 3D coordinates used in the Three.js scene */
export interface SceneCoordinate {
  x: number;
  y: number;
  z: number;
}

/** 2D polygon vertex for room zone definition */
export interface Point2D {
  x: number;
  y: number;
}

// ─── Building / Floor / Room ───────────────────────────────────────────────

export interface Building {
  id: string;
  name: string;
  floors: Floor[];
}

export interface Floor {
  id: string;
  buildingId: string;
  level: number;
  name: string;
  /** Path to the .glb model file for this floor */
  modelUrl?: string;
  /** Fallback: PDF texture URL */
  textureUrl?: string;
  rooms: Room[];
}

export interface Room {
  id: string;
  floorId: string;
  name: string;
  /** Polygon vertices defining the room boundary (2D, in Three.js xz-plane) */
  polygon: Point2D[];
  capacity: number;
  type: RoomType;
}

export type RoomType =
  | "classroom"
  | "lab"
  | "meeting"
  | "open-space"
  | "hallway"
  | "restroom"
  | "other";

// ─── Devices & Presence ────────────────────────────────────────────────────

export interface Device {
  /** Hashed MAC address (SHA-256) */
  id: string;
  position: SceneCoordinate;
  roomId: string | null;
  floorId: string;
  lastSeen: string; // ISO 8601
  /** Linked user if opt-in */
  user?: UserInfo | null;
  /** Signal strength (dBm) */
  rssi?: number;
  /** Resolved device hostname (rDNS, mDNS, NetBIOS) */
  hostname?: string | null;
  /** MAC address (e.g. "aa:bb:cc:dd:ee:ff") */
  mac?: string | null;
  /** IP address (e.g. "10.73.188.42") */
  ip?: string | null;
  /** Detection source: mist | network-scan */
  source?: string;
  /** Hardware vendor from MAC OUI lookup (e.g. "Apple", "Cisco") */
  vendor?: string | null;
  /** Detected device type (e.g. "MacBook", "iPhone", "Samsung") */
  deviceType?: string | null;
  /** True if device is on this machine */
  isLocal?: boolean;
  /** True if this device is an access point / router */
  isAccessPoint?: boolean;
  /** ID (macHash) of the AP this device is connected to */
  connectedApId?: string | null;
  /** Display name of the AP this device is connected to (hostname or IP) */
  connectedApName?: string | null;
}

// ─── Access Point ──────────────────────────────────────────────────────────

export interface AccessPointInfo {
  /** Hashed MAC of the AP */
  id: string;
  position: SceneCoordinate;
  roomId: string | null;
  floorId: string;
  /** Original MAC address */
  mac: string;
  ip: string;
  hostname?: string | null;
  /** Number of devices connected to this AP */
  clientCount: number;
  /** IDs of connected devices */
  connectedDeviceIds: string[];
  /** Display-friendly list of connected client info */
  connectedClients: Array<{ id: string; label: string }>;
}

/** Mesh link between a device and its AP */
export interface MeshLink {
  deviceId: string;
  apId: string;
  devicePosition: SceneCoordinate;
  apPosition: SceneCoordinate;
}

export interface UserInfo {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  optedIn: boolean;
}

export interface PresenceRecord {
  userId: string;
  deviceId: string;
  roomId: string;
  floorId: string;
  lastSeen: string; // ISO 8601
}

// ─── Room Occupancy ────────────────────────────────────────────────────────

export interface RoomOccupancy {
  roomId: string;
  roomName: string;
  currentCount: number;
  capacity: number;
  /** 0..1 ratio */
  fillRatio: number;
  status: OccupancyStatus;
}

export type OccupancyStatus = "empty" | "low" | "medium" | "high" | "full";

// ─── Socket.io Events ──────────────────────────────────────────────────────

/** Events emitted by the server to clients */
export interface ServerToClientEvents {
  "devices:update": (devices: Device[]) => void;
  "room:occupancy": (occupancy: RoomOccupancy[]) => void;
  "device:moved": (device: Device) => void;
  "device:entered": (payload: { device: Device; roomId: string }) => void;
  "device:left": (payload: { deviceId: string; roomId: string }) => void;
}

/** Events emitted by the client to the server */
export interface ClientToServerEvents {
  "floor:subscribe": (floorId: string) => void;
  "floor:unsubscribe": (floorId: string) => void;
  "user:optin": (payload: { token: string }) => void;
}

/** Inter-server events (unused for now) */
export interface InterServerEvents {
  ping: () => void;
}

/** Per-socket data */
export interface SocketData {
  userId?: string;
  subscribedFloor?: string;
}

// ─── API Responses ─────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

// ─── Mist Webhook / Stream Payloads ────────────────────────────────────────

export interface MistLocationEvent {
  id: string;
  site_id: string;
  map_id: string;
  mac: string;
  x: number;
  y: number;
  timestamp: number;
  /** WiFi / BLE */
  source: "wifi" | "ble";
  rssi?: number;
}

export interface MistZoneEvent {
  id: string;
  site_id: string;
  map_id: string;
  mac: string;
  zone_id: string;
  trigger: "enter" | "exit";
  timestamp: number;
}

// ─── Calibration ───────────────────────────────────────────────────────────

export interface CalibrationPoint {
  mist: MistCoordinate;
  scene: SceneCoordinate;
}

export interface CalibrationConfig {
  /** Ordered pairs used to compute the affine transform */
  points: CalibrationPoint[];
  /** Scale factor: scene-units per Mist-meter */
  scale: { x: number; z: number };
  /** Offset after scaling */
  offset: { x: number; z: number };
}
