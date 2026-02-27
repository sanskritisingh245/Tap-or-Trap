import { useState, useCallback } from 'react';
import * as api from '../services/api';

/**
 * Hook for room creation/joining logic (friend challenge).
 */
export function useRoom() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.createRoom();
      setRoomCode(result.roomCode);
      return result.roomCode;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const join = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.joinRoom(code);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancel = useCallback(async () => {
    try {
      await api.cancelRoom();
      setRoomCode(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  return { roomCode, loading, error, create, join, cancel };
}
