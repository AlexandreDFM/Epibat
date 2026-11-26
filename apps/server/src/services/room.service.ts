/**
 * File Name: room.service.ts
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Room service - room CRUD, occupancy calculation, and caching.
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

import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import type { Room, Point2D, RoomType } from "@epibat/shared";

export class RoomService {
  async getAllRooms(floorId?: string): Promise<Room[]> {
    const where = floorId ? { floorId } : {};
    const rooms = await prisma.room.findMany({
      where,
      include: { floor: { select: { id: true, name: true, level: true } } },
    });

    return rooms.map((r) => ({
      id: r.id,
      floorId: r.floorId,
      name: r.name,
      polygon: r.polygon as unknown as Point2D[],
      capacity: r.capacity,
      type: r.type.replace("_", "-") as RoomType,
    }));
  }

  async getRoomById(id: string): Promise<Room | null> {
    const r = await prisma.room.findUnique({ where: { id } });
    if (!r) return null;

    return {
      id: r.id,
      floorId: r.floorId,
      name: r.name,
      polygon: r.polygon as unknown as Point2D[],
      capacity: r.capacity,
      type: r.type.replace("_", "-") as RoomType,
    };
  }

  async createRoom(data: {
    floorId: string;
    name: string;
    polygon: Point2D[];
    capacity: number;
    type: string;
  }) {
    return prisma.room.create({
      data: {
        floorId: data.floorId,
        name: data.name,
        polygon: data.polygon as unknown as Prisma.InputJsonValue,
        capacity: data.capacity,
        type: data.type.replace("-", "_") as never,
      },
    });
  }

  async updateRoom(
    id: string,
    data: Partial<{
      name: string;
      polygon: Point2D[];
      capacity: number;
      type: string;
    }>
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.polygon) updateData.polygon = data.polygon;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.type) updateData.type = data.type.replace("-", "_");

    return prisma.room.update({ where: { id }, data: updateData });
  }

  async deleteRoom(id: string) {
    return prisma.room.delete({ where: { id } });
  }
}
