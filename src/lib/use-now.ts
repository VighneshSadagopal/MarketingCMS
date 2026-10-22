"use client";

import { useSyncExternalStore } from "react";

const MINUTE = 60 * 1000;

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, MINUTE);
  return () => clearInterval(id);
}

const getSnapshot = () => Math.floor(Date.now() / MINUTE) * MINUTE;
// Nothing on the server render, so time-based labels never mismatch on hydration.
const getServerSnapshot = () => null;

/** The current time, rounded to the minute and refreshed every minute. Null during server render. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
