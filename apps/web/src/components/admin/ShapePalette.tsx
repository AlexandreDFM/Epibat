/**
 * File Name: ShapePalette.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Shape palette component - shape template selector for room composition.
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

import { type ShapeId, type ShapeTemplate, SHAPE_TEMPLATES } from "@/lib/room-shapes";

interface ShapePaletteProps {
  selectedShapeId: ShapeId | null;
  onSelect: (template: ShapeTemplate) => void;
}

/**
 * Grid of clickable shape cards for composing rooms.
 * Selecting "custom" falls back to free-draw mode.
 */
export function ShapePalette({ selectedShapeId, onSelect }: ShapePaletteProps) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2 block">
        Forme de la salle
      </label>
      <div className="grid grid-cols-4 gap-1.5">
        {SHAPE_TEMPLATES.map((t) => {
          const active = selectedShapeId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              title={t.description}
              className={`
                flex flex-col items-center justify-center gap-0.5
                rounded-md border p-1.5 transition-all text-center
                ${
                  active
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]/40"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50 hover:text-[var(--foreground)]"
                }
              `}
            >
              {/* Shape thumbnail */}
              <ShapeThumbnail template={t} active={active} />
              <span className="text-[9px] font-medium leading-tight truncate w-full">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Miniature SVG preview of the shape ─────────────────────────────────── */

function ShapeThumbnail({
  template,
  active,
}: {
  template: ShapeTemplate;
  active: boolean;
}) {
  const size = 32;
  const pad = 3;

  if (template.id === "custom") {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
      >
        {/* pencil icon */}
        <text
          x={size / 2}
          y={size / 2 + 4}
          textAnchor="middle"
          fontSize="16"
        >
          ✏️
        </text>
      </svg>
    );
  }

  if (template.polygon.length < 2) return null;

  // Scale normalized 0..1 polygon into the SVG viewBox
  const points = template.polygon
    .map(
      (p) =>
        `${pad + p.x * (size - 2 * pad)},${pad + p.y * (size - 2 * pad)}`
    )
    .join(" ");

  const strokeColor = active
    ? "var(--primary, #6366f1)"
    : "var(--muted-foreground, #888)";
  const fillColor = active
    ? "rgba(99,102,241,0.15)"
    : "rgba(136,136,136,0.08)";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block"
    >
      <polygon
        points={points}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}
