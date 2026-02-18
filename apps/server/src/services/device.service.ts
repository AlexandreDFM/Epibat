/**
 * File Name: device.service.ts
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Device service - manages device state, linking, and persistence.
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

import { prisma } from "../config/database.js";
import { redis } from "../config/redis.js";
import type { Device, SceneCoordinate } from "@epibat/shared";

export class DeviceService {
  /**
   * Get all devices from Redis (real-time positions).
   * Optionally filter by floorId.
   */
  async getActiveDevices(floorId?: string): Promise<Device[]> {
    if (floorId) {
      return this.getDevicesForFloor(floorId);
    }

    // Get all floor IDs
    const floors = await prisma.floor.findMany({ select: { id: true } });
    const allDevices: Device[] = [];

    for (const floor of floors) {
      const devices = await this.getDevicesForFloor(floor.id);
      allDevices.push(...devices);
    }

    return allDevices;
  }

  private async getDevicesForFloor(floorId: string): Promise<Device[]> {
    const deviceIds = await redis.smembers(`floor:${floorId}:devices`);
    const devices: Device[] = [];

    for (const id of deviceIds) {
      const data = await redis.hgetall(`device:${id}`);
      if (!data || !data.id) continue;

      // Check if user is linked + opted-in
      let user = null;
      const dbDevice = await prisma.device.findUnique({
        where: { macHash: id },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              avatarUrl: true,
              optedIn: true,
            },
          },
        },
      });

      if (dbDevice?.user?.optedIn) {
        user = {
          id: dbDevice.user.id,
          displayName: dbDevice.user.displayName,
          email: dbDevice.user.email ?? undefined,
          avatarUrl: dbDevice.user.avatarUrl ?? undefined,
          optedIn: true,
        };
      }

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
        hostname: data.hostname || null,
        mac: data.mac || null,
        ip: data.ip || null,
        vendor: data.vendor || null,
        isLocal: data.isLocal === "true",
        source: data.source || undefined,
        isAccessPoint: data.isAP === "true",
        connectedApId: data.connectedApId || null,
        user,
      });
    }

    return devices;
  }

  /**
   * Link a device (by hashed MAC) to a user (opt-in).
   */
  async linkDeviceToUser(
    macHash: string,
    userId: string
  ): Promise<void> {
    await prisma.device.upsert({
      where: { macHash },
      update: { userId },
      create: { macHash, userId },
    });
  }

  /**
   * Get device count per floor (fast: Redis SCARD only)
   */
  async getDeviceCountsByFloor(): Promise<Record<string, number>> {
    const floors = await prisma.floor.findMany({ select: { id: true } });
    const counts: Record<string, number> = {};
    for (const floor of floors) {
      counts[floor.id] = await redis.scard(`floor:${floor.id}:devices`);
    }
    return counts;
  }

  /**
   * Search devices/users by name.
   */
  async searchDevices(query: string): Promise<Device[]> {
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { optedIn: true },
          {
            OR: [
              { displayName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          },
        ],
      },
      include: {
        devices: true,
      },
    });

    const devices: Device[] = [];

    for (const user of users) {
      for (const device of user.devices) {
        const data = await redis.hgetall(`device:${device.macHash}`);
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
          user: {
            id: user.id,
            displayName: user.displayName,
            email: user.email,
            avatarUrl: user.avatarUrl ?? undefined,
            optedIn: true,
          },
        });
      }
    }

    return devices;
  }
}
