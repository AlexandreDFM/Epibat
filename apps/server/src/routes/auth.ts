/**
 * File Name: auth.ts
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Authentication routes - register, opt-out, and user profile (JWT).
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
import { hashMac } from "../utils/hash.js";

export function registerAuthRoutes(app: FastifyInstance): void {
  // POST /api/v1/auth/register
  app.post("/auth/register", {
    schema: {
      tags: ["Auth"],
      summary: "Register a user for opt-in tracking",
      description: "Creates or updates a user and returns a JWT token. Optionally links a MAC address to the user.",
      body: {
        type: "object",
        required: ["email", "displayName"],
        properties: {
          email: { type: "string", format: "email" },
          displayName: { type: "string" },
          macAddress: { type: "string", description: "Raw MAC address to link (will be hashed)" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                user: { $ref: "User" },
                token: { type: "string" },
              },
            },
          },
        },
        400: { $ref: "ErrorResponse" },
        500: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    const { email, displayName, macAddress } = request.body as {
      email: string;
      displayName: string;
      macAddress?: string;
    };

    if (!email || !displayName) {
      reply.status(400);
      return { success: false, error: "email and displayName are required" };
    }

    try {
      const user = await prisma.user.upsert({
        where: { email },
        update: { displayName, optedIn: true },
        create: { email, displayName, optedIn: true },
      });

      if (macAddress) {
        const macHash = hashMac(macAddress);
        await prisma.device.upsert({
          where: { macHash },
          update: { userId: user.id },
          create: { macHash, userId: user.id },
        });
      }

      const token = app.jwt.sign(
        { userId: user.id, email: user.email },
        { expiresIn: "7d" }
      );

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            displayName: user.displayName,
            email: user.email,
            optedIn: user.optedIn,
          },
          token,
        },
      };
    } catch (error) {
      reply.status(500);
      return { success: false, error: "Failed to register user" };
    }
  });

  // POST /api/v1/auth/optout
  app.post("/auth/optout", {
    schema: {
      tags: ["Auth"],
      summary: "Opt out of tracking",
      body: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
        },
      },
      response: {
        200: { $ref: "SuccessResponse" },
        500: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    const { email } = request.body as { email: string };

    try {
      await prisma.user.update({
        where: { email },
        data: { optedIn: false },
      });
      return { success: true };
    } catch (error) {
      reply.status(500);
      return { success: false, error: "Failed to opt out" };
    }
  });

  // GET /api/v1/auth/me
  app.get("/auth/me", {
    schema: {
      tags: ["Auth"],
      summary: "Get current user from JWT",
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { $ref: "User" },
          },
        },
        401: { $ref: "ErrorResponse" },
        404: { $ref: "ErrorResponse" },
      },
    },
  }, async (request, reply) => {
    try {
      await request.jwtVerify();
      const { userId } = request.user as { userId: string };

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          displayName: true,
          email: true,
          avatarUrl: true,
          optedIn: true,
        },
      });

      if (!user) {
        reply.status(404);
        return { success: false, error: "User not found" };
      }

      return { success: true, data: user };
    } catch (error) {
      reply.status(401);
      return { success: false, error: "Unauthorized" };
    }
  });
}
