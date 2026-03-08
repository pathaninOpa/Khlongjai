import { useEffect, useState } from 'react';

const channel = new BroadcastChannel('khlongjai_sync');

export function useBroadcastSync<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);

  // Send updates to other tabs
  const updateState = (newState: T) => {
    setState(newState);
    channel.postMessage({ type: 'UPDATE', data: newState });
  };

  // Request a sync from other tabs
  const requestSync = () => {
    channel.postMessage({ type: 'SYNC_REQUEST' });
  };

  // Listen for updates from other tabs
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;
      if (type === 'UPDATE') {
        setState(data);
      }
    };

    channel.addEventListener('message', handleMessage);
    return () => channel.removeEventListener('message', handleMessage);
  }, []);

  return [state, updateState, requestSync] as const;
}
