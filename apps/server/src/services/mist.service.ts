/**
 * File Name: mist.service.ts
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Mist AI service - WebSocket client for vBLE/WiFi positioning.
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

import WebSocket from "ws";
import {
  MIST_WS_URL,
  type MistLocationEvent,
  type CalibrationConfig,
} from "@epibat/shared";
import { env } from "../config/env.js";
import { redis } from "../config/redis.js";
import { prisma } from "../config/database.js";
import { hashMac } from "../utils/hash.js";
import {
  mistToScene,
  findRoomForPosition,
  DEFAULT_CALIBRATION,
} from "../utils/coordinates.js";
import { KalmanFilter2D } from "../utils/kalman.js";
import { getIO } from "../plugins/socket.js";
import type { Point2D, Device, SceneCoordinate } from "@epibat/shared";

/**
 * Service responsible for connecting to the Mist AI WebSocket stream,
 * processing incoming location events, filtering with Kalman,
 * and updating Redis / broadcasting via Socket.io.
 */
export class MistService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private static readonly MAX_RECONNECT_DELAY = 5 * 60 * 1000; // 5 minutes
  private static readonly BASE_RECONNECT_DELAY = 5_000; // 5 seconds
  private filters: Map<string, KalmanFilter2D> = new Map();
  private calibrations: Map<string, CalibrationConfig> = new Map();
  private roomCache: Map<string, Array<{ id: string; polygon: Point2D[] }>> =
    new Map();

  constructor() {}

  // ── Credential validation ──────────────────────────────────────────────

  private static readonly PLACEHOLDER_VALUES = [
    "placeholder",
    "dev-placeholder",
    "change-me",
    "",
  ];

  private hasValidCredentials(): boolean {
    const token = env.MIST_API_TOKEN;
    const siteId = env.MIST_SITE_ID;
    const orgId = env.MIST_ORG_ID;

    return (
      !MistService.PLACEHOLDER_VALUES.includes(token.toLowerCase()) &&
      !MistService.PLACEHOLDER_VALUES.includes(siteId.toLowerCase()) &&
      !MistService.PLACEHOLDER_VALUES.includes(orgId.toLowerCase())
    );
  }

  // ── Connection ─────────────────────────────────────────────────────────

  connect(): void {
    if (!this.hasValidCredentials()) {
      console.warn(
        "⏭️  Mist WebSocket disabled — credentials not configured.\n" +
        "   Set MIST_API_TOKEN, MIST_SITE_ID and MIST_ORG_ID environment variables to enable real-time tracking."
      );
      return;
    }

    const url = `${MIST_WS_URL}?token=${env.MIST_API_TOKEN}`;

    console.log("🔗 Connecting to Mist WebSocket...");
    this.ws = new WebSocket(url);

    this.ws.on("open", () => {
      console.log("✅ Connected to Mist WebSocket");
      this.reconnectAttempts = 0; // reset backoff on successful connection
      this.subscribe();
    });

    this.ws.on("message", (data) => {
      try {
        const payload = JSON.parse(data.toString());
        this.handleMessage(payload);
      } catch (err) {
        console.error("Failed to parse Mist message:", err);
      }
    });

    this.ws.on("close", (code, reason) => {
      console.warn(
        `⚠️  Mist WebSocket closed: ${code} ${reason.toString()}`
      );
      this.scheduleReconnect();
    });

    this.ws.on("error", (err) => {
      console.error("❌ Mist WebSocket error:", err.message);
    });
  }

  private subscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Subscribe to client location updates for our site
    const subscribeMsg = {
      subscribe: `/sites/${env.MIST_SITE_ID}/stats/clients`,
    };
    this.ws.send(JSON.stringify(subscribeMsg));
    console.log("📡 Subscribed to Mist client location stream");
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    // Exponential backoff: 5s, 10s, 20s, 40s, … capped at 5 min
    const delay = Math.min(
      MistService.BASE_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      MistService.MAX_RECONNECT_DELAY
    );
    this.reconnectAttempts++;

    const delaySec = Math.round(delay / 1000);
    console.log(`🔄 Reconnecting to Mist in ${delaySec}s... (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // ── Message handling ───────────────────────────────────────────────────

  private async handleMessage(payload: unknown): Promise<void> {
    // Mist sends different event types; we care about location events
    if (!payload || typeof payload !== "object") return;

    const msg = payload as Record<string, unknown>;

    // Location update event
    if (msg.event === "client-location" && Array.isArray(msg.data)) {
      for (const event of msg.data as MistLocationEvent[]) {
        await this.processLocationEvent(event);
      }
    }
  }

  private async processLocationEvent(
    event: MistLocationEvent
  ): Promise<void> {
    const macHash = hashMac(event.mac);

    // Get or create Kalman filter for this device
    let filter = this.filters.get(macHash);
    if (!filter) {
      filter = new KalmanFilter2D(event.x, event.y);
      this.filters.set(macHash, filter);
    }

    // Apply Kalman smoothing
    const smoothed = filter.update(event.x, event.y);

    // Get calibration config for the map/floor
    const calibration = await this.getCalibration(event.map_id);

    // Convert Mist coords to scene coords
    const scenePos = mistToScene(
      { x: smoothed.x, y: smoothed.y },
      calibration
    );

    // Find which floor this map_id belongs to
    const floorId = await this.getFloorIdForMap(event.map_id);
    if (!floorId) return;

    // Determine which room the device is in
    const rooms = await this.getRoomPolygons(floorId);
    const roomId = findRoomForPosition(scenePos, rooms);

    // Build device record
    const now = new Date().toISOString();
    const device: Device = {
      id: macHash,
      position: scenePos,
      roomId,
      floorId,
      lastSeen: now,
      rssi: event.rssi,
      user: null,
    };

    // Store in Redis for fast access
    await this.updateDeviceInRedis(device);

    // Broadcast via Socket.io to subscribed clients
    const io = getIO();
    io.to(`floor:${floorId}`).emit("device:moved", device);

    // Check for room transitions
    const previousRoomId = await redis.hget(
      `device:${macHash}:meta`,
      "roomId"
    );
    if (previousRoomId !== roomId) {
      if (previousRoomId) {
        io.to(`floor:${floorId}`).emit("device:left", {
          deviceId: macHash,
          roomId: previousRoomId,
        });
      }
      if (roomId) {
        io.to(`floor:${floorId}`).emit("device:entered", {
          device,
          roomId,
        });
      }
      await redis.hset(`device:${macHash}:meta`, "roomId", roomId ?? "");
    }
  }

  // ── Redis helpers ──────────────────────────────────────────────────────

  private async updateDeviceInRedis(device: Device): Promise<void> {
    const key = `device:${device.id}`;
    await redis.hset(key, {
      id: device.id,
      x: device.position.x.toString(),
      y: device.position.y.toString(),
      z: device.position.z.toString(),
      roomId: device.roomId ?? "",
      floorId: device.floorId,
      lastSeen: device.lastSeen,
      rssi: (device.rssi ?? 0).toString(),
    });
    // Add to floor device set
    await redis.sadd(`floor:${device.floorId}:devices`, device.id);
    // Set TTL (auto-cleanup if no update)
    await redis.expire(key, 600); // 10 minutes
  }

  // ── Calibration cache ──────────────────────────────────────────────────

  private async getCalibration(
    mapId: string
  ): Promise<CalibrationConfig> {
    if (this.calibrations.has(mapId)) {
      return this.calibrations.get(mapId)!;
    }

    try {
      const floor = await prisma.floor.findFirst({
        where: { mistMapId: mapId },
      });
      if (floor) {
        const config = await prisma.calibrationConfig.findUnique({
          where: { floorId: floor.id },
        });
        if (config) {
          const cal = config.config as unknown as CalibrationConfig;
          this.calibrations.set(mapId, cal);
          return cal;
        }
      }
    } catch {
      // Fall through to default
    }

    this.calibrations.set(mapId, DEFAULT_CALIBRATION);
    return DEFAULT_CALIBRATION;
  }

  // ── Floor/Room caches ──────────────────────────────────────────────────

  private async getFloorIdForMap(
    mapId: string
  ): Promise<string | null> {
    try {
      const floor = await prisma.floor.findFirst({
        where: { mistMapId: mapId },
      });
      return floor?.id ?? null;
    } catch {
      return null;
    }
  }

  private async getRoomPolygons(
    floorId: string
  ): Promise<Array<{ id: string; polygon: Point2D[] }>> {
    if (this.roomCache.has(floorId)) {
      return this.roomCache.get(floorId)!;
    }

    const rooms = await prisma.room.findMany({
      where: { floorId },
      select: { id: true, polygon: true },
    });

    const parsed = rooms.map((r) => ({
      id: r.id,
      polygon: r.polygon as unknown as Point2D[],
    }));

    this.roomCache.set(floorId, parsed);
    // Refresh cache every 5 minutes
    setTimeout(() => this.roomCache.delete(floorId), 300_000);

    return parsed;
  }
}
