/**
 * File Name: devices.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Device routes - list, search, link, and count active devices.
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
import { DeviceService } from "../services/device.service.js";

const deviceService = new DeviceService();

export function registerDeviceRoutes(app: FastifyInstance): void {
  // GET /api/v1/devices?floorId=xxx
  app.get("/devices", {
    schema: {
      tags: ["Devices"],
      summary: "List active devices",
      description: "Returns all active devices, optionally filtered by floor.",
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
            data: { type: "array", items: { $ref: "Device" } },
          },
        },
        500: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    const { floorId } = request.query as { floorId?: string };
    try {
      const devices = await deviceService.getActiveDevices(floorId);
      return { success: true, data: devices };
    } catch (error) {
      reply.status(500);
      return { success: false, error: "Failed to fetch devices" };
    }
  });

  // GET /api/v1/devices/search?q=xxx
  app.get("/devices/search", {
    schema: {
      tags: ["Devices"],
      summary: "Search devices",
      description: "Search devices by hostname, IP, MAC hash or vendor. Query must be at least 2 characters.",
      querystring: {
        type: "object",
        required: ["q"],
        properties: {
          q: { type: "string", minLength: 2, description: "Search query (min 2 chars)" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "array", items: { $ref: "Device" } },
          },
        },
        400: { $ref: "ErrorResponse" },
        500: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    const { q } = request.query as { q: string };
    if (!q || q.length < 2) {
      reply.status(400);
      return { success: false, error: "Query must be at least 2 characters" };
    }
    try {
      const devices = await deviceService.searchDevices(q);
      return { success: true, data: devices };
    } catch (error) {
      reply.status(500);
      return { success: false, error: "Failed to search devices" };
    }
  });

  // POST /api/v1/devices/link
  app.post("/devices/link", {
    schema: {
      tags: ["Devices"],
      summary: "Link device to user",
      description: "Associates a device MAC hash with a user ID for tracking.",
      body: {
        type: "object",
        required: ["macHash", "userId"],
        properties: {
          macHash: { type: "string" },
          userId: { type: "string" },
        },
      },
      response: {
        200: { $ref: "SuccessResponse" },
        400: { $ref: "ErrorResponse" },
        500: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    const { macHash, userId } = request.body as {
      macHash: string;
      userId: string;
    };

    if (!macHash || !userId) {
      reply.status(400);
      return { success: false, error: "macHash and userId are required" };
    }

    try {
      await deviceService.linkDeviceToUser(macHash, userId);
      return { success: true };
    } catch (error) {
      reply.status(500);
      return { success: false, error: "Failed to link device" };
    }
  });

  // GET /api/v1/devices/counts
  app.get("/devices/counts", {
    schema: {
      tags: ["Devices"],
      summary: "Device count per floor",
      description: "Returns the number of tracked devices grouped by floor.",
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "array", items: { $ref: "DeviceCount" } },
          },
        },
        500: { $ref: "ErrorResponse" },
      },
    },
  }, async (_request, reply) => {
    try {
      const counts = await deviceService.getDeviceCountsByFloor();
      return { success: true, data: counts };
    } catch (error) {
      reply.status(500);
      return { success: false, error: "Failed to fetch device counts" };
    }
  });
}
