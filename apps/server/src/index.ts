/**
 * File Name: index.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Fastify server entry point - registers plugins, routes, and starts listening.
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

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { createServer } from "http";
import path from "path";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import { createSocketServer } from "./plugins/socket.js";
import { registerRoomRoutes } from "./routes/rooms.js";
import { registerDeviceRoutes } from "./routes/devices.js";
import { registerFloorRoutes } from "./routes/floors.js";
import { registerFloorPlanRoutes } from "./routes/floor-plans.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { MistService } from "./services/mist.service.js";
import { NetworkScannerService } from "./services/network-scanner.service.js";
import { PresenceService } from "./services/presence.service.js";
import { registerScannerRoutes, setScannerRef } from "./routes/scanner.js";
import { registerRouterRoutes, setRoutersScannerRef } from "./routes/routers.js";
import { registerSwagger } from "./plugins/swagger.js";

async function bootstrap() {
  // ── Create Fastify with a shared HTTP server ──────────────────────────
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn",
    },
    ajv: {
      customOptions: {
        keywords: ["example"],          // allow OpenAPI "example" in body schemas
      },
    },
  });

  // ── Register plugins ──────────────────────────────────────────────────
  await fastify.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Allow Three.js assets
  });

  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
  });

  // File upload support (max 10 MB)
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB
    },
  });

  // Serve uploaded files
  await fastify.register(fastifyStatic, {
    root: path.resolve(process.cwd(), "uploads"),
    prefix: "/uploads/",
    decorateReply: false,
  });

  // ── Swagger / OpenAPI docs ────────────────────────────────────────────
  await registerSwagger(fastify);

  // ── Health check ──────────────────────────────────────────────────────
  fastify.get("/health", {
    schema: {
      tags: ["Health"],
      summary: "Health check",
      description: "Returns server status, current timestamp and uptime in seconds.",
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string", example: "ok" },
            timestamp: { type: "string", format: "date-time" },
            uptime: { type: "number", description: "Uptime in seconds" },
          },
        },
      },
    },
  }, async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  // ── Register API routes ───────────────────────────────────────────────
  await fastify.register(
    async (app) => {
      registerRoomRoutes(app);
      registerDeviceRoutes(app);
      registerFloorRoutes(app);
      registerFloorPlanRoutes(app);
      registerAuthRoutes(app);
      registerScannerRoutes(app);
      registerRouterRoutes(app);
    },
    { prefix: "/api/v1" }
  );

  // ── Start server ──────────────────────────────────────────────────────
  try {
    // Connect to external services
    await connectDatabase();
    await connectRedis();

    // Start HTTP + WebSocket
    await fastify.listen({ port: env.PORT, host: env.HOST });

    // Attach Socket.io to the same HTTP server
    const httpServer = fastify.server;
    const io = createSocketServer(httpServer);

    // Start Mist WebSocket listener
    const mistService = new MistService();
    mistService.connect();

    // Start network scanner (fallback when Mist is not availble)
    if (env.SCAN_ENABLED) {
      const scanner = new NetworkScannerService(
        env.SCAN_INTERVAL * 1000,
        env.SCAN_DEFAULT_FLOOR_ID,
      );
      setScannerRef(scanner);
      setRoutersScannerRef(scanner);
      await scanner.start();
    }

    // Start presence engine
    const presenceService = new PresenceService(io);
    presenceService.startBroadcastLoop();
    presenceService.startCleanupLoop();

    console.log(
      `🚀 EpiBat server running on http://${env.HOST}:${env.PORT}`
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  // ── Graceful shutdown ─────────────────────────────────────────────────
  const shutdown = async () => {
    console.log("\n🛑 Shutting down gracefully...");
    await fastify.close();
    await disconnectDatabase();
    await disconnectRedis();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap();
