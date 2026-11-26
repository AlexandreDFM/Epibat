/**
 * File Name: swagger.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Swagger/OpenAPI 3.0 plugin - schemas registration and Swagger UI.
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
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

/**
 * Register @fastify/swagger + @fastify/swagger-ui on a Fastify instance
 * AND add all shared JSON schemas so routes can $ref them.
 *
 * MUST be called **before** any routes are registered.
 */
export async function registerSwagger(app: FastifyInstance): Promise<void> {
  /* ── 1. Register the swagger plugin ─────────────────────────────────── */
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "EpiBat API",
        description:
          "REST API for **EpiBat** – Building occupancy tracking system for Epitech Nice.\n\n" +
          "## Authentication\n" +
          "Most endpoints are public. Protected endpoints require a `Bearer` JWT token obtained from `POST /api/v1/auth/register`.\n\n" +
          "## Real-time (Socket.io)\n" +
          "Connect to the Socket.io server on the same host & port for live updates.\n\n" +
          "| Direction | Event | Payload |\n" +
          "|-----------|-------|---------|\n" +
          "| Client → Server | `floor:subscribe` | `floorId: string` |\n" +
          "| Client → Server | `floor:unsubscribe` | `floorId: string` |\n" +
          "| Client → Server | `user:optin` | `{ token: string }` |\n" +
          "| Server → Client | `devices:update` | `Device[]` |\n" +
          "| Server → Client | `room:occupancy` | `RoomOccupancy[]` |\n" +
          "| Server → Client | `device:moved` | `Device` |\n" +
          "| Server → Client | `device:entered` | `{ device, roomId }` |\n" +
          "| Server → Client | `device:left` | `{ deviceId, roomId }` |",
        version: "1.0.0",
        contact: {
          name: "Epitech Nice",
          url: "https://github.com/epitech-nice/EpiBat",
        },
        license: { name: "MIT" },
      },
      servers: [
        { url: "http://localhost:4000", description: "Local development" },
      ],
      tags: [
        { name: "Health", description: "Server health check" },
        { name: "Auth", description: "User registration, opt-in/out, JWT" },
        { name: "Floors", description: "Building floors management" },
        { name: "Floor Plans", description: "Floor plan file upload (PDF / image)" },
        { name: "Rooms", description: "Room CRUD & occupancy" },
        { name: "Devices", description: "Tracked devices" },
        { name: "Routers", description: "Router / AP assignment management" },
        { name: "Scanner", description: "Network scanner control" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
    refResolver: {
      buildLocalReference(json: { $id?: string }, _baseUri: unknown, _fragment: unknown, i: number) {
        return json.$id || `def-${i}`;
      },
    },
  });

  /* ── 2. Add shared JSON schemas (used via { $ref: "SchemaId" }) ──── */

  app.addSchema({
    $id: "SuccessResponse",
    type: "object",
    properties: {
      success: { type: "boolean", const: true },
    },
  });

  app.addSchema({
    $id: "ErrorResponse",
    type: "object",
    properties: {
      success: { type: "boolean", const: false },
      error: { type: "string" },
    },
  });

  app.addSchema({
    $id: "Point2D",
    type: "object",
    required: ["x", "y"],
    properties: {
      x: { type: "number", example: 12.5 },
      y: { type: "number", example: 8.3 },
    },
  });

  app.addSchema({
    $id: "User",
    type: "object",
    properties: {
      id: { type: "string" },
      displayName: { type: "string" },
      email: { type: "string", format: "email" },
      avatarUrl: { type: "string", nullable: true },
      optedIn: { type: "boolean" },
    },
  });

  app.addSchema({
    $id: "Building",
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      address: { type: "string", nullable: true },
      floors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            level: { type: "integer" },
            name: { type: "string" },
          },
        },
      },
    },
  });

  app.addSchema({
    $id: "Floor",
    type: "object",
    properties: {
      id: { type: "string" },
      buildingId: { type: "string" },
      level: { type: "integer" },
      name: { type: "string" },
      textureUrl: { type: "string", nullable: true },
      rooms: {
        type: "array",
        items: { $ref: "Room" },
      },
      building: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
      },
    },
  });

  app.addSchema({
    $id: "Room",
    type: "object",
    properties: {
      id: { type: "string" },
      floorId: { type: "string" },
      name: { type: "string" },
      polygon: {
        type: "array",
        items: { $ref: "Point2D" },
      },
      capacity: { type: "integer" },
      type: { type: "string", example: "classroom" },
    },
  });

  app.addSchema({
    $id: "RoomOccupancy",
    type: "object",
    properties: {
      roomId: { type: "string" },
      roomName: { type: "string" },
      count: { type: "integer" },
      capacity: { type: "integer" },
      percentage: { type: "number" },
    },
  });

  app.addSchema({
    $id: "Device",
    type: "object",
    properties: {
      id: { type: "string" },
      macHash: { type: "string" },
      userId: { type: "string", nullable: true },
      floorId: { type: "string", nullable: true },
      roomId: { type: "string", nullable: true },
      x: { type: "number", nullable: true },
      y: { type: "number", nullable: true },
      lastSeen: { type: "string", format: "date-time" },
      isAccessPoint: { type: "boolean" },
      ip: { type: "string", nullable: true },
      hostname: { type: "string", nullable: true },
      vendor: { type: "string", nullable: true },
      deviceType: { type: "string", nullable: true },
    },
  });

  app.addSchema({
    $id: "DeviceCount",
    type: "object",
    properties: {
      floorId: { type: "string" },
      _count: {
        type: "object",
        properties: {
          id: { type: "integer" },
        },
      },
    },
  });

  app.addSchema({
    $id: "RouterInfo",
    type: "object",
    properties: {
      id: { type: "string", nullable: true },
      macHash: { type: "string" },
      mac: { type: "string", nullable: true },
      ip: { type: "string", nullable: true },
      vendor: { type: "string", nullable: true },
      deviceType: { type: "string", nullable: true },
      hostname: { type: "string", nullable: true },
      label: { type: "string", nullable: true },
      roomId: { type: "string", nullable: true },
      roomName: { type: "string", nullable: true },
      floorId: { type: "string", nullable: true },
      floorName: { type: "string", nullable: true },
      floorLevel: { type: "integer", nullable: true },
      clientCount: { type: "integer" },
      isOnline: { type: "boolean" },
    },
  });

  app.addSchema({
    $id: "RouterAssignment",
    type: "object",
    properties: {
      id: { type: "string" },
      macHash: { type: "string" },
      label: { type: "string", nullable: true },
      roomId: { type: "string", nullable: true },
      floorId: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  });

  app.addSchema({
    $id: "ScannerStatus",
    type: "object",
    properties: {
      active: { type: "boolean" },
      scanning: { type: "boolean" },
      lastScan: {
        type: "object",
        nullable: true,
        properties: {
          timestamp: { type: "string", format: "date-time" },
          devicesFound: { type: "integer" },
          devicesPlaced: { type: "integer" },
          accessPointsFound: { type: "integer" },
          duration: { type: "integer", description: "milliseconds" },
        },
      },
    },
  });

  app.addSchema({
    $id: "ScanResult",
    type: "object",
    properties: {
      timestamp: { type: "string", format: "date-time" },
      devicesFound: { type: "integer" },
      devicesPlaced: { type: "integer" },
      accessPointsFound: { type: "integer" },
      duration: { type: "integer" },
      devices: { type: "array", items: { $ref: "Device" } },
      accessPoints: { type: "array", items: { $ref: "Device" } },
    },
  });

  app.addSchema({
    $id: "NetworkDevice",
    type: "object",
    properties: {
      ip: { type: "string" },
      mac: { type: "string" },
      hostname: { type: "string", nullable: true },
      vendor: { type: "string", nullable: true },
      deviceType: { type: "string", nullable: true },
      isLocal: { type: "boolean" },
    },
  });

  app.addSchema({
    $id: "FloorPlanInfo",
    type: "object",
    properties: {
      floorId: { type: "string" },
      level: { type: "integer" },
      name: { type: "string" },
      textureUrl: { type: "string", nullable: true },
      hasFloorPlan: { type: "boolean" },
    },
  });

  /* ── 3. Swagger UI ──────────────────────────────────────────────────── */
  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
      defaultModelsExpandDepth: 2,
      tryItOutEnabled: true,
    },
    staticCSP: true,
    transformSpecificationClone: true,
  });
}
