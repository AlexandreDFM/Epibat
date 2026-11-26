/**
 * File Name: useDevicePositions.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: React hook - subscribes to real-time device position updates via Socket.io.
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

"use client";

import { useState, useCallback } from "react";
import { useSocketEvent, useFloorSubscription } from "./useSocket";
import type { Device } from "@epibat/shared";

/**
 * Track real-time device positions for a given floor.
 */
export function useDevicePositions(floorId: string | null) {
  const [devices, setDevices] = useState<Device[]>([]);

  // Subscribe to floor
  useFloorSubscription(floorId);

  // Bulk device updates
  useSocketEvent<Device[]>("devices:update", (data) => {
    setDevices(data);
  });

  // Single device movement
  useSocketEvent<Device>("device:moved", (device) => {
    setDevices((prev) => {
      const idx = prev.findIndex((d) => d.id === device.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = device;
        return next;
      }
      return [...prev, device];
    });
  });

  // Device left a room
  useSocketEvent<{ deviceId: string; roomId: string }>(
    "device:left",
    ({ deviceId }) => {
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    }
  );

  // Device entered a room
  useSocketEvent<{ device: Device; roomId: string }>(
    "device:entered",
    ({ device }) => {
      setDevices((prev) => {
        const exists = prev.find((d) => d.id === device.id);
        if (exists) {
          return prev.map((d) => (d.id === device.id ? device : d));
        }
        return [...prev, device];
      });
    }
  );

  const clearDevices = useCallback(() => setDevices([]), []);

  return { devices, clearDevices };
}
