import { useEffect, useState } from 'react';

const channel = new BroadcastChannel('khlongjai_sync');

export function useBroadcastSync<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);

  // Send updates to other tabs
  const updateState = (newState: T) => {
    setState(newState);
    channel.postMessage(newState);
  };

  // Listen for updates from other tabs
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      setState(event.data);
    };

    channel.addEventListener('message', handleMessage);
    return () => channel.removeEventListener('message', handleMessage);
  }, []);

  return [state, updateState] as const;
}
