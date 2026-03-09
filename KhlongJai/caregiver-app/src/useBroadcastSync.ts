import { useEffect, useState, useRef, useCallback } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const channel = new BroadcastChannel('khlongjai_sync');
const PROTOTYPE_DOC_ID = 'prototype_device_001';

export function useBroadcastSync<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const isInternalUpdate = useRef(false);

  // Send updates to other tabs AND the cloud
  const updateState = useCallback(async (newState: T | ((prev: T) => T)) => {
    isInternalUpdate.current = true;
    
    setState((prev) => {
      const resolvedState = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(prev) 
        : newState;

      // 1. Local Sync (Instant)
      channel.postMessage({ type: 'UPDATE', data: resolvedState });

      // 2. Cloud Sync (Firebase)
      if (db) {
        const deviceRef = doc(db, 'devices', PROTOTYPE_DOC_ID);
        setDoc(deviceRef, resolvedState as any, { merge: true })
          .catch(e => console.error("Cloud sync failed:", e));
      }

      return resolvedState;
    });
  }, []);

  // Request a sync from other tabs
  const requestSync = useCallback(() => {
    channel.postMessage({ type: 'SYNC_REQUEST' });
  }, []);

  // ── Listener 1: Local Message Channel ──
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;
      if (type === 'UPDATE') {
        isInternalUpdate.current = true;
        setState(data);
      } else if (type === 'SYNC_REQUEST') {
        // If someone requests a sync, and we have data, send it
        channel.postMessage({ type: 'UPDATE', data: state });
      }
    };

    channel.addEventListener('message', handleMessage);
    return () => channel.removeEventListener('message', handleMessage);
  }, [state]);

  // ── Listener 2: Firebase Cloud Sync ──
  useEffect(() => {
    if (!db) {
      console.warn("Firestore not initialized. Cloud sync disabled.");
      return;
    }

    const deviceRef = doc(db, 'devices', PROTOTYPE_DOC_ID);
    const unsubscribe = onSnapshot(deviceRef, (snapshot) => {
      // If we just sent this update ourselves, ignore the echo from the cloud
      if (isInternalUpdate.current) {
        isInternalUpdate.current = false;
        return;
      }

      if (snapshot.exists()) {
        const cloudData = snapshot.data() as T;
        setState(cloudData);
        // Sync locally too
        channel.postMessage({ type: 'UPDATE', data: cloudData });
      }
    });

    return () => unsubscribe();
  }, []);

  return [state, updateState, requestSync] as const;
}
