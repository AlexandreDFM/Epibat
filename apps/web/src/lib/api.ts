/**
 * File Name: api.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: API client - typed fetch wrapper for backend REST endpoints.
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

/** API base URL — proxied via Next.js rewrites in dev */
const API_BASE = "/api/v1";

async function fetchApi<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  return json.data ?? json;
}

// ─── Buildings & Floors ────────────────────────────────────────────────────

export async function getBuildings() {
  return fetchApi<
    Array<{
      id: string;
      name: string;
      floors: Array<{ id: string; level: number; name: string }>;
    }>
  >("/buildings");
}

export async function getFloors(buildingId?: string) {
  const qs = buildingId ? `?buildingId=${buildingId}` : "";
  return fetchApi<
    Array<{
      id: string;
      level: number;
      name: string;
      textureUrl?: string | null;
      rooms: Array<{ id: string; name: string; capacity: number; type: string }>;
    }>
  >(`/floors${qs}`);
}

export async function getFloor(id: string) {
  return fetchApi<{
    id: string;
    level: number;
    name: string;
    rooms: Array<{
      id: string;
      name: string;
      polygon: Array<{ x: number; y: number }>;
      capacity: number;
      type: string;
    }>;
  }>(`/floors/${id}`);
}

// ─── Rooms ─────────────────────────────────────────────────────────────────

export async function getRooms(floorId?: string) {
  const qs = floorId ? `?floorId=${floorId}` : "";
  return fetchApi<
    Array<{
      id: string;
      floorId: string;
      name: string;
      polygon: Array<{ x: number; y: number }>;
      capacity: number;
      type: string;
    }>
  >(`/rooms${qs}`);
}

export async function getRoomOccupancy(floorId: string) {
  return fetchApi<
    Array<{
      roomId: string;
      roomName: string;
      currentCount: number;
      capacity: number;
      fillRatio: number;
      status: string;
    }>
  >(`/rooms/${floorId}/occupancy`);
}

// ─── Devices ───────────────────────────────────────────────────────────────

export async function getDevices(floorId?: string) {
  const qs = floorId ? `?floorId=${floorId}` : "";
  return fetchApi<
    Array<{
      id: string;
      position: { x: number; y: number; z: number };
      roomId: string | null;
      floorId: string;
      lastSeen: string;
      user?: { id: string; displayName: string } | null;
    }>
  >(`/devices${qs}`);
}

export async function searchDevices(query: string) {
  return fetchApi<
    Array<{
      id: string;
      position: { x: number; y: number; z: number };
      roomId: string | null;
      floorId: string;
      lastSeen: string;
      user?: { id: string; displayName: string; optedIn: boolean } | null;
    }>
  >(`/devices/search?q=${encodeURIComponent(query)}`);
}

export async function getDeviceCounts(): Promise<Record<string, number>> {
  return fetchApi<Record<string, number>>("/devices/counts");
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export async function registerUser(data: {
  email: string;
  displayName: string;
  macAddress?: string;
}) {
  return fetchApi<{
    user: { id: string; displayName: string; email: string; optedIn: boolean };
    token: string;
  }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getCurrentUser(token: string) {
  return fetchApi<{
    id: string;
    displayName: string;
    email: string;
    optedIn: boolean;
  }>("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ─── Routers (AP Management) ───────────────────────────────────────────────

export interface RouterInfo {
  id: string;
  macHash: string;
  mac: string | null;
  ip: string | null;
  vendor: string | null;
  deviceType: string | null;
  hostname: string | null;
  label: string | null;
  roomId: string | null;
  roomName: string | null;
  floorId: string | null;
  floorName: string | null;
  floorLevel: number | null;
  clientCount: number;
  isOnline: boolean;
}

export async function getRouters() {
  return fetchApi<RouterInfo[]>("/routers");
}

export async function updateRouter(
  macHash: string,
  data: { roomId?: string | null; floorId?: string | null; label?: string | null }
) {
  return fetchApi<unknown>(`/routers/${encodeURIComponent(macHash)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function syncRouters() {
  return fetchApi<{ synced: number; created: number; updated: number }>(
    "/routers/sync",
    { method: "POST" }
  );
}

export async function deleteRouter(macHash: string) {
  return fetchApi<unknown>(`/routers/${encodeURIComponent(macHash)}`, {
    method: "DELETE",
  });
}

// ─── Rooms (extended for admin) ────────────────────────────────────────────

export async function createRoom(data: {
  floorId: string;
  name: string;
  polygon: Array<{ x: number; y: number }>;
  capacity: number;
  type: string;
}) {
  return fetchApi<unknown>("/rooms", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRoom(
  id: string,
  data: Partial<{
    name: string;
    polygon: Array<{ x: number; y: number }>;
    capacity: number;
    type: string;
  }>
) {
  return fetchApi<unknown>(`/rooms/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRoom(id: string) {
  return fetchApi<unknown>(`/rooms/${id}`, {
    method: "DELETE",
  });
}
