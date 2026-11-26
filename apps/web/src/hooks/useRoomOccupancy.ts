/**
 * File Name: useRoomOccupancy.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: React hook - subscribes to real-time room occupancy updates via Socket.io.
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

import { useState } from "react";
import { useSocketEvent, useFloorSubscription } from "./useSocket";
import type { RoomOccupancy } from "@epibat/shared";

/**
 * Track real-time room occupancy for a given floor.
 */
export function useRoomOccupancy(floorId: string | null) {
  const [occupancy, setOccupancy] = useState<RoomOccupancy[]>([]);

  // Subscribe to floor
  useFloorSubscription(floorId);

  // Receive periodic occupancy updates
  useSocketEvent<RoomOccupancy[]>("room:occupancy", (data) => {
    setOccupancy(data);
  });

  return { occupancy };
}
