/**
 * File Name: FloorPlanUpload.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: UI component - floor plan PDF/image upload with drag-and-drop.
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

import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, Check, Loader2, Trash2 } from "lucide-react";

interface FloorPlanUploadProps {
  floors: Array<{ id: string; level: number; name: string }>;
  onUploadComplete?: () => void;
}

interface FloorPlanStatus {
  floorId: string;
  level: number;
  name: string;
  textureUrl: string | null;
  hasFloorPlan: boolean;
}

export function FloorPlanUpload({
  floors,
  onUploadComplete,
}: FloorPlanUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [plans, setPlans] = useState<FloorPlanStatus[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetFloorId, setTargetFloorId] = useState<string | null>(null);

  // Fetch current floor plan status
  const loadPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/floors/plans");
      const json = await res.json();
      if (json.success) {
        setPlans(json.data);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setError(null);
    setSuccess(null);
    loadPlans();
  }, [loadPlans]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setError(null);
    setSuccess(null);
  }, []);

  const handleUploadClick = useCallback((floorId: string) => {
    setTargetFloorId(floorId);
    setError(null);
    setSuccess(null);
    // Trigger hidden file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !targetFloorId) return;

      // Validate client-side
      const allowed = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/svg+xml",
      ];
      if (!allowed.includes(file.type)) {
        setError("Format non supporté. Utilisez PDF, PNG, JPEG ou SVG.");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("Fichier trop volumineux (max 10 Mo).");
        return;
      }

      setUploading(targetFloorId);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`/api/v1/floors/${targetFloorId}/plan`, {
          method: "POST",
          body: formData,
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          setError(json.error || "Échec de l'upload");
          return;
        }

        const floor = floors.find((f) => f.id === targetFloorId);
        setSuccess(
          `Plan uploadé pour ${floor?.name ?? "l'étage"} (${(file.size / 1024).toFixed(0)} Ko)`
        );
        loadPlans();
        onUploadComplete?.();
      } catch (err) {
        setError("Erreur réseau lors de l'upload");
      } finally {
        setUploading(null);
      }
    },
    [targetFloorId, floors, loadPlans, onUploadComplete]
  );

  const handleDelete = useCallback(
    async (floorId: string) => {
      if (!confirm("Supprimer ce plan d'étage ?")) return;

      try {
        const res = await fetch(`/api/v1/floors/${floorId}/plan`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (json.success) {
          const floor = floors.find((f) => f.id === floorId);
          setSuccess(`Plan supprimé pour ${floor?.name ?? "l'étage"}`);
          loadPlans();
          onUploadComplete?.();
        }
      } catch {
        setError("Erreur lors de la suppression");
      }
    },
    [floors, loadPlans, onUploadComplete]
  );

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        title="Gérer les plans d'étage"
      >
        <Upload size={14} className="text-[var(--muted-foreground)]" />
        <span>Plans d&apos;étage</span>
      </button>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf,.png,.jpg,.jpeg,.svg"
        className="hidden"
      />

      {/* Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                  <FileText size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--foreground)]">
                    Plans d&apos;étage
                  </h2>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    PDF, PNG, JPEG ou SVG — max 10 Mo
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors"
              >
                <X size={18} className="text-[var(--muted-foreground)]" />
              </button>
            </div>

            {/* Feedback messages */}
            {error && (
              <div className="mx-6 mt-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mx-6 mt-4 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm flex items-center gap-2">
                <Check size={14} />
                {success}
              </div>
            )}

            {/* Floor list */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-2">
                {(plans.length > 0 ? plans : floors.map((f) => ({
                  floorId: f.id,
                  level: f.level,
                  name: f.name,
                  textureUrl: null,
                  hasFloorPlan: false,
                }))).map((plan) => {
                  const isUploading = uploading === plan.floorId;

                  return (
                    <div
                      key={plan.floorId}
                      className="flex items-center justify-between px-4 py-3 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs opacity-60 w-6">
                          N{plan.level}
                        </span>
                        <span className="text-sm text-[var(--foreground)]">
                          {plan.name}
                        </span>
                        {plan.hasFloorPlan && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                            ✓ Plan
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {plan.hasFloorPlan && (
                          <button
                            onClick={() => handleDelete(plan.floorId)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                            title="Supprimer le plan"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleUploadClick(plan.floorId)}
                          disabled={isUploading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50 transition-all"
                        >
                          {isUploading ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Upload size={12} />
                          )}
                          {plan.hasFloorPlan ? "Remplacer" : "Uploader"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
              Les plans sont utilisés comme texture de fond pour la
              visualisation 3D.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
