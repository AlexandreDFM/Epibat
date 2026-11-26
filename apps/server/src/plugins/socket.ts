/**
 * File Name: socket.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Socket.io plugin for real-time device and room events.
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

import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "@epibat/shared";
import { env } from "../config/env.js";

export type TypedIO = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

let io: TypedIO;

export function createSocketServer(httpServer: HttpServer): TypedIO {
  io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // ── Floor subscription management ──────────────────────────────────
    socket.on("floor:subscribe", (floorId) => {
      // Leave previous floor room
      if (socket.data.subscribedFloor) {
        socket.leave(`floor:${socket.data.subscribedFloor}`);
      }
      socket.join(`floor:${floorId}`);
      socket.data.subscribedFloor = floorId;
      console.log(`📍 ${socket.id} subscribed to floor ${floorId}`);
    });

    socket.on("floor:unsubscribe", (floorId) => {
      socket.leave(`floor:${floorId}`);
      if (socket.data.subscribedFloor === floorId) {
        socket.data.subscribedFloor = undefined;
      }
    });

    // ── User opt-in ────────────────────────────────────────────────────
    socket.on("user:optin", ({ token }) => {
      // TODO: verify JWT token -> extract userId -> store in socket.data
      console.log(`👤 User opt-in with token: ${token.substring(0, 10)}...`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function getIO(): TypedIO {
  if (!io) {
    throw new Error("Socket.io not initialized. Call createSocketServer first.");
  }
  return io;
}
