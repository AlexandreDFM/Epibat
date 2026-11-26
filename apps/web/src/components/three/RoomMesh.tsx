/**
 * File Name: RoomMesh.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Three.js component - renders room boundary meshes with occupancy colors.
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

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { RoomOccupancy } from "@epibat/shared";
import { OCCUPANCY_COLORS } from "@epibat/shared";

interface RoomMeshProps {
  room: {
    id: string;
    name: string;
    polygon: Array<{ x: number; y: number }>;
    type: string;
  };
  occupancy: RoomOccupancy | null;
  isSelected: boolean;
  onClick: () => void;
}

export function RoomMesh({
  room,
  occupancy,
  isSelected,
  onClick,
}: RoomMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Build the room shape from polygon vertices
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (room.polygon.length === 0) return s;

    s.moveTo(room.polygon[0].x, room.polygon[0].y);
    for (let i = 1; i < room.polygon.length; i++) {
      s.lineTo(room.polygon[i].x, room.polygon[i].y);
    }
    s.closePath();
    return s;
  }, [room.polygon]);

  // Determine color based on occupancy
  const color = useMemo(() => {
    if (!occupancy) return OCCUPANCY_COLORS.empty;
    return OCCUPANCY_COLORS[occupancy.status] ?? OCCUPANCY_COLORS.empty;
  }, [occupancy]);

  // Wall height
  const wallHeight = 2.5;

  return (
    <group>
      {/* Floor surface */}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
        receiveShadow
      >
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.6 : hovered ? 0.45 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Walls (extruded shape) */}
      <mesh position={[0, 0, 0]} castShadow>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: wallHeight,
              bevelEnabled: false,
            },
          ]}
        />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          wireframe={false}
        />
      </mesh>

      {/* Wall wireframe edges */}
      <lineSegments position={[0, 0, 0]}>
        <edgesGeometry
          args={[
            new THREE.ExtrudeGeometry(shape, {
              depth: wallHeight,
              bevelEnabled: false,
            }),
          ]}
        />
        <lineBasicMaterial color={color} opacity={0.5} transparent />
      </lineSegments>
    </group>
  );
}
