/**
 * File Name: AccessPointMarker.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Three.js component - renders access point markers on the 3D scene.
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

import * as THREE from "three";
import { useRef, useMemo } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Device } from "@epibat/shared";

interface AccessPointMarkerProps {
    device: Device;
    clientCount: number;
    connectedClients?: Array<{ id: string; label: string }>;
}

export function AccessPointMarker({
    device,
    clientCount,
    connectedClients = [],
}: AccessPointMarkerProps) {
    const pulseRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);

    const color = "#10b981"; // emerald-500

    // Slow rotation for the antenna rings
    useFrame(() => {
        if (ringRef.current) {
            ringRef.current.rotation.y += 0.008;
        }
        if (pulseRef.current) {
            const scale = 1 + Math.sin(Date.now() * 0.002) * 0.3;
            pulseRef.current.scale.setScalar(scale);
            (pulseRef.current.material as THREE.MeshBasicMaterial).opacity =
                0.15 + Math.sin(Date.now() * 0.002) * 0.1;
        }
    });

    // Label text
    const label = device.hostname ?? device.ip ?? device.id.slice(0, 8);
    const macLabel = device.mac ?? "";

    // Create a wifi-signal-like shape: stacked torus rings
    const signalRings = useMemo(() => {
        const rings: Array<{ radius: number; y: number; opacity: number }> = [
            { radius: 0.3, y: 0.35, opacity: 0.6 },
            { radius: 0.5, y: 0.55, opacity: 0.4 },
            { radius: 0.7, y: 0.75, opacity: 0.25 },
        ];
        return rings;
    }, []);

    return (
        <group position={[device.position.x, 0, device.position.z]}>
            {/* Pulsing ground circle — broadcast range indicator */}
            <mesh
                ref={pulseRef}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.03, 0]}
            >
                <circleGeometry args={[1.5, 48]} />
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={0.15}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Ground ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
                <ringGeometry args={[0.35, 0.5, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.6} />
            </mesh>

            {/* AP body — cylinder (router shape) */}
            <mesh position={[0, device.position.y, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.2, 0.12, 16]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.6}
                    metalness={0.4}
                    roughness={0.3}
                />
            </mesh>

            {/* Antenna spike on top */}
            <mesh position={[0, device.position.y + 0.15, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.3}
                />
            </mesh>

            {/* Signal rings — wifi arcs */}
            <group ref={ringRef} position={[0, device.position.y + 0.3, 0]}>
                {signalRings.map((ring, i) => (
                    <mesh
                        key={i}
                        position={[0, ring.y, 0]}
                        rotation={[-Math.PI / 4, 0, 0]}
                    >
                        <torusGeometry
                            args={[ring.radius, 0.02, 8, 32, Math.PI]}
                        />
                        <meshBasicMaterial
                            color={color}
                            transparent
                            opacity={ring.opacity}
                        />
                    </mesh>
                ))}
            </group>

            {/* Label */}
            <Html
                position={[0, device.position.y + 1.5, 0]}
                center
                distanceFactor={15}
                style={{ pointerEvents: "none" }}
            >
                <div
                    style={{
                        background: "rgba(0,0,0,0.9)",
                        color: "white",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        whiteSpace: "nowrap",
                        border: "1px solid rgba(16,185,129,0.6)",
                        lineHeight: "1.4",
                    }}
                >
                    <div style={{ fontWeight: 700, color: "#10b981" }}>
                        📡 AP · {clientCount} client
                        {clientCount !== 1 ? "s" : ""}
                    </div>
                    <div style={{ fontWeight: 500 }}>{label}</div>
                    {macLabel && (
                        <div style={{ fontSize: "9px", opacity: 0.6 }}>
                            {macLabel}
                        </div>
                    )}
                    {connectedClients.length > 0 && (
                        <div
                            style={{
                                marginTop: "3px",
                                paddingTop: "3px",
                                borderTop: "1px solid rgba(16,185,129,0.3)",
                                fontSize: "9px",
                                opacity: 0.8,
                            }}
                        >
                            {connectedClients.slice(0, 5).map((c) => (
                                <div key={c.id}>→ {c.label}</div>
                            ))}
                            {connectedClients.length > 5 && (
                                <div style={{ opacity: 0.5 }}>
                                    +{connectedClients.length - 5} autres
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Html>
        </group>
    );
}
