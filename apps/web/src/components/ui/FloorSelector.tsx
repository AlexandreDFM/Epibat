/**
 * File Name: FloorSelector.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: UI component - floor/building selection dropdown.
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

import { Layers } from "lucide-react";

interface FloorSelectorProps {
  floors: Array<{ id: string; level: number; name: string }>;
  selectedFloorId: string | null;
  deviceCounts?: Record<string, number>;
  onSelect: (floorId: string) => void;
}

export function FloorSelector({
  floors,
  selectedFloorId,
  deviceCounts,
  onSelect,
}: FloorSelectorProps) {
  const totalDevices = deviceCounts
    ? Object.values(deviceCounts).reduce((a, b) => a + b, 0)
    : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        <div className="flex items-center gap-2">
          <Layers size={14} />
          Étages
        </div>
        {totalDevices !== null && (
          <span className="text-[10px] font-normal normal-case tracking-normal opacity-70">
            {totalDevices} total
          </span>
        )}
      </div>
      {floors.map((floor) => {
        const isActive = floor.id === selectedFloorId;
        const count = deviceCounts?.[floor.id];
        return (
          <button
            key={floor.id}
            onClick={() => onSelect(floor.id)}
            className={`
              flex items-center justify-between text-left px-3 py-2 rounded-lg text-sm transition-all
              ${
                isActive
                  ? "bg-[var(--primary)] text-white font-medium"
                  : "text-[var(--foreground)] hover:bg-[var(--muted)]"
              }
            `}
          >
            <span>
              <span className="font-mono text-xs mr-2 opacity-60">
                N{floor.level}
              </span>
              {floor.name}
            </span>
            {count !== undefined && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
