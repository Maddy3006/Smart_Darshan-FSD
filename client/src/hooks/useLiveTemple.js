import { useEffect, useState } from 'react';
import { useRoom, useSocketEvent } from '../context/SocketContext.jsx';
import { api } from '../lib/api.js';

/** Live queue snapshot for a temple: fetched once, then pushed by Socket.IO. */
export function useLiveTemple(templeId) {
  const [live, setLive] = useState(null);

  useRoom('temple', templeId);

  useSocketEvent('live:update', (snapshot) => {
    if (String(snapshot.templeId) === String(templeId)) setLive(snapshot);
  });

  useEffect(() => {
    if (!templeId) return;
    let cancelled = false;
    api
      .get(`/temples/${templeId}/live`)
      .then(({ data }) => !cancelled && setLive(data.live))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [templeId]);

  return live;
}
