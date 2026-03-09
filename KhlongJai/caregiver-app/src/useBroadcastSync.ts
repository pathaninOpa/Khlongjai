import { useEffect, useState, useRef } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const channel = new BroadcastChannel('khlongjai_sync');
// For the prototype, we use a single fixed document ID. 
// In a real app, this would be the User ID or Device ID.
const PROTOTYPE_DOC_ID = 'prototype_device_001';

export function useBroadcastSync<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const isInternalUpdate = useRef(false);

  // Send updates to other tabs AND the cloud
  const updateState = async (newState: T) => {
    isInternalUpdate.current = true;
    setState(newState);
    
    // 1. Local Sync (Instant)
    channel.postMessage({ type: 'UPDATE', data: newState });

    // 2. Cloud Sync (Firebase)
    if (db) {
      try {
        const deviceRef = doc(db, 'devices', PROTOTYPE_DOC_ID);
        await setDoc(deviceRef, newState as any, { merge: true });
      } catch (e) {
        console.error("Cloud sync failed:", e);
      }
    }
  };

  // Request a sync from other tabs
  const requestSync = () => {
    channel.postMessage({ type: 'SYNC_REQUEST' });
  };

  // ── Listener 1: Local Message Channel ──
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;
      if (type === 'UPDATE') {
        isInternalUpdate.current = true;
        setState(data);
      }
    };

    channel.addEventListener('message', handleMessage);
    return () => channel.removeEventListener('message', handleMessage);
  }, []);

  // ── Listener 2: Firebase Cloud Sync ──
  useEffect(() => {
    if (!db) return;

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
        // Also broadcast cloud data locally to other tabs that might not have Firebase listeners
        channel.postMessage({ type: 'UPDATE', data: cloudData });
      }
    });

    return () => unsubscribe();
  }, []);

  return [state, updateState, requestSync] as const;
}
