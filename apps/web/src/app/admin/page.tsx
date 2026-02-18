/**
 * File Name: page.tsx
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Admin panel page - room management, router assignment, and shape editor.
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
import Link from "next/link";
import {
  getFloors,
  getRooms,
  getRouters,
  updateRouter,
  syncRouters,
  createRoom,
  updateRoom,
  deleteRoom,
  type RouterInfo,
} from "@/lib/api";
import {
  ArrowLeft,
  Router,
  MapPin,
  RefreshCw,
  Save,
  Plus,
  Trash2,
  Pencil,
  Wifi,
  WifiOff,
  Users,
  ChevronDown,
  ChevronUp,
  Check,
  RotateCcw,
} from "lucide-react";
import { ShapePalette } from "@/components/admin/ShapePalette";
import {
  type ShapeId,
  type ShapeTemplate,
  SHAPE_TEMPLATES,
  transformShape,
} from "@/lib/room-shapes";
import type { ShapePlacement } from "@/components/admin/RoomEditor3D";

const RoomEditor3D = dynamic(
  () => import("@/components/admin/RoomEditor3D").then((m) => m.RoomEditor3D),
  { ssr: false }
);

interface FloorData {
  id: string;
  level: number;
  name: string;
  textureUrl?: string | null;
}

interface RoomData {
  id: string;
  floorId: string;
  name: string;
  polygon: Array<{ x: number; y: number }>;
  capacity: number;
  type: string;
}

export default function AdminPage() {
  // ── State ────────────────────────────────────────────────────────────
  const [floors, setFloors] = useState<FloorData[]>([]);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [routers, setRouters] = useState<RouterInfo[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState<"routers" | "rooms">("routers");
  const [expandedRouter, setExpandedRouter] = useState<string | null>(null);

  // Room editor state
  const [editingRoom, setEditingRoom] = useState<RoomData | null>(null);
  const [newRoom, setNewRoom] = useState<{
    name: string;
    capacity: number;
    type: string;
  } | null>(null);
  const [newRoomPolygon, setNewRoomPolygon] = useState<Array<{ x: number; y: number }>>([]);

  // Shape placement state
  const [selectedShapeId, setSelectedShapeId] = useState<ShapeId | null>(null);
  const [shapePlacement, setShapePlacement] = useState<ShapePlacement | null>(null);

  // ── Load data ────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [floorData, routerData] = await Promise.all([
          getFloors(),
          getRouters(),
        ]);
        setFloors(floorData.map((f) => ({ id: f.id, level: f.level, name: f.name, textureUrl: f.textureUrl })));
        setRouters(routerData);
        if (floorData.length > 0 && !selectedFloorId) {
          setSelectedFloorId(floorData[0].id);
        }
      } catch (err) {
        console.error("Failed to load admin data:", err);
      }
    }
    load();
  }, []);

  // Load rooms when floor changes
  useEffect(() => {
    if (!selectedFloorId) return;
    getRooms(selectedFloorId).then(setRooms).catch(console.error);
  }, [selectedFloorId]);

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncRouters();
      const data = await getRouters();
      setRouters(data);
    } catch (err) {
      console.error("Sync failed:", err);
    }
    setSyncing(false);
  }, []);

  const handleRouterAssign = useCallback(
    async (macHash: string, roomId: string | null, floorId: string | null) => {
      try {
        await updateRouter(macHash, { roomId, floorId });
        const data = await getRouters();
        setRouters(data);
      } catch (err) {
        console.error("Failed to assign router:", err);
      }
    },
    []
  );

  const handleRouterLabel = useCallback(
    async (macHash: string, label: string) => {
      try {
        await updateRouter(macHash, { label: label || null });
        const data = await getRouters();
        setRouters(data);
      } catch (err) {
        console.error("Failed to update label:", err);
      }
    },
    []
  );

  const handleShapeSelect = useCallback(
    (template: ShapeTemplate) => {
      setSelectedShapeId(template.id);
      if (template.id === "custom") {
        // Fall back to free-draw mode
        setShapePlacement(null);
        setNewRoomPolygon([]);
      } else {
        setNewRoomPolygon([]);
        setShapePlacement({
          template,
          cx: 15,
          cy: 12,
          width: template.defaultWidth,
          height: template.defaultHeight,
          rotation: 0,
        });
      }
    },
    []
  );

  const handleShapeConfirm = useCallback(
    (polygon: Array<{ x: number; y: number }>) => {
      if (!selectedFloorId || !newRoom) return;
      handleCreateRoomFromPolygon(polygon);
    },
    [selectedFloorId, newRoom]
  );

  const handleCreateRoomFromPolygon = useCallback(
    async (polygon: Array<{ x: number; y: number }>) => {
      if (!selectedFloorId || !newRoom) return;
      try {
        await createRoom({
          floorId: selectedFloorId,
          name: newRoom.name,
          polygon,
          capacity: newRoom.capacity,
          type: newRoom.type,
        });
        const data = await getRooms(selectedFloorId);
        setRooms(data);
        setNewRoom(null);
        setNewRoomPolygon([]);
        setShapePlacement(null);
        setSelectedShapeId(null);
      } catch (err) {
        console.error("Failed to create room:", err);
      }
    },
    [selectedFloorId, newRoom]
  );

  const handleCreateRoom = handleCreateRoomFromPolygon;

  const handleUpdateRoom = useCallback(
    async (id: string, data: Partial<RoomData>) => {
      try {
        await updateRoom(id, data);
        if (selectedFloorId) {
          const rooms = await getRooms(selectedFloorId);
          setRooms(rooms);
        }
        setEditingRoom(null);
      } catch (err) {
        console.error("Failed to update room:", err);
      }
    },
    [selectedFloorId]
  );

  const handleDeleteRoom = useCallback(
    async (id: string) => {
      if (!confirm("Supprimer cette salle ?")) return;
      try {
        await deleteRoom(id);
        if (selectedFloorId) {
          const rooms = await getRooms(selectedFloorId);
          setRooms(rooms);
        }
      } catch (err) {
        console.error("Failed to delete room:", err);
      }
    },
    [selectedFloorId]
  );

  const floorRouters = routers.filter(
    (r) => r.floorId === selectedFloorId || (!r.floorId && !selectedFloorId)
  );
  const unassignedRouters = routers.filter((r) => !r.floorId);
  const currentFloor = floors.find((f) => f.id === selectedFloorId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--background)]">
      {/* Left panel */}
      <aside className="w-[420px] h-full border-r border-[var(--border)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3 mb-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <ArrowLeft size={14} />
              Dashboard
            </Link>
          </div>
          <h1 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
            <Router size={20} />
            Administration réseau
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Gérer les routeurs, bornes et salles
          </p>
        </div>

        {/* Floor selector */}
        <div className="p-3 border-b border-[var(--border)]">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2 block">
            Étage
          </label>
          <div className="flex flex-wrap gap-1">
            {floors.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFloorId(f.id)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  f.id === selectedFloorId
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          <button
            onClick={() => setTab("routers")}
            className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors ${
              tab === "routers"
                ? "text-[var(--primary)] border-b-2 border-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <Router size={14} className="inline mr-1" />
            Routeurs ({routers.length})
          </button>
          <button
            onClick={() => setTab("rooms")}
            className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors ${
              tab === "rooms"
                ? "text-[var(--primary)] border-b-2 border-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <MapPin size={14} className="inline mr-1" />
            Salles ({rooms.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === "routers" ? (
            <RouterList
              routers={routers}
              floorRouters={floorRouters}
              unassignedRouters={unassignedRouters}
              floors={floors}
              rooms={rooms}
              expandedRouter={expandedRouter}
              onExpand={setExpandedRouter}
              onAssign={handleRouterAssign}
              onLabel={handleRouterLabel}
              onSync={handleSync}
              syncing={syncing}
              selectedFloorId={selectedFloorId}
            />
          ) : (
            <RoomList
              rooms={rooms}
              editingRoom={editingRoom}
              onEdit={setEditingRoom}
              onUpdate={handleUpdateRoom}
              onDelete={handleDeleteRoom}
              onNewRoom={() => {
                setNewRoom({ name: "", capacity: 30, type: "classroom" });
                setSelectedShapeId(null);
                setShapePlacement(null);
                setNewRoomPolygon([]);
              }}
              newRoom={newRoom}
              onNewRoomChange={(v) => {
                if (!v) {
                  setNewRoom(null);
                  setShapePlacement(null);
                  setSelectedShapeId(null);
                  setNewRoomPolygon([]);
                } else {
                  setNewRoom(v);
                }
              }}
              onCreateRoom={handleCreateRoom}
              newRoomPolygon={newRoomPolygon}
              selectedShapeId={selectedShapeId}
              onShapeSelect={handleShapeSelect}
            />
          )}
        </div>
      </aside>

      {/* 3D viewer / Room editor */}
      <main className="flex-1 relative">
        <RoomEditor3D
          rooms={rooms}
          floorPlanUrl={currentFloor?.textureUrl ?? null}
          editingRoom={editingRoom}
          shapePlacement={shapePlacement}
          onShapePlacementChange={setShapePlacement}
          onShapeConfirm={handleShapeConfirm}
          isDrawing={!!newRoom && selectedShapeId === "custom"}
          drawnPolygon={newRoomPolygon}
          onPolygonChange={setNewRoomPolygon}
          onPolygonComplete={(polygon) => {
            if (newRoom) handleCreateRoom(polygon);
          }}
          onRoomPolygonUpdate={(roomId, polygon) => {
            handleUpdateRoom(roomId, { polygon });
          }}
          routers={floorRouters}
        />

        {/* Floor name overlay */}
        <div className="absolute top-4 right-4 bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm">
          <span className="text-[var(--muted-foreground)]">Étage : </span>
          <span className="font-semibold text-[var(--foreground)]">
            {currentFloor?.name ?? "Aucun"}
          </span>
        </div>

        {/* Drawing instructions */}
        {newRoom && !shapePlacement && selectedShapeId === "custom" && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[var(--primary)] text-white px-6 py-3 rounded-lg text-sm shadow-lg">
            Cliquez sur le plan pour placer les sommets de la salle.
            {newRoomPolygon.length >= 3 && " Double-cliquez pour terminer."}
          </div>
        )}

        {/* Shape placement controls */}
        {newRoom && shapePlacement && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] px-5 py-3 rounded-xl shadow-lg">
            <span className="text-sm text-[var(--muted-foreground)]">
              Déplacez, redimensionnez et tournez la forme
            </span>
            <button
              onClick={() => {
                if (shapePlacement) {
                  setShapePlacement({
                    ...shapePlacement,
                    rotation: 0,
                    width: shapePlacement.template.defaultWidth,
                    height: shapePlacement.template.defaultHeight,
                  });
                }
              }}
              className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg flex items-center gap-1 hover:bg-[var(--border)] transition-colors"
            >
              <RotateCcw size={12} /> Réinitialiser
            </button>
            <button
              onClick={() => {
                if (shapePlacement) {
                  const polygon = transformShape(shapePlacement.template, {
                    cx: shapePlacement.cx,
                    cy: shapePlacement.cy,
                    width: shapePlacement.width,
                    height: shapePlacement.height,
                    rotation: shapePlacement.rotation,
                  });
                  handleCreateRoom(polygon);
                }
              }}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-medium flex items-center gap-1.5 transition-colors"
            >
              <Check size={14} /> Valider la salle
            </button>
          </div>
        )}

        {/* Shape not yet selected prompt */}
        {newRoom && !shapePlacement && selectedShapeId !== "custom" && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[var(--card)] border border-[var(--border)] px-6 py-3 rounded-xl text-sm text-[var(--muted-foreground)] shadow-lg">
            ← Sélectionnez une forme dans le panneau de gauche
          </div>
        )}
      </main>
    </div>
  );
}

// ── Router List Component ──────────────────────────────────────────────────

function RouterList({
  routers,
  floorRouters,
  unassignedRouters,
  floors,
  rooms,
  expandedRouter,
  onExpand,
  onAssign,
  onLabel,
  onSync,
  syncing,
  selectedFloorId,
}: {
  routers: RouterInfo[];
  floorRouters: RouterInfo[];
  unassignedRouters: RouterInfo[];
  floors: FloorData[];
  rooms: RoomData[];
  expandedRouter: string | null;
  onExpand: (macHash: string | null) => void;
  onAssign: (macHash: string, roomId: string | null, floorId: string | null) => void;
  onLabel: (macHash: string, label: string) => void;
  onSync: () => void;
  syncing: boolean;
  selectedFloorId: string | null;
}) {
  return (
    <div className="p-3">
      {/* Sync button */}
      <button
        onClick={onSync}
        disabled={syncing}
        className="w-full mb-3 px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-medium flex items-center justify-center gap-2 hover:bg-[var(--border)] transition-colors disabled:opacity-50"
      >
        <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
        {syncing ? "Synchronisation..." : "Synchroniser les routeurs"}
      </button>

      {/* Floor routers */}
      {floorRouters.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
            Cet étage ({floorRouters.length})
          </h3>
          {floorRouters.map((r) => (
            <RouterCard
              key={r.macHash}
              router={r}
              floors={floors}
              rooms={rooms}
              isExpanded={expandedRouter === r.macHash}
              onExpand={() => onExpand(expandedRouter === r.macHash ? null : r.macHash)}
              onAssign={onAssign}
              onLabel={onLabel}
            />
          ))}
        </div>
      )}

      {/* Unassigned routers */}
      {unassignedRouters.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
            Non assignés ({unassignedRouters.length})
          </h3>
          {unassignedRouters.map((r) => (
            <RouterCard
              key={r.macHash}
              router={r}
              floors={floors}
              rooms={rooms}
              isExpanded={expandedRouter === r.macHash}
              onExpand={() => onExpand(expandedRouter === r.macHash ? null : r.macHash)}
              onAssign={onAssign}
              onLabel={onLabel}
            />
          ))}
        </div>
      )}

      {/* All other routers (on other floors) */}
      {routers.filter((r) => r.floorId && r.floorId !== selectedFloorId).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
            Autres étages
          </h3>
          {routers
            .filter((r) => r.floorId && r.floorId !== selectedFloorId)
            .map((r) => (
              <RouterCard
                key={r.macHash}
                router={r}
                floors={floors}
                rooms={rooms}
                isExpanded={expandedRouter === r.macHash}
                onExpand={() => onExpand(expandedRouter === r.macHash ? null : r.macHash)}
                onAssign={onAssign}
                onLabel={onLabel}
              />
            ))}
        </div>
      )}

      {routers.length === 0 && (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
          Aucun routeur détecté. Lancez un scan réseau d&apos;abord.
        </p>
      )}
    </div>
  );
}

// ── Router Card ────────────────────────────────────────────────────────────

function RouterCard({
  router,
  floors,
  rooms,
  isExpanded,
  onExpand,
  onAssign,
  onLabel,
}: {
  router: RouterInfo;
  floors: FloorData[];
  rooms: RoomData[];
  isExpanded: boolean;
  onExpand: () => void;
  onAssign: (macHash: string, roomId: string | null, floorId: string | null) => void;
  onLabel: (macHash: string, label: string) => void;
}) {
  const [labelInput, setLabelInput] = useState(router.label ?? "");
  const [selectedFloor, setSelectedFloor] = useState(router.floorId ?? "");
  const [selectedRoom, setSelectedRoom] = useState(router.roomId ?? "");

  // Get rooms for the selected floor
  const [floorRooms, setFloorRooms] = useState<RoomData[]>([]);
  useEffect(() => {
    if (selectedFloor) {
      getRooms(selectedFloor).then(setFloorRooms).catch(() => setFloorRooms([]));
    } else {
      setFloorRooms([]);
    }
  }, [selectedFloor]);

  const displayName =
    router.label || router.hostname || router.deviceType || router.ip || router.macHash.slice(0, 8);

  return (
    <div className="mb-2 bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={onExpand}
        className="w-full px-3 py-2.5 flex items-center gap-2 text-left hover:bg-[var(--border)]/30 transition-colors"
      >
        <div className="flex-shrink-0">
          {router.isOnline ? (
            <Wifi size={14} className="text-green-500" />
          ) : (
            <WifiOff size={14} className="text-red-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--foreground)] truncate">
            {displayName}
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-2">
            {router.ip && <span>{router.ip}</span>}
            {router.vendor && <span>· {router.vendor}</span>}
            {router.clientCount > 0 && (
              <span className="flex items-center gap-0.5">
                · <Users size={10} /> {router.clientCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {router.roomName && (
            <span className="text-[10px] px-1.5 py-0.5 bg-[var(--primary)]/20 text-[var(--primary)] rounded">
              {router.roomName}
            </span>
          )}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Expanded: assignment panel */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[var(--border)] space-y-2">
          {/* MAC info */}
          <div className="text-[10px] text-[var(--muted-foreground)] font-mono">
            MAC: {router.mac || "N/A"} · Hash: {router.macHash.slice(0, 12)}...
          </div>

          {/* Label */}
          <div>
            <label className="text-[10px] text-[var(--muted-foreground)] block mb-1">
              Nom personnalisé
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="Ex: AP-Salle-301"
                className="flex-1 px-2 py-1 text-xs bg-[var(--background)] border border-[var(--border)] rounded"
              />
              <button
                onClick={() => onLabel(router.macHash, labelInput)}
                className="px-2 py-1 bg-[var(--primary)] text-white text-xs rounded"
              >
                <Save size={12} />
              </button>
            </div>
          </div>

          {/* Floor assignment */}
          <div>
            <label className="text-[10px] text-[var(--muted-foreground)] block mb-1">
              Étage
            </label>
            <select
              value={selectedFloor}
              onChange={(e) => {
                setSelectedFloor(e.target.value);
                setSelectedRoom("");
              }}
              className="w-full px-2 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded"
            >
              <option value="">— Non assigné —</option>
              {floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room assignment */}
          {selectedFloor && (
            <div>
              <label className="text-[10px] text-[var(--muted-foreground)] block mb-1">
                Salle
              </label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded"
              >
                <option value="">— Aucune salle —</option>
                {floorRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Save assignment */}
          <button
            onClick={() =>
              onAssign(
                router.macHash,
                selectedRoom || null,
                selectedFloor || null
              )
            }
            className="w-full px-3 py-1.5 bg-[var(--primary)] text-white text-xs rounded-lg font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <MapPin size={12} />
            Enregistrer l&apos;assignation
          </button>
        </div>
      )}
    </div>
  );
}

// ── Room List Component ────────────────────────────────────────────────────

function RoomList({
  rooms,
  editingRoom,
  onEdit,
  onUpdate,
  onDelete,
  onNewRoom,
  newRoom,
  onNewRoomChange,
  onCreateRoom,
  newRoomPolygon,
  selectedShapeId,
  onShapeSelect,
}: {
  rooms: RoomData[];
  editingRoom: RoomData | null;
  onEdit: (room: RoomData | null) => void;
  onUpdate: (id: string, data: Partial<RoomData>) => void;
  onDelete: (id: string) => void;
  onNewRoom: () => void;
  newRoom: { name: string; capacity: number; type: string } | null;
  onNewRoomChange: (data: { name: string; capacity: number; type: string } | null) => void;
  onCreateRoom: (polygon: Array<{ x: number; y: number }>) => void;
  newRoomPolygon: Array<{ x: number; y: number }>;
  selectedShapeId: ShapeId | null;
  onShapeSelect: (template: ShapeTemplate) => void;
}) {
  const roomTypes = [
    { value: "classroom", label: "Salle de cours" },
    { value: "lab", label: "Laboratoire" },
    { value: "meeting", label: "Salle de réunion" },
    { value: "open_space", label: "Open Space" },
    { value: "hallway", label: "Couloir" },
    { value: "restroom", label: "Sanitaires" },
    { value: "other", label: "Autre" },
  ];

  return (
    <div className="p-3">
      {/* New room form */}
      {newRoom ? (
        <div className="mb-4 p-3 bg-[var(--card)] border-2 border-[var(--primary)] rounded-lg">
          <h3 className="text-xs font-semibold text-[var(--primary)] mb-2">
            Nouvelle salle
          </h3>
          <div className="space-y-2">
            <input
              type="text"
              value={newRoom.name}
              onChange={(e) => onNewRoomChange({ ...newRoom, name: e.target.value })}
              placeholder="Nom de la salle"
              className="w-full px-2 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={newRoom.capacity}
                onChange={(e) =>
                  onNewRoomChange({ ...newRoom, capacity: parseInt(e.target.value) || 30 })
                }
                placeholder="Capacité"
                className="w-20 px-2 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded"
              />
              <select
                value={newRoom.type}
                onChange={(e) => onNewRoomChange({ ...newRoom, type: e.target.value })}
                className="flex-1 px-2 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded"
              >
                {roomTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)]">
              {selectedShapeId === "custom"
                ? `${newRoomPolygon.length} point(s) placé(s) sur le plan.${newRoomPolygon.length < 3 ? " Min 3 points requis." : ""}`
                : selectedShapeId
                  ? "Positionnez la forme sur le plan 3D puis validez."
                  : "Choisissez une forme ci-dessous."}
            </p>

            {/* Shape palette */}
            <ShapePalette
              selectedShapeId={selectedShapeId}
              onSelect={onShapeSelect}
            />

            <div className="flex gap-2">
              <button
                onClick={() => onNewRoomChange(null)}
                className="flex-1 px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={onNewRoom}
          className="w-full mb-3 px-3 py-2 bg-[var(--card)] border border-dashed border-[var(--border)] rounded-lg text-xs font-medium flex items-center justify-center gap-2 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
        >
          <Plus size={14} />
          Ajouter une salle
        </button>
      )}

      {/* Room list */}
      {rooms.map((room) => (
        <div
          key={room.id}
          className={`mb-2 bg-[var(--card)] border rounded-lg overflow-hidden ${
            editingRoom?.id === room.id
              ? "border-[var(--primary)]"
              : "border-[var(--border)]"
          }`}
        >
          <div className="px-3 py-2.5 flex items-center gap-2">
            <MapPin size={14} className="text-[var(--primary)] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--foreground)] truncate">
                {room.name}
              </div>
              <div className="text-[10px] text-[var(--muted-foreground)]">
                {roomTypes.find((t) => t.value === room.type.replace("-", "_"))?.label ?? room.type}{" "}
                · {room.capacity} places · {room.polygon.length} sommets
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onEdit(editingRoom?.id === room.id ? null : room)}
                className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                title="Modifier"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => onDelete(room.id)}
                className="p-1.5 text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                title="Supprimer"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Edit inline */}
          {editingRoom?.id === room.id && (
            <EditRoomForm
              room={room}
              roomTypes={roomTypes}
              onSave={(data) => onUpdate(room.id, data)}
              onCancel={() => onEdit(null)}
            />
          )}
        </div>
      ))}

      {rooms.length === 0 && (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
          Aucune salle sur cet étage
        </p>
      )}
    </div>
  );
}

// ── Edit Room Form ─────────────────────────────────────────────────────────

function EditRoomForm({
  room,
  roomTypes,
  onSave,
  onCancel,
}: {
  room: RoomData;
  roomTypes: Array<{ value: string; label: string }>;
  onSave: (data: Partial<RoomData>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(room.name);
  const [capacity, setCapacity] = useState(room.capacity);
  const [type, setType] = useState(room.type.replace("-", "_"));

  return (
    <div className="px-3 pb-3 pt-1 border-t border-[var(--border)] space-y-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-2 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded"
      />
      <div className="flex gap-2">
        <input
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(parseInt(e.target.value) || 30)}
          className="w-20 px-2 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="flex-1 px-2 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded"
        >
          {roomTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-[10px] text-[var(--muted-foreground)]">
        Polygone : {room.polygon.length} sommets. Cliquez sur la salle dans le plan 3D pour
        modifier ses sommets.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg"
        >
          Annuler
        </button>
        <button
          onClick={() => onSave({ name, capacity, type })}
          className="flex-1 px-3 py-1.5 bg-[var(--primary)] text-white text-xs rounded-lg font-medium flex items-center justify-center gap-1"
        >
          <Save size={12} />
          Sauvegarder
        </button>
      </div>
    </div>
  );
}
