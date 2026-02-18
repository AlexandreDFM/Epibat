/**
 * File Name: Sidebar.tsx
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: UI component - dashboard sidebar with room list and controls.
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

import { RoomCard } from "./RoomCard";
import { SearchBar } from "./SearchBar";
import { FloorSelector } from "./FloorSelector";
import { FloorPlanUpload } from "./FloorPlanUpload";
import type { Device, RoomOccupancy } from "@epibat/shared";
import { Building2, Wifi, WifiOff, Users, Settings } from "lucide-react";
import Link from "next/link";

interface SidebarProps {
    floors: Array<{ id: string; level: number; name: string }>;
    rooms: Array<{
        id: string;
        name: string;
        type: string;
        capacity: number;
    }>;
    occupancy: RoomOccupancy[];
    selectedFloorId: string | null;
    selectedRoomId: string | null;
    isConnected: boolean;
    deviceCount: number;
    deviceCounts?: Record<string, number>;
    onFloorSelect: (floorId: string) => void;
    onRoomSelect: (roomId: string) => void;
    onDeviceSelect: (device: Device) => void;
}

export function Sidebar({
    floors,
    rooms,
    occupancy,
    selectedFloorId,
    selectedRoomId,
    isConnected,
    deviceCount,
    deviceCounts,
    onFloorSelect,
    onRoomSelect,
    onDeviceSelect,
}: SidebarProps) {
    return (
        <aside className="w-80 h-full bg-[var(--background)] border-r border-[var(--border)] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                        <Building2 size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-base font-bold text-[var(--foreground)]">
                            EpiBat
                        </h1>
                        <p className="text-xs text-[var(--muted-foreground)]">
                            Live Tracking
                        </p>
                    </div>
                    <Link
                        href="/admin"
                        className="p-2 rounded-lg hover:bg-[var(--accent)] transition-colors"
                        title="Administration"
                    >
                        <Settings size={16} className="text-[var(--muted-foreground)]" />
                    </Link>
                </div>

                {/* Status bar */}
                <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                    <div className="flex items-center gap-1">
                        {isConnected ? (
                            <Wifi size={12} className="text-green-500" />
                        ) : (
                            <WifiOff size={12} className="text-red-500" />
                        )}
                        {isConnected ? "Connecté" : "Déconnecté"}
                    </div>
                    <div className="flex items-center gap-1">
                        <Users size={12} />
                        {deviceCount} appareils (cet étage)
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-[var(--border)]">
                <SearchBar onResultSelect={onDeviceSelect} />
            </div>

            {/* Floor selector */}
            <div className="p-4 border-b border-[var(--border)]">
                <FloorSelector
                    floors={floors}
                    selectedFloorId={selectedFloorId}
                    deviceCounts={deviceCounts}
                    onSelect={onFloorSelect}
                />
                <div className="mt-2 pt-2 border-t border-[var(--border)]">
                    <FloorPlanUpload floors={floors} />
                </div>
            </div>

            {/* Room list */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
                    Salles ({rooms.length})
                </div>
                <div className="flex flex-col gap-2">
                    {rooms.map((room) => {
                        const roomOcc = occupancy.find(
                            (o) => o.roomId === room.id,
                        );
                        return (
                            <RoomCard
                                key={room.id}
                                room={room}
                                occupancy={roomOcc ?? null}
                                isSelected={room.id === selectedRoomId}
                                onClick={() => onRoomSelect(room.id)}
                            />
                        );
                    })}
                    {rooms.length === 0 && (
                        <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
                            Sélectionnez un étage pour voir les salles
                        </p>
                    )}
                </div>
            </div>
        </aside>
    );
}
