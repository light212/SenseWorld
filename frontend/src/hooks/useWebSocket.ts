/**
 * WebSocket hook for real-time communication.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { WebSocketMessage, WebSocketMessageType } from "@/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/chat";

interface UseWebSocketOptions {
  token: string | null;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  send: (type: WebSocketMessageType, payload: unknown, requestId?: string) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const { token, onMessage, onConnect, onDisconnect, onError } = options;
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const url = `${WS_URL}?token=${token}`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        onMessage?.(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      onDisconnect?.();

      // Exponential backoff reconnection
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttempts.current++;
        connect();
      }, delay);
    };

    ws.onerror = (error) => {
      onError?.(error);
    };

    wsRef.current = ws;
  }, [token, onMessage, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const send = useCallback(
    (type: WebSocketMessageType, payload: unknown, requestId?: string) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        console.error("WebSocket is not connected");
        return;
      }

      const message: WebSocketMessage = {
        type,
        payload,
        timestamp: new Date().toISOString(),
        requestId,
      };

      wsRef.current.send(JSON.stringify(message));
    },
    []
  );

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    send,
    connect,
    disconnect,
  };
}
