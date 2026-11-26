/**
 * File Name: DeviceMarker.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Three.js component - renders device position markers on the 3D scene.
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

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Device } from "@epibat/shared";

interface DeviceMarkerProps {
    device: Device;
    /** Display label of the AP this device is connected to */
    connectedApLabel?: string;
}

export function DeviceMarker({ device, connectedApLabel }: DeviceMarkerProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);
    const pulseRef = useRef<THREE.Mesh>(null);

    const hasUser = !!device.user;
    const isLocal = !!device.isLocal;
    const color = isLocal ? "#f59e0b" : hasUser ? "#6366f1" : "#64748b";
    const sphereSize = isLocal ? 0.25 : 0.15;

    // Gentle floating animation + strong pulse for local device
    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.position.y =
                device.position.y + 0.5 + Math.sin(Date.now() * 0.003) * 0.1;
        }
        if (glowRef.current) {
            glowRef.current.scale.setScalar(
                1 + Math.sin(Date.now() * 0.005) * 0.15,
            );
        }
        if (pulseRef.current) {
            const scale = 1 + Math.sin(Date.now() * 0.003) * 0.4;
            pulseRef.current.scale.setScalar(scale);
            (pulseRef.current.material as THREE.MeshBasicMaterial).opacity =
                0.12 + Math.sin(Date.now() * 0.003) * 0.08;
        }
    });

    // Build the display label: local tag > user name > hostname > IP > short hash
    const primaryLabel = isLocal
        ? "⭐ Cet appareil"
        : (device.user?.displayName ??
          device.hostname ??
          device.ip ??
          device.id.slice(0, 8));

    // Secondary info: device type / vendor + MAC + IP
    const secondaryParts: string[] = [];
    // Prefer deviceType over raw vendor (e.g. "MacBook" instead of "MAC privée")
    if (device.deviceType) {
        secondaryParts.push(device.deviceType);
    } else if (device.vendor && device.vendor !== "Inconnu" && device.vendor !== "MAC privée") {
        secondaryParts.push(device.vendor);
    }
    if (device.mac) secondaryParts.push(device.mac);
    if (device.ip && device.ip !== primaryLabel) secondaryParts.push(device.ip);
    const secondaryLabel =
        secondaryParts.length > 0 ? secondaryParts.join(" · ") : null;

    return (
        <group position={[device.position.x, 0, device.position.z]}>
            {/* Pulsing broadcast circle for local device */}
            {isLocal && (
                <mesh
                    ref={pulseRef}
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, 0.03, 0]}
                >
                    <circleGeometry args={[1.2, 48]} />
                    <meshBasicMaterial
                        color="#f59e0b"
                        transparent
                        opacity={0.12}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}

            {/* Glow ring on ground */}
            <mesh
                ref={glowRef}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.02, 0]}
            >
                <ringGeometry args={[isLocal ? 0.3 : 0.2, isLocal ? 0.5 : 0.35, 32]} />
                <meshBasicMaterial color={color} transparent opacity={isLocal ? 0.7 : 0.4} />
            </mesh>

            {/* Device sphere */}
            <mesh ref={meshRef} position={[0, 0.5, 0]} castShadow>
                <sphereGeometry args={[sphereSize, 16, 16]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={isLocal ? 0.8 : 0.5}
                />
            </mesh>

            {/* Label — always shown */}
            <Html
                position={[0, isLocal ? 1.4 : 1.2, 0]}
                center
                distanceFactor={15}
                style={{ pointerEvents: "none", zIndex: isLocal ? 100 : 1 }}
            >
                <div
                    style={{
                        background: isLocal
                            ? "rgba(120,53,0,0.95)"
                            : "rgba(0,0,0,0.85)",
                        color: "white",
                        padding: isLocal ? "5px 12px" : "3px 8px",
                        borderRadius: isLocal ? "8px" : "4px",
                        fontSize: isLocal ? "13px" : "11px",
                        whiteSpace: "nowrap",
                        border: isLocal
                            ? "2px solid rgba(245,158,11,0.9)"
                            : `1px solid ${hasUser ? "rgba(99,102,241,0.5)" : "rgba(100,116,139,0.5)"}`,
                        lineHeight: "1.4",
                        boxShadow: isLocal
                            ? "0 0 12px rgba(245,158,11,0.5)"
                            : "none",
                    }}
                >
                    <div style={{ fontWeight: 600 }}>{primaryLabel}</div>
                    {connectedApLabel && (
                        <div
                            style={{
                                fontSize: isLocal ? "10px" : "9px",
                                color: "#10b981",
                                opacity: 0.9,
                            }}
                        >
                            📡 → {connectedApLabel}
                        </div>
                    )}
                    {secondaryLabel && (
                        <div
                            style={{
                                fontSize: isLocal ? "10px" : "9px",
                                opacity: 0.7,
                            }}
                        >
                            {secondaryLabel}
                        </div>
                    )}
                </div>
            </Html>
        </group>
    );
}
