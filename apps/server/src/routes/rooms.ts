/**
 * File Name: rooms.ts
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Room routes - CRUD operations and occupancy data.
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

import type { FastifyInstance } from "fastify";
import { RoomService } from "../services/room.service.js";
import { PresenceService } from "../services/presence.service.js";
import { getIO } from "../plugins/socket.js";

const roomService = new RoomService();

export function registerRoomRoutes(app: FastifyInstance): void {
  // GET /api/v1/rooms?floorId=xxx
  app.get("/rooms", {
    schema: {
      tags: ["Rooms"],
      summary: "List rooms",
      description: "Returns all rooms, optionally filtered by floor.",
      querystring: {
        type: "object",
        properties: {
          floorId: { type: "string", description: "Filter by floor ID" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "array", items: { $ref: "Room" } },
          },
        },
        500: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    const { floorId } = request.query as { floorId?: string };
    try {
      const rooms = await roomService.getAllRooms(floorId);
      return { success: true, data: rooms };
    } catch (error) {
      reply.status(500);
      return { success: false, error: "Failed to fetch rooms" };
    }
  });

  // GET /api/v1/rooms/:id
  app.get("/rooms/:id", {
    schema: {
      tags: ["Rooms"],
      summary: "Get a room by ID",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { $ref: "Room" },
          },
        },
        404: { $ref: "ErrorResponse" },
        500: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const room = await roomService.getRoomById(id);
      if (!room) {
        reply.status(404);
        return { success: false, error: "Room not found" };
      }
      return { success: true, data: room };
    } catch (error) {
      reply.status(500);
      return { success: false, error: "Failed to fetch room" };
    }
  });

  // GET /api/v1/rooms/:floorId/occupancy
  app.get("/rooms/:floorId/occupancy", {
    schema: {
      tags: ["Rooms"],
      summary: "Get room occupancy for a floor",
      description: "Returns real-time occupancy data for all rooms on a given floor.",
      params: {
        type: "object",
        required: ["floorId"],
        properties: { floorId: { type: "string" } },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "array", items: { $ref: "RoomOccupancy" } },
          },
        },
        500: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    const { floorId } = request.params as { floorId: string };
    try {
      const io = getIO();
      const presenceService = new PresenceService(io);
      const occupancy = await presenceService.getRoomOccupancy(floorId);
      return { success: true, data: occupancy };
    } catch (error) {
      reply.status(500);
      return { success: false, error: "Failed to fetch occupancy" };
    }
  });

  // POST /api/v1/rooms
  app.post("/rooms", {
    schema: {
      tags: ["Rooms"],
      summary: "Create a room",
      body: {
        type: "object",
        required: ["floorId", "name", "polygon", "capacity", "type"],
        properties: {
          floorId: { type: "string" },
          name: { type: "string" },
          polygon: {
            type: "array",
            items: { $ref: "Point2D" },
            minItems: 3,
            description: "Array of 2D points defining the room polygon (min 3)",
          },
          capacity: { type: "integer", minimum: 1 },
          type: {
            type: "string",
            enum: ["classroom", "lab", "meeting", "open_space", "hallway", "restroom", "other"],
          },
        },
      },
      response: {
        201: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { $ref: "Room" },
          },
        },
        500: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    const body = request.body as {
      floorId: string;
      name: string;
      polygon: Array<{ x: number; y: number }>;
      capacity: number;
      type: string;
    };

    try {
      const room = await roomService.createRoom(body);
      reply.status(201);
      return { success: true, data: room };
    } catch (error) {
      reply.status(500);
      return { success: false, error: "Failed to create room" };
    }
  });

  // PUT /api/v1/rooms/:id
  app.put("/rooms/:id", {
    schema: {
      tags: ["Rooms"],
      summary: "Update a room",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      body: {
        type: "object",
        properties: {
          name: { type: "string" },
          polygon: { type: "array", items: { $ref: "Point2D" } },
          capacity: { type: "integer", minimum: 1 },
          type: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { $ref: "Room" },
          },
        },
        500: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{
      name: string;
      polygon: Array<{ x: number; y: number }>;
      capacity: number;
      type: string;
    }>;

    try {
      const room = await roomService.updateRoom(id, body);
      return { success: true, data: room };
    } catch (error) {
      reply.status(500);
      return { success: false, error: "Failed to update room" };
    }
  });

  // DELETE /api/v1/rooms/:id
  app.delete("/rooms/:id", {
    schema: {
      tags: ["Rooms"],
      summary: "Delete a room",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      response: {
        200: { $ref: "SuccessResponse" },
        500: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await roomService.deleteRoom(id);
      return { success: true };
    } catch (error) {
      reply.status(500);
      return { success: false, error: "Failed to delete room" };
    }
  });
}
