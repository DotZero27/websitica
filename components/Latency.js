"use client";

import { useLatency } from "@/hooks/useLatency";

export default function Latency() {
  const { latency, isStable, status } = useLatency();
  
  return (
    <span className="border rounded-full py-2 px-4">Latency: {latency}ms</span>
  );
}
