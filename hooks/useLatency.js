import { useState, useEffect } from 'react';
import { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { supabase } from "@/lib/client";
import { nanoid } from "nanoid";

const LATENCY_THRESHOLD = 400;

export function useLatency() {
  const [latency, setLatency] = useState(0);
  const [isStable, setIsStable] = useState(false);
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    const userId = nanoid();
    let pingIntervalId;
    let pingChannel;

    pingChannel = supabase.channel(`ping:${userId}`, {
      config: { broadcast: { ack: true } },
    });

    pingChannel.subscribe((status) => {
      if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        setStatus('Analyzing Network ...');
        pingIntervalId = setInterval(async () => {
          const start = performance.now();
          const resp = await pingChannel.send({
            type: "broadcast",
            event: "PING",
            payload: {},
          });

          if (resp !== "ok") {
            console.log("pingChannel broadcast error");
            setLatency(-1);
            setStatus('Connection Error');
          } else {
            const end = performance.now();
            const newLatency = end - start;
            setLatency(newLatency);

            if (newLatency < LATENCY_THRESHOLD) {
              setIsStable(true);
              setStatus('Network Stable 👍');
            } else {
              setIsStable(false);
              setStatus('Network Unstable 👎');
            }
          }
        }, 1000);
      }
    });

    return () => {
      pingIntervalId && clearInterval(pingIntervalId);
      pingChannel && supabase.removeChannel(pingChannel);
    };
  }, []);

  return { latency, isStable, status };
}