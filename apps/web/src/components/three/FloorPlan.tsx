/**
 * File Name: FloorPlan.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Three.js component - renders the floor plan texture (PDF/image).
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

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

interface FloorPlanProps {
  textureUrl?: string | null;
}

/* ------------------------------------------------------------------ */
/*  PDF.js loader – serves files from /public/pdfjs/ (local, no CDN)  */
/*  Uses webpackIgnore so Next.js doesn't try to bundle the ESM files */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pdfjsPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadPdfJs(): Promise<any> {
  if (_pdfjsPromise) return _pdfjsPromise;

  _pdfjsPromise = (async () => {
    // Native browser dynamic import – webpack leaves this alone
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error runtime dynamic import from public directory
    const pdfjsLib = await import(/* webpackIgnore: true */ "/pdfjs/pdf.min.mjs");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
    return pdfjsLib;
  })();

  return _pdfjsPromise;
}

/**
 * Render PDF page 1 → Canvas element (used directly as Three.js texture source).
 */
async function renderPdfToCanvas(
  url: string,
  scale = 3
): Promise<HTMLCanvasElement> {
  const pdfjsLib = await loadPdfJs();

  const loadingTask = pdfjsLib.getDocument(url);
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

/**
 * Base floor plane — displays an uploaded floor plan (PDF or image)
 * as a texture, or falls back to a dark rectangle.
 */
export function FloorPlan({ textureUrl }: FloorPlanProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [aspectRatio, setAspectRatio] = useState(2); // width/height default
  const { invalidate } = useThree();

  // Load texture from URL (handles PDF conversion)
  useEffect(() => {
    if (!textureUrl) {
      setTexture(null);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const isPdf = textureUrl!.toLowerCase().endsWith(".pdf");

        if (isPdf) {
          // Render PDF directly to a canvas, then use CanvasTexture
          const canvas = await renderPdfToCanvas(textureUrl!);
          if (cancelled) return;

          const tex = new THREE.CanvasTexture(canvas);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.needsUpdate = true;

          setAspectRatio(canvas.width / canvas.height);
          setTexture(tex);
          invalidate();
        } else {
          // For regular images, use TextureLoader
          const loader = new THREE.TextureLoader();
          loader.load(
            textureUrl!,
            (tex) => {
              if (cancelled) return;
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.minFilter = THREE.LinearFilter;
              tex.magFilter = THREE.LinearFilter;

              const img = tex.image as HTMLImageElement;
              if (img.width && img.height) {
                setAspectRatio(img.width / img.height);
              }

              setTexture(tex);
              invalidate();
            },
            undefined,
            (err) => {
              console.error("Failed to load floor plan texture:", err);
            }
          );
        }
      } catch (err) {
        console.error("Failed to process floor plan:", err);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [textureUrl, invalidate]);

  // Plane dimensions based on aspect ratio
  const planeWidth = 40;
  const planeHeight = planeWidth / aspectRatio;

  // Build material imperatively so R3F doesn't struggle with conditional children
  const material = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => {
    if (!material.current) return;
    if (texture) {
      material.current.map = texture;
      material.current.color.set("#ffffff");
      material.current.opacity = 0.95;
      material.current.needsUpdate = true;
    } else {
      material.current.map = null;
      material.current.color.set("#15151e");
      material.current.opacity = 0.8;
      material.current.needsUpdate = true;
    }
    invalidate();
  }, [texture, invalidate]);

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[planeWidth / 2, -0.01, planeHeight / 2]}
    >
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshBasicMaterial
        ref={material}
        color="#15151e"
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
