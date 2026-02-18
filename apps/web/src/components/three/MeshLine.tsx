/**
 * File Name: MeshLine.tsx
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Three.js component - renders connection lines between devices and APs.
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

import { useMemo, useRef } from "react";
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Device } from "@epibat/shared";

interface MeshLineProps {
  device: Device;
  ap: Device;
}

export function MeshLine({ device, ap }: MeshLineProps) {
  const lineRef = useRef<any>(null);

  const points = useMemo(() => {
    // Slight arc via a midpoint raised up for better visibility
    const dx = ap.position.x - device.position.x;
    const dz = ap.position.z - device.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const midY = Math.min(0.8, 0.3 + dist * 0.05);

    return [
      [device.position.x, device.position.y + 0.5, device.position.z] as [number, number, number],
      [
        (device.position.x + ap.position.x) / 2,
        midY,
        (device.position.z + ap.position.z) / 2,
      ] as [number, number, number],
      [ap.position.x, ap.position.y, ap.position.z] as [number, number, number],
    ];
  }, [
    device.position.x,
    device.position.y,
    device.position.z,
    ap.position.x,
    ap.position.y,
    ap.position.z,
  ]);

  // Animate dash offset for a flowing effect
  useFrame(() => {
    if (lineRef.current?.material) {
      lineRef.current.material.dashOffset -= 0.01;
    }
  });

  const isLocal = !!device.isLocal;
  const color = isLocal ? "#f59e0b" : "#10b981";
  const lineWidth = isLocal ? 2 : 1.2;
  const opacity = isLocal ? 0.6 : 0.35;

  return (
    <Line
      ref={lineRef}
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
      dashed
      dashSize={0.25}
      gapSize={0.12}
    />
  );
}
