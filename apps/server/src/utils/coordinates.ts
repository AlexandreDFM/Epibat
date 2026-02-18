/**
 * File Name: coordinates.ts
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Coordinate transformation utilities (Mist to Three.js).
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

import type {
  MistCoordinate,
  SceneCoordinate,
  CalibrationConfig,
  Point2D,
} from "@epibat/shared";

/**
 * Map Mist coordinates (meters) to Three.js scene coordinates
 * using a calibration config (scale + offset).
 */
export function mistToScene(
  mist: MistCoordinate,
  calibration: CalibrationConfig
): SceneCoordinate {
  return {
    x: mist.x * calibration.scale.x + calibration.offset.x,
    y: 0, // Y is up in Three.js — floor level
    z: mist.y * calibration.scale.z + calibration.offset.z,
  };
}

/**
 * Default calibration: 1 Mist meter = 1 Three.js unit, no offset.
 */
export const DEFAULT_CALIBRATION: CalibrationConfig = {
  points: [],
  scale: { x: 1, z: 1 },
  offset: { x: 0, z: 0 },
};

/**
 * Point-in-polygon test (ray casting algorithm).
 * Determines if a 2D point is inside a polygon.
 */
export function isPointInPolygon(
  point: Point2D,
  polygon: Point2D[]
): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Find which room a scene coordinate belongs to.
 * Returns the roomId or null if outside all rooms.
 */
export function findRoomForPosition(
  position: SceneCoordinate,
  rooms: Array<{ id: string; polygon: Point2D[] }>
): string | null {
  const point: Point2D = { x: position.x, y: position.z };

  for (const room of rooms) {
    if (isPointInPolygon(point, room.polygon)) {
      return room.id;
    }
  }

  return null;
}
