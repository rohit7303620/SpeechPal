import { useEffect, useRef, useState, useCallback } from 'react';
import { type WSMessage } from '@shared/schema';

interface UseWebSocketOptions {
  onMessage?: (message: WSMessage) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    // Prevent multiple concurrent connections
    if (socketRef.current?.readyState === WebSocket.OPEN || 
        socketRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    setIsConnecting(true);
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttempts.current = 0;
        options.onConnect?.();
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage;
          options.onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      socket.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        
        // Only clear socket reference if it's the same instance
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        
        options.onDisconnect?.();

        // Only attempt to reconnect if it wasn't a clean close and we should reconnect
        if (shouldReconnectRef.current && 
            event.code !== 1000 && 
            reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(2000 * reconnectAttempts.current, 10000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldReconnectRef.current) {
              connect();
            }
          }, delay);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnecting(false);
        options.onError?.(error);
      };

      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnecting(false);
    }
  }, [options]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socketRef.current && socketRef.current.readyState <= WebSocket.OPEN) {
      socketRef.current.close(1000, 'Client disconnect');
      socketRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const sendMessage = useCallback((message: WSMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket not connected, message not sent:', message);
    return false;
  }, []);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendMessage,
  };
}
