/**
 * File Name: Scene.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Three.js scene component - camera, lights, controls, and child objects.
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

import { Canvas } from "@react-three/fiber";
import { OrbitControls, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import type { Device, RoomOccupancy } from "@epibat/shared";

interface SceneProps {
  rooms: Array<{
    id: string;
    name: string;
    polygon: Array<{ x: number; y: number }>;
    capacity: number;
    type: string;
  }>;
  devices: Device[];
  occupancy: RoomOccupancy[];
  selectedRoomId: string | null;
  onRoomClick: (roomId: string) => void;
  floorPlanUrl?: string | null;
}

// Lazy imported components
import { FloorPlan } from "./FloorPlan";
import { RoomMesh } from "./RoomMesh";
import { DeviceMarker } from "./DeviceMarker";
import { AccessPointMarker } from "./AccessPointMarker";
import { MeshLine } from "./MeshLine";
import { RoomLabel } from "./RoomLabel";

export function Scene({
  rooms,
  devices,
  occupancy,
  selectedRoomId,
  onRoomClick,
  floorPlanUrl,
}: SceneProps) {
  // Separate access points from regular client devices
  const { accessPoints, clients, apMap, clientCountByAp, clientsByAp } = useMemo(() => {
    const aps: Device[] = [];
    const cls: Device[] = [];
    const map = new Map<string, Device>();
    const counts = new Map<string, number>();
    const clientsMap = new Map<string, Array<{ id: string; label: string }>>();

    for (const d of devices) {
      if (d.isAccessPoint) {
        aps.push(d);
        map.set(d.id, d);
        counts.set(d.id, 0);
        clientsMap.set(d.id, []);
      } else {
        cls.push(d);
      }
    }

    // Count clients per AP and build client labels
    for (const c of cls) {
      if (c.connectedApId && counts.has(c.connectedApId)) {
        counts.set(c.connectedApId, (counts.get(c.connectedApId) ?? 0) + 1);
        const label = c.isLocal
          ? "⭐ Cet appareil"
          : (c.hostname ?? c.ip ?? c.id.slice(0, 8));
        clientsMap.get(c.connectedApId)!.push({ id: c.id, label });
      }
    }

    // Sort so local device renders last (on top)
    cls.sort((a, b) => (a.isLocal ? 1 : 0) - (b.isLocal ? 1 : 0));

    return { accessPoints: aps, clients: cls, apMap: map, clientCountByAp: counts, clientsByAp: clientsMap };
  }, [devices]);

  return (
    <div className="canvas-container" style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [15, 20, 25], fov: 50, near: 0.1, far: 500 }}
        shadows
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[20, 30, 10]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <pointLight position={[-10, 15, -10]} intensity={0.3} />

          {/* Floor base plane */}
          <FloorPlan textureUrl={floorPlanUrl} />

          {/* Room zones */}
          {rooms.map((room) => {
            const roomOccupancy = occupancy.find(
              (o) => o.roomId === room.id
            );
            return (
              <RoomMesh
                key={room.id}
                room={room}
                occupancy={roomOccupancy ?? null}
                isSelected={room.id === selectedRoomId}
                onClick={() => onRoomClick(room.id)}
              />
            );
          })}

          {/* Room labels */}
          {rooms.map((room) => {
            const roomOccupancy = occupancy.find(
              (o) => o.roomId === room.id
            );
            return (
              <RoomLabel
                key={`label-${room.id}`}
                room={room}
                occupancy={roomOccupancy ?? null}
              />
            );
          })}

          {/* Access Point markers */}
          {accessPoints.map((ap) => (
            <AccessPointMarker
              key={ap.id}
              device={ap}
              clientCount={clientCountByAp.get(ap.id) ?? 0}
              connectedClients={clientsByAp.get(ap.id) ?? []}
            />
          ))}

          {/* Client device markers */}
          {clients.map((device) => {
            const apDevice = device.connectedApId ? apMap.get(device.connectedApId) : undefined;
            const apLabel = apDevice
              ? (apDevice.hostname ?? apDevice.ip ?? apDevice.id.slice(0, 8))
              : (device.connectedApName ?? undefined);
            return (
              <DeviceMarker
                key={device.id}
                device={device}
                connectedApLabel={apLabel}
              />
            );
          })}

          {/* Mesh lines: client → AP connections */}
          {clients.map((device) => {
            if (!device.connectedApId) return null;
            const ap = apMap.get(device.connectedApId);
            if (!ap) return null;
            return (
              <MeshLine
                key={`mesh-${device.id}`}
                device={device}
                ap={ap}
              />
            );
          })}

          {/* Controls */}
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.1}
            minDistance={5}
            maxDistance={100}
            maxPolarAngle={Math.PI / 2.2}
          />

          {/* Gizmo */}
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport
              axisColors={["#f44", "#4f4", "#44f"]}
              labelColor="white"
            />
          </GizmoHelper>

          {/* Grid */}
          <gridHelper args={[50, 50, "#1e1e2e", "#1e1e2e"]} />
        </Suspense>
      </Canvas>
    </div>
  );
}
