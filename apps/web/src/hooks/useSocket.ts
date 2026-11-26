/**
 * File Name: useSocket.ts
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: React hook - manages Socket.io connection lifecycle.
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

import { useEffect, useRef, useCallback } from "react";
import { useSocketContext } from "@/components/providers/SocketProvider";

/**
 * Low-level hook to access the Socket.io connection.
 */
export function useSocket() {
  const { socket, isConnected } = useSocketContext();
  return { socket, isConnected };
}

/**
 * Subscribe to a Socket.io event and return the latest value.
 */
export function useSocketEvent<T>(
  event: string,
  handler: (data: T) => void
): void {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return;

    const cb = (data: T) => handlerRef.current(data);
    socket.on(event as never, cb as never);

    return () => {
      socket.off(event as never, cb as never);
    };
  }, [socket, event]);
}

/**
 * Subscribe to a floor for real-time updates.
 */
export function useFloorSubscription(floorId: string | null) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected || !floorId) return;

    socket.emit("floor:subscribe", floorId);

    return () => {
      socket.emit("floor:unsubscribe", floorId);
    };
  }, [socket, isConnected, floorId]);
}
