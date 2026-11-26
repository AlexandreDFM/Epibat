/**
 * File Name: RoomEditor3D.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: 3D room editor component - place, drag, resize, and rotate room shapes.
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

import { Canvas, ThreeEvent } from "@react-three/fiber";
import {
  OrbitControls,
  GizmoHelper,
  GizmoViewport,
  Html,
} from "@react-three/drei";
import { Suspense, useCallback, useRef, useMemo, useState } from "react";
import * as THREE from "three";
import { FloorPlan } from "../three/FloorPlan";
import { RoomMesh } from "../three/RoomMesh";
import { RoomLabel } from "../three/RoomLabel";
import type { RouterInfo } from "@/lib/api";
import {
  type ShapeTemplate,
  transformShape,
} from "@/lib/room-shapes";

/* ────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

interface RoomData {
  id: string;
  name: string;
  polygon: Array<{ x: number; y: number }>;
  capacity: number;
  type: string;
}

/** State of the shape currently being placed / edited */
export interface ShapePlacement {
  template: ShapeTemplate;
  cx: number;
  cy: number;
  width: number;
  height: number;
  rotation: number;
}

interface RoomEditor3DProps {
  rooms: RoomData[];
  floorPlanUrl: string | null;
  editingRoom: RoomData | null;
  /* Shape-based flow */
  shapePlacement: ShapePlacement | null;
  onShapePlacementChange: (placement: ShapePlacement | null) => void;
  onShapeConfirm: (polygon: Array<{ x: number; y: number }>) => void;
  /* Legacy free-draw flow */
  isDrawing: boolean;
  drawnPolygon: Array<{ x: number; y: number }>;
  onPolygonChange: (polygon: Array<{ x: number; y: number }>) => void;
  onPolygonComplete: (polygon: Array<{ x: number; y: number }>) => void;
  onRoomPolygonUpdate?: (
    roomId: string,
    polygon: Array<{ x: number; y: number }>
  ) => void;
  routers: RouterInfo[];
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Main component                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

export function RoomEditor3D({
  rooms,
  floorPlanUrl,
  editingRoom,
  shapePlacement,
  onShapePlacementChange,
  onShapeConfirm,
  isDrawing,
  drawnPolygon,
  onPolygonChange,
  onPolygonComplete,
  onRoomPolygonUpdate,
  routers,
}: RoomEditor3DProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [15, 25, 25], fov: 50, near: 0.1, far: 500 }}
        shadows
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[20, 30, 10]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <pointLight position={[-10, 15, -10]} intensity={0.3} />

          {/* Floor plan */}
          <FloorPlan textureUrl={floorPlanUrl} />

          {/* Existing rooms */}
          {rooms.map((room) => (
            <RoomMesh
              key={room.id}
              room={room}
              occupancy={null}
              isSelected={editingRoom?.id === room.id}
              onClick={() => {}}
            />
          ))}

          {/* Room labels */}
          {rooms.map((room) => (
            <RoomLabel
              key={`label-${room.id}`}
              room={room}
              occupancy={null}
            />
          ))}

          {/* Router markers */}
          {routers.map((r) => (
            <RouterMarker3D key={r.macHash} router={r} />
          ))}

          {/* ── Shape placement mode ───────────────────────────────── */}
          {shapePlacement && (
            <>
              <ShapePlacementPlane
                placement={shapePlacement}
                onChange={onShapePlacementChange}
              />
              <ShapePreview3D placement={shapePlacement} />
              <ShapeHandles
                placement={shapePlacement}
                onChange={onShapePlacementChange}
              />
            </>
          )}

          {/* ── Legacy free-draw mode ──────────────────────────────── */}
          {isDrawing && !shapePlacement && (
            <DrawingPlane
              polygon={drawnPolygon}
              onAddPoint={onPolygonChange}
              onComplete={onPolygonComplete}
            />
          )}
          {drawnPolygon.length > 0 && !shapePlacement && (
            <PolygonPreview points={drawnPolygon} />
          )}

          {/* Controls */}
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.1}
            minDistance={5}
            maxDistance={100}
            maxPolarAngle={Math.PI / 2.2}
          />

          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport
              axisColors={["#f44", "#4f4", "#44f"]}
              labelColor="white"
            />
          </GizmoHelper>

          <gridHelper args={[50, 50, "#1e1e2e", "#1e1e2e"]} />
        </Suspense>
      </Canvas>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Shape Preview – transformed polygon in 3D                                */
/* ────────────────────────────────────────────────────────────────────────── */

function ShapePreview3D({ placement }: { placement: ShapePlacement }) {
  const polygon = useMemo(
    () =>
      transformShape(placement.template, {
        cx: placement.cx,
        cy: placement.cy,
        width: placement.width,
        height: placement.height,
        rotation: placement.rotation,
      }),
    [placement]
  );

  /* outline */
  const lineObject = useMemo(() => {
    const verts: number[] = [];
    for (const p of polygon) verts.push(p.x, 0.12, p.y);
    if (polygon.length >= 3) verts.push(polygon[0].x, 0.12, polygon[0].y);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.LineBasicMaterial({
      color: "#6366f1",
      linewidth: 2,
    });
    return new THREE.Line(geo, mat);
  }, [polygon]);

  /* fill shape */
  const fillShape = useMemo(() => {
    if (polygon.length < 3) return null;
    const s = new THREE.Shape();
    s.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i++) s.lineTo(polygon[i].x, polygon[i].y);
    s.closePath();
    return s;
  }, [polygon]);

  const sizeLabel = `${placement.width.toFixed(1)} × ${placement.height.toFixed(1)} m`;

  return (
    <group>
      {polygon.length >= 2 && <primitive object={lineObject} />}

      {/* vertex markers */}
      {polygon.map((p, i) => (
        <mesh key={i} position={[p.x, 0.18, p.y]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color={i === 0 ? "#22c55e" : "#6366f1"} />
        </mesh>
      ))}

      {/* translucent fill */}
      {fillShape && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <shapeGeometry args={[fillShape]} />
          <meshBasicMaterial
            color="#6366f1"
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* ghost walls */}
      {fillShape && (
        <mesh castShadow>
          <extrudeGeometry
            args={[fillShape, { depth: 2.5, bevelEnabled: false }]}
          />
          <meshStandardMaterial
            color="#6366f1"
            transparent
            opacity={0.08}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* dimensions label */}
      <Html
        position={[placement.cx, 3.2, placement.cy]}
        center
        style={{ pointerEvents: "none" }}
      >
        <div className="bg-indigo-600 text-white text-[10px] px-2 py-1 rounded-md font-mono whitespace-nowrap shadow-lg">
          {sizeLabel}
          {placement.rotation !== 0 && (
            <span className="ml-1 opacity-70">
              ↻{Math.round((placement.rotation * 180) / Math.PI)}°
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Shape Placement Plane – drag to move the shape                           */
/* ────────────────────────────────────────────────────────────────────────── */

function ShapePlacementPlane({
  placement,
  onChange,
}: {
  placement: ShapePlacement;
  onChange: (p: ShapePlacement | null) => void;
}) {
  const isDragging = useRef(false);
  const dragStart = useRef<{
    x: number;
    y: number;
    cx: number;
    cy: number;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const p = e.point;
      const dx = p.x - placement.cx;
      const dz = p.z - placement.cy;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < Math.max(placement.width, placement.height) * 0.6) {
        isDragging.current = true;
        dragStart.current = {
          x: p.x,
          y: p.z,
          cx: placement.cx,
          cy: placement.cy,
        };
      }
    },
    [placement]
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDragging.current || !dragStart.current) return;
      e.stopPropagation();
      const p = e.point;
      const dx = p.x - dragStart.current.x;
      const dy = p.z - dragStart.current.y;
      onChange({
        ...placement,
        cx: Math.round((dragStart.current.cx + dx) * 10) / 10,
        cy: Math.round((dragStart.current.cy + dy) * 10) / 10,
      });
    },
    [placement, onChange]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    dragStart.current = null;
  }, []);

  return (
    <mesh
      position={[20, 0.005, 15]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <planeGeometry args={[60, 40]} />
      <meshBasicMaterial
        transparent
        opacity={0.02}
        color="#6366f1"
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Shape Handles – corners (resize) + rotation arc                          */
/* ────────────────────────────────────────────────────────────────────────── */

function ShapeHandles({
  placement,
  onChange,
}: {
  placement: ShapePlacement;
  onChange: (p: ShapePlacement | null) => void;
}) {
  const { cx, cy, width, height, rotation } = placement;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const hw = width / 2;
  const hh = height / 2;

  const corners = useMemo(() => {
    const raw = [
      { lx: -hw, ly: -hh },
      { lx: hw, ly: -hh },
      { lx: hw, ly: hh },
      { lx: -hw, ly: hh },
    ];
    return raw.map((p) => ({
      x: cx + p.lx * cos - p.ly * sin,
      z: cy + p.lx * sin + p.ly * cos,
      lx: p.lx,
      ly: p.ly,
    }));
  }, [cx, cy, hw, hh, cos, sin]);

  /* rotation handle – above the top edge */
  const rotHandle = useMemo(() => {
    const offsetY = -(hh + 1.2);
    return {
      x: cx + 0 * cos - offsetY * sin,
      z: cy + 0 * sin + offsetY * cos,
    };
  }, [cx, cy, hh, cos, sin]);

  return (
    <group>
      {corners.map((c, i) => (
        <ResizeHandle
          key={i}
          position={[c.x, 0.3, c.z]}
          placement={placement}
          cornerIndex={i}
          onChange={onChange}
        />
      ))}

      <RotateHandle
        position={[rotHandle.x, 0.3, rotHandle.z]}
        placement={placement}
        onChange={onChange}
      />

      <RotateHandleLine
        cx={cx}
        cy={cy}
        hx={rotHandle.x}
        hz={rotHandle.z}
      />
    </group>
  );
}

/* ── Resize Handle ─────────────────────────────────────────────────────── */

function ResizeHandle({
  position,
  placement,
  cornerIndex,
  onChange,
}: {
  position: [number, number, number];
  placement: ShapePlacement;
  cornerIndex: number;
  onChange: (p: ShapePlacement | null) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isDragging = useRef(false);
  const startRef = useRef<{
    px: number;
    pz: number;
    w: number;
    h: number;
    cx: number;
    cy: number;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      isDragging.current = true;
      startRef.current = {
        px: e.point.x,
        pz: e.point.z,
        w: placement.width,
        h: placement.height,
        cx: placement.cx,
        cy: placement.cy,
      };
    },
    [placement]
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDragging.current || !startRef.current) return;
      e.stopPropagation();

      const cosInv = Math.cos(-placement.rotation);
      const sinInv = Math.sin(-placement.rotation);

      const dxW = e.point.x - startRef.current.px;
      const dzW = e.point.z - startRef.current.pz;

      const dxL = dxW * cosInv - dzW * sinInv;
      const dyL = dxW * sinInv + dzW * cosInv;

      // 0=NW(-x,-y), 1=NE(+x,-y), 2=SE(+x,+y), 3=SW(-x,+y)
      const xSign = cornerIndex === 0 || cornerIndex === 3 ? -1 : 1;
      const ySign = cornerIndex === 0 || cornerIndex === 1 ? -1 : 1;

      let newW = Math.max(1, startRef.current.w + xSign * dxL);
      let newH = Math.max(1, startRef.current.h + ySign * dyL);

      const dw = newW - startRef.current.w;
      const dh = newH - startRef.current.h;

      const cosR = Math.cos(placement.rotation);
      const sinR = Math.sin(placement.rotation);

      const sx = (xSign * dw * cosR - ySign * dh * sinR) / 2;
      const sz = (xSign * dw * sinR + ySign * dh * cosR) / 2;

      onChange({
        ...placement,
        width: Math.round(newW * 10) / 10,
        height: Math.round(newH * 10) / 10,
        cx: Math.round((startRef.current.cx + sx) * 10) / 10,
        cy: Math.round((startRef.current.cy + sz) * 10) / 10,
      });
    },
    [placement, cornerIndex, onChange]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    startRef.current = null;
  }, []);

  return (
    <mesh
      position={position}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerOver={() => {
        setHovered(true);
        document.body.style.cursor = "nwse-resize";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      <boxGeometry args={[0.35, 0.35, 0.35]} />
      <meshBasicMaterial color={hovered ? "#818cf8" : "#6366f1"} />
    </mesh>
  );
}

/* ── Rotate Handle ─────────────────────────────────────────────────────── */

function RotateHandle({
  position,
  placement,
  onChange,
}: {
  position: [number, number, number];
  placement: ShapePlacement;
  onChange: (p: ShapePlacement | null) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isDragging = useRef(false);

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      isDragging.current = true;
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDragging.current) return;
      e.stopPropagation();
      const dx = e.point.x - placement.cx;
      const dz = e.point.z - placement.cy;
      let angle = Math.atan2(dx, -dz);
      const snap = Math.PI / 12; // 15°
      const snapped = Math.round(angle / snap) * snap;
      if (Math.abs(angle - snapped) < 0.05) angle = snapped;
      onChange({ ...placement, rotation: angle });
    },
    [placement, onChange]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <mesh
      position={position}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerOver={() => {
        setHovered(true);
        document.body.style.cursor = "grab";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      <sphereGeometry args={[0.25, 12, 12]} />
      <meshBasicMaterial color={hovered ? "#f59e0b" : "#f97316"} />
    </mesh>
  );
}

/* ── Line from centre to rotate handle ─────────────────────────────────── */

function RotateHandleLine({
  cx,
  cy,
  hx,
  hz,
}: {
  cx: number;
  cy: number;
  hx: number;
  hz: number;
}) {
  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([cx, 0.25, cy, hx, 0.25, hz], 3)
    );
    const mat = new THREE.LineBasicMaterial({
      color: "#f97316",
      linewidth: 1,
    });
    return new THREE.Line(geo, mat);
  }, [cx, cy, hx, hz]);

  return <primitive object={lineObj} />;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Router Marker                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

function RouterMarker3D({ router }: { router: RouterInfo }) {
  const position = useMemo(() => {
    if (!router.ip) return [5, 1.5, 5] as [number, number, number];
    const parts = router.ip.split(".").map(Number);
    const x = (parts[2] % 10) * 3 + (parts[3] % 10) * 0.3;
    const z = (parts[3] % 15) * 2;
    return [x, 1.5, z] as [number, number, number];
  }, [router.ip]);

  const displayName =
    router.label || router.hostname || router.ip || "AP";

  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.3, 0.4, 0.15, 16]} />
        <meshStandardMaterial
          color={router.isOnline ? "#22c55e" : "#ef4444"}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.45, 8]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
      <Html position={[0, 0.8, 0]} center style={{ pointerEvents: "none" }}>
        <div className="bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap">
          📡 {displayName}
          {router.clientCount > 0 && (
            <span className="text-green-400 ml-1">
              ({router.clientCount})
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Legacy free-draw: Drawing Plane                                          */
/* ────────────────────────────────────────────────────────────────────────── */

function DrawingPlane({
  polygon,
  onAddPoint,
  onComplete,
}: {
  polygon: Array<{ x: number; y: number }>;
  onAddPoint: (polygon: Array<{ x: number; y: number }>) => void;
  onComplete: (polygon: Array<{ x: number; y: number }>) => void;
}) {
  const lastClickTime = useRef(0);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const intersection = e.point;
      if (!intersection) return;

      const newPoint = {
        x: Math.round(intersection.x * 10) / 10,
        y: Math.round(intersection.z * 10) / 10,
      };

      const now = Date.now();
      if (now - lastClickTime.current < 400 && polygon.length >= 3) {
        onComplete(polygon);
        lastClickTime.current = 0;
        return;
      }
      lastClickTime.current = now;
      onAddPoint([...polygon, newPoint]);
    },
    [polygon, onAddPoint, onComplete]
  );

  return (
    <mesh
      position={[20, 0.01, 15]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={handleClick}
    >
      <planeGeometry args={[60, 40]} />
      <meshBasicMaterial
        transparent
        opacity={0.05}
        color="#6366f1"
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Legacy free-draw: Polygon Preview                                        */
/* ────────────────────────────────────────────────────────────────────────── */

function PolygonPreview({
  points,
}: {
  points: Array<{ x: number; y: number }>;
}) {
  const lineObject = useMemo(() => {
    const vertices: number[] = [];
    for (const p of points) vertices.push(p.x, 0.1, p.y);
    if (points.length >= 3) vertices.push(points[0].x, 0.1, points[0].y);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    const mat = new THREE.LineBasicMaterial({
      color: "#6366f1",
      linewidth: 2,
    });
    return new THREE.Line(geo, mat);
  }, [points]);

  return (
    <group>
      {points.length >= 2 && <primitive object={lineObject} />}

      {points.map((p, i) => (
        <mesh key={i} position={[p.x, 0.15, p.y]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshBasicMaterial color={i === 0 ? "#22c55e" : "#6366f1"} />
        </mesh>
      ))}

      {points.length >= 3 && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <shapeGeometry
            args={[
              (() => {
                const shape = new THREE.Shape();
                shape.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++)
                  shape.lineTo(points[i].x, points[i].y);
                shape.closePath();
                return shape;
              })(),
            ]}
          />
          <meshBasicMaterial
            color="#6366f1"
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
