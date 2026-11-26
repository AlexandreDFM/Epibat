/**
 * File Name: page.tsx
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Dashboard page - 3D building visualization and real-time occupancy.
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

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { useSocketContext } from "@/components/providers/SocketProvider";
import { useDevicePositions } from "@/hooks/useDevicePositions";
import { useRoomOccupancy } from "@/hooks/useRoomOccupancy";
import { Sidebar } from "@/components/ui/Sidebar";
import { getFloors, getRooms, getDeviceCounts } from "@/lib/api";
import type { Device } from "@epibat/shared";

// Dynamic import for Three.js Scene (no SSR)
const Scene = dynamic(
  () => import("@/components/three/Scene").then((m) => m.Scene),
  { ssr: false }
);

function DashboardContent() {
  const { isConnected } = useSocketContext();

  // ── State ────────────────────────────────────────────────────────────
  const [floors, setFloors] = useState<
    Array<{ id: string; level: number; name: string; textureUrl?: string | null }>
  >([]);
  const [rooms, setRooms] = useState<
    Array<{
      id: string;
      name: string;
      polygon: Array<{ x: number; y: number }>;
      capacity: number;
      type: string;
    }>
  >([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [deviceCounts, setDeviceCounts] = useState<Record<string, number>>({});

  // Real-time data
  const { devices } = useDevicePositions(selectedFloorId);
  const { occupancy } = useRoomOccupancy(selectedFloorId);

  // ── Load floors on mount ─────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const data = await getFloors();
        setFloors(
          data.map((f) => ({ id: f.id, level: f.level, name: f.name, textureUrl: f.textureUrl }))
        );
        // Auto-select first floor
        if (data.length > 0 && !selectedFloorId) {
          setSelectedFloorId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load floors:", err);
      }
    }
    load();
  }, []);

  // ── Refresh device counts per floor periodically ────────────────────
  useEffect(() => {
    async function fetchCounts() {
      try {
        const counts = await getDeviceCounts();
        setDeviceCounts(counts);
      } catch (err) {
        console.error("Failed to load device counts:", err);
      }
    }
    fetchCounts();
    const interval = setInterval(fetchCounts, 30_000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // ── Load rooms when floor changes ────────────────────────────────────
  useEffect(() => {
    if (!selectedFloorId) return;
    async function loadRooms() {
      try {
        const data = await getRooms(selectedFloorId!);
        setRooms(data);
        setSelectedRoomId(null);
      } catch (err) {
        console.error("Failed to load rooms:", err);
      }
    }
    loadRooms();
  }, [selectedFloorId]);

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleFloorSelect = useCallback((floorId: string) => {
    setSelectedFloorId(floorId);
  }, []);

  const handleRoomSelect = useCallback((roomId: string) => {
    setSelectedRoomId((prev) => (prev === roomId ? null : roomId));
  }, []);

  const handleDeviceSelect = useCallback(
    (device: Device) => {
      // Navigate to the device's floor and highlight
      if (device.floorId !== selectedFloorId) {
        setSelectedFloorId(device.floorId);
      }
      if (device.roomId) {
        setSelectedRoomId(device.roomId);
      }
    },
    [selectedFloorId]
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        floors={floors}
        rooms={rooms.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          capacity: r.capacity,
        }))}
        occupancy={occupancy}
        selectedFloorId={selectedFloorId}
        selectedRoomId={selectedRoomId}
        isConnected={isConnected}
        deviceCount={devices.length}
        deviceCounts={deviceCounts}
        onFloorSelect={handleFloorSelect}
        onRoomSelect={handleRoomSelect}
        onDeviceSelect={handleDeviceSelect}
      />
      <main className="flex-1 relative">
        <Scene
          rooms={rooms}
          devices={devices}
          occupancy={occupancy}
          selectedRoomId={selectedRoomId}
          onRoomClick={handleRoomSelect}
          floorPlanUrl={floors.find((f) => f.id === selectedFloorId)?.textureUrl ?? null}
        />

        {/* Floor indicator overlay */}
        <div className="absolute top-4 right-4 bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm">
          <span className="text-[var(--muted-foreground)]">Étage : </span>
          <span className="font-semibold text-[var(--foreground)]">
            {floors.find((f) => f.id === selectedFloorId)?.name ??
              "Aucun"}
          </span>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <SocketProvider>
      <DashboardContent />
    </SocketProvider>
  );
}
