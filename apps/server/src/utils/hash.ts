/**
 * File Name: hash.ts
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: MAC address hashing utilities (SHA-256 + salt for GDPR).
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

import { createHash } from "crypto";
import { env } from "../config/env.js";

/**
 * Hash a MAC address using SHA-256 with a salt for GDPR compliance.
 * The same MAC will always produce the same hash (deterministic).
 */
export function hashMac(mac: string): string {
  const normalized = mac.toLowerCase().replace(/[:-]/g, "");
  return createHash("sha256")
    .update(`${env.MAC_HASH_SALT}:${normalized}`)
    .digest("hex");
}

/**
 * Hash any string value (e.g., device identifiers).
 */
export function hashValue(value: string): string {
  return createHash("sha256")
    .update(`${env.MAC_HASH_SALT}:${value}`)
    .digest("hex");
}
