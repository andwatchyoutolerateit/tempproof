"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "tempproof:temperature-log-queue:v1";
const MAX_QUEUE_SIZE = 20;

export type PendingLog = {
  idempotencyKey: string;
  token: string;
  temperature: number;
  correctiveAction: string | null;
  createdAt: string;
  blocked?: boolean;
  error?: string;
};

export type SubmitResult =
  | { kind: "success"; loggedAt: string; outOfRange: boolean }
  | { kind: "validation"; message: string }
  | { kind: "temporary" };

function loadQueue(): PendingLog[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.slice(-MAX_QUEUE_SIZE) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: PendingLog[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)));
  window.dispatchEvent(new CustomEvent("tempproof:queue-change"));
}

export async function sendTemperatureLog(entry: PendingLog): Promise<SubmitResult> {
  try {
    const response = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
      loggedAt?: string;
      isOutOfRange?: boolean;
    };

    if (response.ok && body.loggedAt) {
      return { kind: "success", loggedAt: body.loggedAt, outOfRange: Boolean(body.isOutOfRange) };
    }
    if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
      return { kind: "validation", message: body.message ?? "This reading could not be saved. Check it and try again." };
    }
    return { kind: "temporary" };
  } catch {
    return { kind: "temporary" };
  }
}

export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [blockedMessage, setBlockedMessage] = useState("");
  const syncing = useRef(false);

  const refreshCount = useCallback(() => {
    const queue = loadQueue();
    setPendingCount(queue.length);
    setBlockedMessage(queue.find((entry) => entry.blocked)?.error ?? "");
  }, []);

  const enqueue = useCallback((entry: PendingLog) => {
    const queue = loadQueue().filter((item) => item.idempotencyKey !== entry.idempotencyKey);
    if (queue.length >= MAX_QUEUE_SIZE) return false;
    saveQueue([...queue, entry]);
    refreshCount();
    return true;
  }, [refreshCount]);

  const retryQueue = useCallback(async () => {
    if (syncing.current || !navigator.onLine) return;
    syncing.current = true;
    try {
      const queue = loadQueue();
      const remaining: PendingLog[] = [];
      for (const entry of queue) {
        if (entry.blocked) {
          remaining.push(entry);
          continue;
        }
        const result = await sendTemperatureLog(entry);
        if (result.kind === "success") {
          window.dispatchEvent(new CustomEvent("tempproof:queue-synced", { detail: result }));
          continue;
        }
        if (result.kind === "validation") {
          remaining.push({ ...entry, blocked: true, error: result.message });
          window.dispatchEvent(new CustomEvent("tempproof:queue-blocked", { detail: result.message }));
          continue;
        }
        remaining.push(entry);
        break;
      }
      saveQueue(remaining);
      refreshCount();
    } finally {
      syncing.current = false;
    }
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();
    const online = () => void retryQueue();
    const queueChanged = () => refreshCount();
    window.addEventListener("online", online);
    window.addEventListener("tempproof:queue-change", queueChanged);
    const interval = window.setInterval(() => void retryQueue(), 15_000);
    void retryQueue();
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("tempproof:queue-change", queueChanged);
      window.clearInterval(interval);
    };
  }, [refreshCount, retryQueue]);

  return { enqueue, retryQueue, pendingCount, blockedMessage };
}
