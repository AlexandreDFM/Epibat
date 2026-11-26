/**
 * File Name: RoomCard.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: UI component - room information card with occupancy data.
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

import { Users, DoorOpen } from "lucide-react";
import { OccupancyBadge } from "./OccupancyBadge";
import type { RoomOccupancy, OccupancyStatus } from "@epibat/shared";

interface RoomCardProps {
  room: {
    id: string;
    name: string;
    type: string;
    capacity: number;
  };
  occupancy: RoomOccupancy | null;
  isSelected: boolean;
  onClick: () => void;
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  classroom: "Salle de classe",
  lab: "Laboratoire",
  meeting: "Salle de réunion",
  "open-space": "Open Space",
  "open_space": "Open Space",
  hallway: "Couloir",
  restroom: "Sanitaires",
  other: "Autre",
};

export function RoomCard({
  room,
  occupancy,
  isSelected,
  onClick,
}: RoomCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-lg p-3 transition-all border
        ${
          isSelected
            ? "bg-[var(--primary)]/10 border-[var(--primary)]/50"
            : "bg-[var(--card)] border-[var(--border)] hover:border-[var(--muted-foreground)]/30"
        }
      `}
    >
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          {room.name}
        </h3>
        <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
          <Users size={12} />
          {occupancy?.currentCount ?? 0}
        </div>
      </div>

      <div className="flex items-center gap-1 mb-2 text-xs text-[var(--muted-foreground)]">
        <DoorOpen size={12} />
        {ROOM_TYPE_LABELS[room.type] ?? room.type}
      </div>

      {occupancy && (
        <OccupancyBadge
          status={occupancy.status as OccupancyStatus}
          count={occupancy.currentCount}
          capacity={occupancy.capacity}
        />
      )}
    </button>
  );
}
