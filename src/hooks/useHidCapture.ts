"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface UseHidCaptureReturn {
  captureRef: React.RefObject<HTMLInputElement | null>;
  lastEid: string | null;
  commitEid: (raw: string) => void;
}

const DEDUP_MS = 3000;

export function useHidCapture(onEid: (eid: string) => void): UseHidCaptureReturn {
  const captureRef = useRef<HTMLInputElement | null>(null);
  const [lastEid, setLastEid] = useState<string | null>(null);
  const lastCommitRef = useRef<{ eid: string; at: number } | null>(null);
  const onEidRef = useRef(onEid);
  useEffect(() => {
    onEidRef.current = onEid;
  }, [onEid]);

  const focusCapture = useCallback(() => {
    const el = captureRef.current;
    if (el && document.activeElement !== el) {
      el.focus();
    }
  }, []);

  useEffect(() => {
    focusCapture();
  }, [focusCapture]);

  const commitEid = useCallback(
    (raw: string) => {
      const eid = raw.replace(/\D/g, "").slice(0, 15);
      if (eid.length < 10) return;

      const now = Date.now();
      const last = lastCommitRef.current;
      if (last && last.eid === eid && now - last.at < DEDUP_MS) {
        if (captureRef.current) captureRef.current.value = "";
        focusCapture();
        return;
      }

      lastCommitRef.current = { eid, at: now };
      setLastEid(eid);
      if (captureRef.current) captureRef.current.value = "";
      onEidRef.current(eid);
      focusCapture();
    },
    [focusCapture]
  );

  return { captureRef, lastEid, commitEid };
}
