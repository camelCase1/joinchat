'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let socketInstance: Socket | null = null;
    
    try {
      // Robust URL selection
      let socketUrl = '';
      if (typeof window !== 'undefined') {
        if (process.env.NEXT_PUBLIC_SOCKET_URL) {
          socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
        } else if (process.env.NODE_ENV === 'production') {
          socketUrl = window.location.origin.replace(/^http/, 'ws');
        } else {
          // Use current hostname for dev (handles localhost, 127.0.0.1, LAN IP)
          socketUrl = `http://${window.location.hostname}:3001`;
        }
      } else {
        socketUrl = 'http://localhost:3001';
      }
      console.log('[Socket] Connecting to:', socketUrl);
      socketInstance = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 8000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
      });
      
      socketInstance.on('connect', () => {
        console.log('🟢 Socket connected');
        setConnected(true);
        setError(null);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('🔴 Socket disconnected:', reason);
        setConnected(false);
      });

      socketInstance.on('connected', (data) => {
        console.log('✅ Server connection confirmed:', data.message);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message, '\nURL:', socketUrl);
        setConnected(false);
        setError(`Socket connection error: ${error.message}\nURL: ${socketUrl}`);
      });

      socketInstance.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
        setConnected(true);
        setError(null);
      });

      socketInstance.on('reconnect_error', (error) => {
        console.error('❌ Socket reconnection failed:', error.message, '\nURL:', socketUrl);
        setError(`Socket reconnection failed: ${error.message}\nURL: ${socketUrl}`);
      });

      setSocket(socketInstance);
    } catch (err) {
      setError('Failed to create socket connection');
      console.error('Socket creation error:', err);
    }

    return () => {
      if (socketInstance) {
        socketInstance.removeAllListeners();
        socketInstance.close();
      }
    };
  }, []);

  // Helper function to safely emit events
  const emitSafely = useCallback((event: string, data: any) => {
    if (socket && connected) {
      console.log(`📤 Emitting ${event}:`, data);
      socket.emit(event, data);
      return true;
    }
    console.warn(`❌ Cannot emit ${event}: socket not connected`);
    return false;
  }, [socket, connected]);

  return { socket, connected, error, emitSafely };
}