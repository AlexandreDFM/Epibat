/**
 * File Name: presence.service.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Presence engine - aggregates positions and broadcasts updates.
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

import {
  DEVICE_TIMEOUT_SECONDS,
  PRESENCE_CLEANUP_INTERVAL_MS,
  OCCUPANCY_BROADCAST_INTERVAL_MS,
  OCCUPANCY_THRESHOLDS,
  type RoomOccupancy,
  type OccupancyStatus,
  type Device,
  type SceneCoordinate,
} from "@epibat/shared";
import { redis } from "../config/redis.js";
import { prisma } from "../config/database.js";
import type { TypedIO } from "../plugins/socket.js";

/**
 * Manages the presence engine: device tracking, room occupancy,
 * periodic cleanup & broadcast.
 */
export class PresenceService {
  private io: TypedIO;
  private broadcastInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(io: TypedIO) {
    this.io = io;
  }

  // ── Broadcast occupancy to all subscribed clients ─────────────────────

  startBroadcastLoop(): void {
    this.broadcastInterval = setInterval(async () => {
      try {
        await this.broadcastOccupancy();
      } catch (err) {
        console.error("Error broadcasting occupancy:", err);
      }
    }, OCCUPANCY_BROADCAST_INTERVAL_MS);
    console.log(
      `📊 Occupancy broadcast started (every ${OCCUPANCY_BROADCAST_INTERVAL_MS / 1000}s)`
    );
  }

  stopBroadcastLoop(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
  }

  // ── Cleanup stale devices ─────────────────────────────────────────────

  startCleanupLoop(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupStaleDevices();
      } catch (err) {
        console.error("Error cleaning up devices:", err);
      }
    }, PRESENCE_CLEANUP_INTERVAL_MS);
    console.log(
      `🧹 Device cleanup started (every ${PRESENCE_CLEANUP_INTERVAL_MS / 1000}s)`
    );
  }

  stopCleanupLoop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // ── Get all devices for a floor ───────────────────────────────────────

  async getDevicesForFloor(floorId: string): Promise<Device[]> {
    const deviceIds = await redis.smembers(`floor:${floorId}:devices`);
    const devices: Device[] = [];

    for (const id of deviceIds) {
      const data = await redis.hgetall(`device:${id}`);
      if (!data || !data.id) continue;

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
        rssi: data.rssi ? parseInt(data.rssi) : undefined,
        hostname: data.hostname || data.ip || null,
        source: data.source || undefined,
        user: null, // Populated separately if opted-in
      });
    }

    return devices;
  }

  // ── Compute occupancy for all rooms on a floor ────────────────────────

  async getRoomOccupancy(floorId: string): Promise<RoomOccupancy[]> {
    const rooms = await prisma.room.findMany({
      where: { floorId },
      select: { id: true, name: true, capacity: true },
    });

    const devices = await this.getDevicesForFloor(floorId);

    // Count devices per room
    const countByRoom = new Map<string, number>();
    for (const device of devices) {
      if (device.roomId) {
        countByRoom.set(
          device.roomId,
          (countByRoom.get(device.roomId) ?? 0) + 1
        );
      }
    }

    return rooms.map((room) => {
      const currentCount = countByRoom.get(room.id) ?? 0;
      const fillRatio =
        room.capacity > 0
          ? Math.min(currentCount / room.capacity, 1)
          : 0;
      return {
        roomId: room.id,
        roomName: room.name,
        currentCount,
        capacity: room.capacity,
        fillRatio,
        status: this.getOccupancyStatus(fillRatio),
      };
    });
  }

  private getOccupancyStatus(ratio: number): OccupancyStatus {
    if (ratio >= OCCUPANCY_THRESHOLDS.full) return "full";
    if (ratio >= OCCUPANCY_THRESHOLDS.high) return "high";
    if (ratio >= OCCUPANCY_THRESHOLDS.medium) return "medium";
    if (ratio >= OCCUPANCY_THRESHOLDS.low) return "low";
    return "empty";
  }

  // ── Broadcast to all floors ───────────────────────────────────────────

  private async broadcastOccupancy(): Promise<void> {
    const floors = await prisma.floor.findMany({ select: { id: true } });

    for (const floor of floors) {
      const occupancy = await this.getRoomOccupancy(floor.id);
      this.io.to(`floor:${floor.id}`).emit("room:occupancy", occupancy);
    }
  }

  // ── Remove devices not seen recently ──────────────────────────────────

  private async cleanupStaleDevices(): Promise<void> {
    const cutoff = new Date(
      Date.now() - DEVICE_TIMEOUT_SECONDS * 1000
    ).toISOString();

    const floors = await prisma.floor.findMany({ select: { id: true } });

    for (const floor of floors) {
      const deviceIds = await redis.smembers(
        `floor:${floor.id}:devices`
      );

      for (const id of deviceIds) {
        const lastSeen = await redis.hget(`device:${id}`, "lastSeen");
        if (!lastSeen || lastSeen < cutoff) {
          // Remove from floor set and delete device hash
          await redis.srem(`floor:${floor.id}:devices`, id);
          await redis.del(`device:${id}`);
          await redis.del(`device:${id}:meta`);

          // Notify clients
          const roomId = await redis.hget(`device:${id}:meta`, "roomId");
          if (roomId) {
            this.io
              .to(`floor:${floor.id}`)
              .emit("device:left", { deviceId: id, roomId });
          }
        }
      }
    }
  }
}
