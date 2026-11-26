/**
 * File Name: env.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Environment variables validation and configuration using Zod.
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

import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  MIST_API_TOKEN: z.string().min(1),
  MIST_SITE_ID: z.string().min(1),
  MIST_ORG_ID: z.string().min(1),

  // Network scanner (fallback when Mist is not configured)
  SCAN_ENABLED: z.coerce.boolean().default(true),
  SCAN_INTERVAL: z.coerce.number().default(30), // seconds
  SCAN_SUBNET_MAP: z.string().optional(), // "prefix:floorId:roomId,..."
  SCAN_DEFAULT_FLOOR_ID: z.string().optional(),

  JWT_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  MAC_HASH_SALT: z.string().min(8),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error(
      "❌ Invalid environment variables:",
      result.error.flatten().fieldErrors
    );
    // In development, warn but don't crash (allow running with defaults)
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
    console.warn("⚠️  Running with partial env — some features may not work.");
    return envSchema.parse({
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@localhost:5432/epibat",
      MIST_API_TOKEN: process.env.MIST_API_TOKEN ?? "dev-placeholder",
      MIST_SITE_ID: process.env.MIST_SITE_ID ?? "dev-placeholder",
      MIST_ORG_ID: process.env.MIST_ORG_ID ?? "dev-placeholder",
      JWT_SECRET:
        process.env.JWT_SECRET ?? "dev-secret-not-for-production-1234",
      MAC_HASH_SALT: process.env.MAC_HASH_SALT ?? "dev-salt-change-me",
    });
  }

  return result.data;
}

export const env = loadEnv();
