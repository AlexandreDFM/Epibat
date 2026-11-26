/**
 * File Name: routers.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Router/AP routes - list, assign, unassign, and sync access points.
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
import { NetworkScannerService } from "../services/network-scanner.service.js";

let scannerRef: NetworkScannerService | null = null;

export function setRoutersScannerRef(scanner: NetworkScannerService): void {
  scannerRef = scanner;
}

export function registerRouterRoutes(app: FastifyInstance): void {
  // GET /routers
  app.get("/routers", {
    schema: {
      tags: ["Routers"],
      summary: "List all routers / access points",
      description: "Merges live-detected APs from the scanner with persisted assignments from the database.",
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "array", items: { $ref: "RouterInfo" } },
          },
        },
        500: { $ref: "ErrorResponse" },
      },
    },
  }, async (_req, reply) => {
    try {
      const assignments = await prisma.routerAssignment.findMany({
        include: {
          room: { select: { id: true, name: true } },
          floor: { select: { id: true, name: true, level: true } },
        },
        orderBy: { updatedAt: "desc" },
      });

      const liveAPs = scannerRef ? scannerRef.getAccessPoints() : [];

      const routerMap = new Map<
        string,
        {
          id: string;
          macHash: string;
          mac: string | null;
          ip: string | null;
          vendor: string | null;
          deviceType: string | null;
          hostname: string | null;
          label: string | null;
          roomId: string | null;
          roomName: string | null;
          floorId: string | null;
          floorName: string | null;
          floorLevel: number | null;
          clientCount: number;
          isOnline: boolean;
        }
      >();

      for (const a of assignments) {
        routerMap.set(a.macHash, {
          id: a.id,
          macHash: a.macHash,
          mac: a.mac,
          ip: a.ip,
          vendor: a.vendor,
          deviceType: a.deviceType,
          hostname: a.hostname,
          label: a.label,
          roomId: a.roomId,
          roomName: a.room?.name ?? null,
          floorId: a.floorId,
          floorName: a.floor?.name ?? null,
          floorLevel: a.floor?.level ?? null,
          clientCount: 0,
          isOnline: false,
        });
      }

      for (const ap of liveAPs) {
        const existing = routerMap.get(ap.id);
        if (existing) {
          existing.ip = ap.ip || existing.ip;
          existing.clientCount = ap.clientCount;
          existing.isOnline = true;
          if (!existing.hostname && ap.hostname) existing.hostname = ap.hostname;
        } else {
          routerMap.set(ap.id, {
            id: "",
            macHash: ap.id,
            mac: ap.mac,
            ip: ap.ip,
            vendor: null,
            deviceType: null,
            hostname: ap.hostname ?? null,
            label: null,
            roomId: ap.roomId,
            roomName: null,
            floorId: ap.floorId,
            floorName: null,
            floorLevel: null,
            clientCount: ap.clientCount,
            isOnline: true,
          });
        }
      }

      return { success: true, data: [...routerMap.values()] };
    } catch (error) {
      console.error("Failed to fetch routers:", error);
      reply.status(500);
      return { success: false, error: "Failed to fetch routers" };
    }
  });

  // PUT /routers/:macHash
  app.put("/routers/:macHash", {
    schema: {
      tags: ["Routers"],
      summary: "Assign a router to a room / floor",
      description: "Creates or updates a router assignment. Also stores a custom label.",
      params: {
        type: "object",
        required: ["macHash"],
        properties: { macHash: { type: "string" } },
      },
      body: {
        type: "object",
        properties: {
          roomId: { type: "string", nullable: true },
          floorId: { type: "string", nullable: true },
          label: { type: "string", nullable: true },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { $ref: "RouterAssignment" },
          },
        },
        500: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    const { macHash } = request.params as { macHash: string };
    const body = request.body as {
      roomId?: string | null;
      floorId?: string | null;
      label?: string | null;
    };

    try {
      const liveAPs = scannerRef ? scannerRef.getAccessPoints() : [];
      const liveAP = liveAPs.find((ap) => ap.id === macHash);

      const assignment = await prisma.routerAssignment.upsert({
        where: { macHash },
        update: {
          roomId: body.roomId ?? undefined,
          floorId: body.floorId ?? undefined,
          label: body.label !== undefined ? body.label : undefined,
          ...(liveAP
            ? { ip: liveAP.ip, mac: liveAP.mac, hostname: liveAP.hostname }
            : {}),
        },
        create: {
          macHash,
          roomId: body.roomId ?? null,
          floorId: body.floorId ?? null,
          label: body.label ?? null,
          mac: liveAP?.mac ?? null,
          ip: liveAP?.ip ?? null,
          hostname: liveAP?.hostname ?? null,
          vendor: null,
          deviceType: null,
        },
        include: {
          room: { select: { id: true, name: true } },
          floor: { select: { id: true, name: true, level: true } },
        },
      });

      return { success: true, data: assignment };
    } catch (error) {
      console.error("Failed to update router assignment:", error);
      reply.status(500);
      return { success: false, error: "Failed to update router assignment" };
    }
  });

  // DELETE /routers/:macHash
  app.delete("/routers/:macHash", {
    schema: {
      tags: ["Routers"],
      summary: "Remove a router assignment",
      params: {
        type: "object",
        required: ["macHash"],
        properties: { macHash: { type: "string" } },
      },
      response: {
        200: { $ref: "SuccessResponse" },
        404: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    const { macHash } = request.params as { macHash: string };

    try {
      await prisma.routerAssignment.delete({ where: { macHash } });
      return { success: true };
    } catch (error) {
      reply.status(404);
      return { success: false, error: "Router assignment not found" };
    }
  });

  // POST /routers/sync
  app.post("/routers/sync", {
    schema: {
      tags: ["Routers"],
      summary: "Sync detected APs to database",
      description: "Persists all currently detected access points into the RouterAssignment table.",
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                synced: { type: "integer" },
                created: { type: "integer" },
                updated: { type: "integer" },
              },
            },
          },
        },
        404: { $ref: "ErrorResponse" },
      },
    },
  }, async (_req, reply) => {
    if (!scannerRef) {
      return reply.code(404).send({
        success: false,
        error: "Network scanner is not active",
      });
    }

    const liveAPs = scannerRef.getAccessPoints();
    let created = 0;
    let updated = 0;

    for (const ap of liveAPs) {
      const existing = await prisma.routerAssignment.findUnique({
        where: { macHash: ap.id },
      });

      if (existing) {
        await prisma.routerAssignment.update({
          where: { macHash: ap.id },
          data: { ip: ap.ip, mac: ap.mac, hostname: ap.hostname },
        });
        updated++;
      } else {
        await prisma.routerAssignment.create({
          data: {
            macHash: ap.id,
            mac: ap.mac,
            ip: ap.ip,
            hostname: ap.hostname,
            vendor: null,
            deviceType: null,
            floorId: ap.floorId,
            roomId: ap.roomId,
          },
        });
        created++;
      }
    }

    return {
      success: true,
      data: { synced: liveAPs.length, created, updated },
    };
  });
}
