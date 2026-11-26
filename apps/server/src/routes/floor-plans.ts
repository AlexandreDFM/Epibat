/**
 * File Name: floor-plans.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Floor plan routes - upload, delete, and retrieve PDF/image plans.
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
import { promises as fs } from "fs";
import path from "path";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "floor-plans");

export function registerFloorPlanRoutes(app: FastifyInstance): void {
  // POST /floors/:id/plan — Upload a floor plan
  app.post("/floors/:id/plan", {
    schema: {
      tags: ["Floor Plans"],
      summary: "Upload a floor plan",
      description: "Upload a PDF, PNG, JPEG or SVG file as the floor plan. Max 10 MB. Uses multipart/form-data.",
      consumes: ["multipart/form-data"],
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
            data: {
              type: "object",
              properties: {
                floorId: { type: "string" },
                level: { type: "integer" },
                name: { type: "string" },
                textureUrl: { type: "string" },
                fileSize: { type: "integer", description: "Bytes" },
                filename: { type: "string" },
              },
            },
          },
        },
        400: { $ref: "ErrorResponse" },
        404: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const floor = await prisma.floor.findUnique({ where: { id } });
    if (!floor) {
      return reply.code(404).send({ success: false, error: "Floor not found" });
    }

    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ success: false, error: "No file uploaded" });
    }

    const allowedMimes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/svg+xml",
    ];
    if (!allowedMimes.includes(data.mimetype)) {
      return reply.code(400).send({
        success: false,
        error: `Invalid file type: ${data.mimetype}. Allowed: PDF, PNG, JPEG, SVG`,
      });
    }

    const extMap: Record<string, string> = {
      "application/pdf": ".pdf",
      "image/png": ".png",
      "image/jpeg": ".jpg",
      "image/svg+xml": ".svg",
    };
    const ext = extMap[data.mimetype] || ".bin";
    const filename = `floor-${floor.level}-${Date.now()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    if (floor.textureUrl) {
      const oldFile = path.join(UPLOAD_DIR, path.basename(floor.textureUrl));
      try { await fs.unlink(oldFile); } catch { /* ignore */ }
    }

    const buffer = await data.toBuffer();
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/floor-plans/${filename}`;
    const updated = await prisma.floor.update({
      where: { id },
      data: { textureUrl: publicUrl },
    });

    console.log(
      `📄 Floor plan uploaded: level ${floor.level} → ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`
    );

    return {
      success: true,
      data: {
        floorId: updated.id,
        level: updated.level,
        name: updated.name,
        textureUrl: updated.textureUrl,
        fileSize: buffer.length,
        filename,
      },
    };
  });

  // DELETE /floors/:id/plan
  app.delete("/floors/:id/plan", {
    schema: {
      tags: ["Floor Plans"],
      summary: "Delete a floor plan",
      description: "Removes the floor plan file and clears the DB reference.",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      response: {
        200: { $ref: "SuccessResponse" },
        404: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const floor = await prisma.floor.findUnique({ where: { id } });
    if (!floor) {
      return reply.code(404).send({ success: false, error: "Floor not found" });
    }

    if (!floor.textureUrl) {
      return reply.code(404).send({ success: false, error: "No floor plan to delete" });
    }

    const filePath = path.join(UPLOAD_DIR, path.basename(floor.textureUrl));
    try { await fs.unlink(filePath); } catch { /* ignore */ }

    await prisma.floor.update({
      where: { id },
      data: { textureUrl: null },
    });

    console.log(`🗑️  Floor plan deleted: level ${floor.level}`);

    return { success: true };
  });

  // GET /floors/:id/plan
  app.get("/floors/:id/plan", {
    schema: {
      tags: ["Floor Plans"],
      summary: "Get floor plan info",
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
            data: { $ref: "FloorPlanInfo" },
          },
        },
        404: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const floor = await prisma.floor.findUnique({
      where: { id },
      select: { id: true, level: true, name: true, textureUrl: true },
    });

    if (!floor) {
      return reply.code(404).send({ success: false, error: "Floor not found" });
    }

    return {
      success: true,
      data: {
        floorId: floor.id,
        level: floor.level,
        name: floor.name,
        textureUrl: floor.textureUrl,
        hasFloorPlan: !!floor.textureUrl,
      },
    };
  });

  // GET /floors/plans
  app.get("/floors/plans", {
    schema: {
      tags: ["Floor Plans"],
      summary: "List all floor plans",
      description: "Returns plan info for every floor.",
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "array", items: { $ref: "FloorPlanInfo" } },
          },
        },
      },
    },
  }, async (_request, _reply) => {
    const floors = await prisma.floor.findMany({
      orderBy: { level: "asc" },
      select: { id: true, level: true, name: true, textureUrl: true },
    });

    return {
      success: true,
      data: floors.map((f) => ({
        floorId: f.id,
        level: f.level,
        name: f.name,
        textureUrl: f.textureUrl,
        hasFloorPlan: !!f.textureUrl,
      })),
    };
  });
}
