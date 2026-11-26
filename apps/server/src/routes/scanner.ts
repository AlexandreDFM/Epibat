/**
 * File Name: scanner.ts
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Network scanner routes - status, manual scan, devices, and APs.
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
import { NetworkScannerService } from "../services/network-scanner.service.js";
import { getWiFiInfo } from "../utils/wifi-info.js";

let scannerRef: NetworkScannerService | null = null;

export function setScannerRef(scanner: NetworkScannerService): void {
  scannerRef = scanner;
}

export function registerScannerRoutes(app: FastifyInstance): void {
  // GET /scanner/status
  app.get("/scanner/status", {
    schema: {
      tags: ["Scanner"],
      summary: "Scanner status",
      description: "Returns whether the scanner is active/scanning and the last scan summary.",
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { $ref: "ScannerStatus" },
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

    const lastResult = scannerRef.getLastResult();

    return {
      success: true,
      data: {
        active: true,
        scanning: scannerRef.isScanning(),
        lastScan: lastResult
          ? {
              timestamp: lastResult.timestamp,
              devicesFound: lastResult.devicesFound,
              devicesPlaced: lastResult.devicesPlaced,
              accessPointsFound: lastResult.accessPointsFound,
              duration: lastResult.duration,
            }
          : null,
      },
    };
  });

  // POST /scanner/scan
  app.post("/scanner/scan", {
    schema: {
      tags: ["Scanner"],
      summary: "Trigger a manual scan",
      description: "Runs a full network scan immediately and returns the result. Returns 429 if a scan is already in progress.",
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { $ref: "ScanResult" },
          },
        },
        404: { $ref: "ErrorResponse" },
        429: { $ref: "ErrorResponse" },
      },
    },
  }, async (_req, reply) => {
    if (!scannerRef) {
      return reply.code(404).send({
        success: false,
        error: "Network scanner is not active",
      });
    }

    if (scannerRef.isScanning()) {
      return reply.code(429).send({
        success: false,
        error: "Scan already in progress",
      });
    }

    const result = await scannerRef.scan();

    return {
      success: true,
      data: {
        timestamp: result.timestamp,
        devicesFound: result.devicesFound,
        devicesPlaced: result.devicesPlaced,
        accessPointsFound: result.accessPointsFound,
        duration: result.duration,
        devices: result.devices.map((d) => ({
          ip: d.ip,
          mac: d.mac,
          hostname: d.hostname ?? null,
          vendor: d.vendor ?? null,
          deviceType: d.deviceType ?? null,
          isLocal: d.isLocal ?? false,
        })),
        accessPoints: result.accessPoints.map((ap) => ({
          ip: ap.ip,
          mac: ap.mac,
          hostname: ap.hostname ?? null,
          vendor: ap.vendor ?? null,
          deviceType: ap.deviceType ?? null,
        })),
      },
    };
  });

  // GET /scanner/devices
  app.get("/scanner/devices", {
    schema: {
      tags: ["Scanner"],
      summary: "List discovered devices",
      description: "Returns all devices found in the last network scan.",
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "array", items: { $ref: "NetworkDevice" } },
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

    const lastResult = scannerRef.getLastResult();
    if (!lastResult) {
      return { success: true, data: [] };
    }

    return {
      success: true,
      data: lastResult.devices.map((d) => ({
        ip: d.ip,
        mac: d.mac,
        hostname: d.hostname ?? null,
        vendor: d.vendor ?? null,
        deviceType: d.deviceType ?? null,
        isLocal: d.isLocal ?? false,
      })),
    };
  });

  // GET /scanner/access-points
  app.get("/scanner/access-points", {
    schema: {
      tags: ["Scanner"],
      summary: "List detected access points",
      description: "Returns all access points currently tracked by the scanner.",
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "array", items: { $ref: "NetworkDevice" } },
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

    return {
      success: true,
      data: scannerRef.getAccessPoints(),
    };
  });

  // GET /scanner/wifi
  app.get("/scanner/wifi", {
    schema: {
      tags: ["Scanner"],
      summary: "Current WiFi connection info",
      description: "Returns information about the server's current WiFi connection.",
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                ssid: { type: "string", nullable: true },
                bssid: { type: "string", nullable: true },
                channel: { type: "integer", nullable: true },
                signal: { type: "integer", nullable: true },
                security: { type: "string", nullable: true },
                frequency: { type: "number", nullable: true },
              },
            },
          },
        },
      },
    },
  }, async (_req, _reply) => {
    const info = getWiFiInfo();
    return { success: true, data: info };
  });
}
