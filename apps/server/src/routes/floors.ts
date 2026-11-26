/**
 * File Name: floors.ts
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Floor and building routes - list buildings, floors, and floor details.
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
import { prisma } from "../config/database.js";

export function registerFloorRoutes(app: FastifyInstance): void {
  // GET /api/v1/floors?buildingId=xxx
  app.get("/floors", {
    schema: {
      tags: ["Floors"],
      summary: "List all floors",
      description: "Returns all floors with their rooms and building info. Optionally filter by building.",
      querystring: {
        type: "object",
        properties: {
          buildingId: { type: "string", description: "Filter by building ID" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "array", items: { $ref: "Floor" } },
          },
        },
        500: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    const { buildingId } = request.query as { buildingId?: string };
    try {
      const where = buildingId ? { buildingId } : {};
      const floors = await prisma.floor.findMany({
        where,
        include: {
          rooms: {
            select: { id: true, name: true, capacity: true, type: true },
          },
          building: { select: { id: true, name: true } },
        },
        orderBy: { level: "asc" },
      });
      return { success: true, data: floors };
    } catch (error) {
      reply.status(500);
      return { success: false, error: "Failed to fetch floors" };
    }
  });

  // GET /api/v1/floors/:id
  app.get("/floors/:id", {
    schema: {
      tags: ["Floors"],
      summary: "Get a floor by ID",
      params: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { $ref: "Floor" },
          },
        },
        404: { $ref: "ErrorResponse" },
        500: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const floor = await prisma.floor.findUnique({
        where: { id },
        include: { rooms: true, building: true },
      });
      if (!floor) {
        reply.status(404);
        return { success: false, error: "Floor not found" };
      }
      return { success: true, data: floor };
    } catch (error) {
      reply.status(500);
      return { success: false, error: "Failed to fetch floor" };
    }
  });

  // GET /api/v1/buildings
  app.get("/buildings", {
    schema: {
      tags: ["Floors"],
      summary: "List all buildings",
      description: "Returns all buildings with their floors.",
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "array", items: { $ref: "Building" } },
          },
        },
        500: { $ref: "ErrorResponse" },
      },
    },
  }, async (_request, reply) => {
    try {
      const buildings = await prisma.building.findMany({
        include: {
          floors: {
            orderBy: { level: "asc" },
            select: { id: true, level: true, name: true },
          },
        },
      });
      return { success: true, data: buildings };
    } catch (error) {
      reply.status(500);
      return { success: false, error: "Failed to fetch buildings" };
    }
  });
}
