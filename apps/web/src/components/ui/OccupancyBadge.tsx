/**
 * File Name: OccupancyBadge.tsx
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: UI component - color-coded occupancy percentage badge.
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

import { OCCUPANCY_COLORS } from "@epibat/shared";
import type { OccupancyStatus } from "@epibat/shared";

interface OccupancyBadgeProps {
  status: OccupancyStatus;
  count: number;
  capacity: number;
}

const STATUS_LABELS: Record<OccupancyStatus, string> = {
  empty: "Vide",
  low: "Peu fréquenté",
  medium: "Modéré",
  high: "Fréquenté",
  full: "Complet",
};

export function OccupancyBadge({
  status,
  count,
  capacity,
}: OccupancyBadgeProps) {
  const color = OCCUPANCY_COLORS[status] ?? OCCUPANCY_COLORS.empty;

  return (
    <div className="flex items-center gap-2">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-[var(--muted-foreground)]">
        {STATUS_LABELS[status]} — {count}/{capacity}
      </span>
    </div>
  );
}
