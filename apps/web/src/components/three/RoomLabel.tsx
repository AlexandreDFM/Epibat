/**
 * File Name: RoomLabel.tsx
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Three.js component - renders room name labels on the 3D scene.
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

"use client";

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import type { RoomOccupancy } from "@epibat/shared";
import { OCCUPANCY_COLORS } from "@epibat/shared";
import { polygonCentroid } from "@/lib/coordinates";

interface RoomLabelProps {
  room: {
    id: string;
    name: string;
    polygon: Array<{ x: number; y: number }>;
  };
  occupancy: RoomOccupancy | null;
}

export function RoomLabel({ room, occupancy }: RoomLabelProps) {
  const center = useMemo(
    () => polygonCentroid(room.polygon),
    [room.polygon]
  );

  const statusColor = occupancy
    ? OCCUPANCY_COLORS[occupancy.status] ?? OCCUPANCY_COLORS.empty
    : OCCUPANCY_COLORS.empty;

  const count = occupancy?.currentCount ?? 0;
  const capacity = occupancy?.capacity ?? 0;

  return (
    <Html
      position={[center.x, 3, center.y]}
      center
      distanceFactor={20}
      style={{ pointerEvents: "none" }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.85)",
          borderRadius: "8px",
          padding: "6px 12px",
          textAlign: "center",
          border: `1px solid ${statusColor}40`,
          minWidth: "80px",
        }}
      >
        <div
          style={{
            color: "white",
            fontSize: "12px",
            fontWeight: 600,
            marginBottom: "2px",
          }}
        >
          {room.name}
        </div>
        {occupancy && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              fontSize: "10px",
              color: "#a1a1aa",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: statusColor,
                display: "inline-block",
              }}
            />
            {count}/{capacity}
          </div>
        )}
      </div>
    </Html>
  );
}
