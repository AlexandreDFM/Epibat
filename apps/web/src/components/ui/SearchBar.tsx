/**
 * File Name: SearchBar.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: UI component - device/student search bar.
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

import { useState, useCallback, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { searchDevices } from "@/lib/api";
import type { Device } from "@epibat/shared";

interface SearchBarProps {
  onResultSelect: (device: Device) => void;
}

export function SearchBar({ onResultSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Device[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await searchDevices(q);
      setResults(data);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="flex items-center gap-2 rounded-lg bg-[var(--card)] border border-[var(--border)] px-3 py-2">
        <Search size={16} className="text-[var(--muted-foreground)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un étudiant..."
          className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
          {results.map((device) => (
            <button
              key={device.id}
              onClick={() => {
                onResultSelect(device);
                setIsOpen(false);
                setQuery(device.user?.displayName ?? "");
              }}
              className="w-full text-left px-3 py-2 hover:bg-[var(--muted)] transition-colors flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-xs text-white font-semibold">
                {device.user?.displayName?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--foreground)]">
                  {device.user?.displayName ?? "Appareil anonyme"}
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  Dernière activité :{" "}
                  {new Date(device.lastSeen).toLocaleTimeString("fr-FR")}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--muted-foreground)] text-center">
          Aucun résultat
        </div>
      )}
    </div>
  );
}
