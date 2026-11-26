/**
 * File Name: room-shapes.ts
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Room shape templates - 8 geometric primitives for room composition.
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

/**
 * Pre-defined room shape templates.
 * Each shape is a normalized polygon (unit size) that gets scaled/rotated/translated
 * when placed on the floor plan.
 */

export type ShapeId =
  | "rectangle"
  | "square"
  | "l-shape"
  | "u-shape"
  | "t-shape"
  | "triangle"
  | "octagon"
  | "custom";

export interface ShapeTemplate {
  id: ShapeId;
  label: string;
  icon: string; // emoji or text icon
  description: string;
  /** Normalized polygon vertices (unit square: 0..1 range) */
  polygon: Array<{ x: number; y: number }>;
  /** Default width in scene units */
  defaultWidth: number;
  /** Default height in scene units */
  defaultHeight: number;
}

export const SHAPE_TEMPLATES: ShapeTemplate[] = [
  {
    id: "rectangle",
    label: "Rectangle",
    icon: "▬",
    description: "Forme la plus courante",
    polygon: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    defaultWidth: 8,
    defaultHeight: 5,
  },
  {
    id: "square",
    label: "Carré",
    icon: "⬜",
    description: "Parfait carré",
    polygon: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    defaultWidth: 6,
    defaultHeight: 6,
  },
  {
    id: "l-shape",
    label: "L",
    icon: "⌐",
    description: "Forme en L",
    polygon: [
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 0.5 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    defaultWidth: 8,
    defaultHeight: 8,
  },
  {
    id: "u-shape",
    label: "U",
    icon: "⊔",
    description: "Forme en U",
    polygon: [
      { x: 0, y: 0 },
      { x: 0.3, y: 0 },
      { x: 0.3, y: 0.6 },
      { x: 0.7, y: 0.6 },
      { x: 0.7, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    defaultWidth: 10,
    defaultHeight: 7,
  },
  {
    id: "t-shape",
    label: "T",
    icon: "⊤",
    description: "Forme en T",
    polygon: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.4 },
      { x: 0.65, y: 0.4 },
      { x: 0.65, y: 1 },
      { x: 0.35, y: 1 },
      { x: 0.35, y: 0.4 },
      { x: 0, y: 0.4 },
    ],
    defaultWidth: 10,
    defaultHeight: 8,
  },
  {
    id: "triangle",
    label: "Triangle",
    icon: "△",
    description: "Forme triangulaire",
    polygon: [
      { x: 0.5, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    defaultWidth: 7,
    defaultHeight: 6,
  },
  {
    id: "octagon",
    label: "Octogone",
    icon: "⬡",
    description: "Forme arrondie (8 côtés)",
    polygon: (() => {
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 - Math.PI / 8;
        pts.push({
          x: 0.5 + 0.5 * Math.cos(angle),
          y: 0.5 + 0.5 * Math.sin(angle),
        });
      }
      return pts;
    })(),
    defaultWidth: 7,
    defaultHeight: 7,
  },
  {
    id: "custom",
    label: "Libre",
    icon: "✏️",
    description: "Dessin libre point par point",
    polygon: [],
    defaultWidth: 0,
    defaultHeight: 0,
  },
];

/**
 * Transform a normalized shape template into scene coordinates.
 */
export function transformShape(
  template: ShapeTemplate,
  options: {
    /** Center X in scene coordinates */
    cx: number;
    /** Center Y (Z in 3D) in scene coordinates */
    cy: number;
    /** Width in scene units */
    width: number;
    /** Height in scene units */
    height: number;
    /** Rotation in radians */
    rotation: number;
  }
): Array<{ x: number; y: number }> {
  const { cx, cy, width, height, rotation } = options;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  return template.polygon.map((p) => {
    // Scale from 0..1 to -half..+half
    const sx = (p.x - 0.5) * width;
    const sy = (p.y - 0.5) * height;

    // Rotate
    const rx = sx * cos - sy * sin;
    const ry = sx * sin + sy * cos;

    // Translate to center
    return {
      x: Math.round((cx + rx) * 10) / 10,
      y: Math.round((cy + ry) * 10) / 10,
    };
  });
}

/**
 * Compute the bounding box of a polygon.
 */
export function polygonBounds(polygon: Array<{ x: number; y: number }>) {
  if (polygon.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, cx: 0, cy: 0, w: 0, h: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of polygon) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    minX, minY, maxX, maxY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    w: maxX - minX,
    h: maxY - minY,
  };
}
