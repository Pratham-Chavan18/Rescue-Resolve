'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerEvent } from '@swiggy/types';

const WS_URL = process.env['NEXT_PUBLIC_WS_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

let socketInstance: Socket | null = null;

export function getSocket(token: string): Socket {
  if (!socketInstance || !socketInstance.connected) {
    socketInstance = io(WS_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

/**
 * useOrderSocket — subscribes to the order room and calls onEvent for typed events.
 * Handles join:order, cleanup, and reconnection transparently.
 */
export function useOrderSocket(
  orderId: string | null,
  token: string | null,
  onEvent: (event: ServerEvent) => void,
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!orderId || !token) return;

    const socket = getSocket(token);

    socket.emit('join:order', { orderId });

    const handler = (event: ServerEvent) => onEventRef.current(event);
    socket.on('event', handler);

    return () => {
      socket.off('event', handler);
    };
  }, [orderId, token]);
}

/**
 * useGlobalSocket — subscribes to role-specific global events (agent queue, etc.)
 */
export function useGlobalSocket(token: string | null, onEvent: (event: ServerEvent) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);
    const handler = (event: ServerEvent) => onEventRef.current(event);
    socket.on('event', handler);

    return () => {
      socket.off('event', handler);
    };
  }, [token]);
}
