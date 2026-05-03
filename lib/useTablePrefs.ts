"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";

export function useTablePrefs(pageKey: string, allColKeys: string[]) {
  const { user } = useAuth();
  const storageKey = user ? `fgas_cols_${user.id}_${pageKey}` : null;

  const [order, setOrder] = useState<string[]>(allColKeys);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;
  const orderRef = useRef(order);
  orderRef.current = order;

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { order: string[]; hidden: string[] };
      const merged = [
        ...saved.order.filter(k => allColKeys.includes(k)),
        ...allColKeys.filter(k => !saved.order.includes(k)),
      ];
      setOrder(merged);
      setHidden(new Set(saved.hidden.filter(k => allColKeys.includes(k))));
    } catch {
      // corrupted storage — leave defaults
    }
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = (newOrder: string[], newHidden: Set<string>) => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify({ order: newOrder, hidden: Array.from(newHidden) }));
  };

  const toggleCol = (key: string) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      persist(orderRef.current, next);
      return next;
    });
  };

  const moveCol = (key: string, dir: "up" | "down") => {
    setOrder(prev => {
      const idx = prev.indexOf(key);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      persist(next, hiddenRef.current);
      return next;
    });
  };

  const reset = () => {
    setOrder(allColKeys);
    setHidden(new Set());
    if (storageKey) localStorage.removeItem(storageKey);
  };

  const visibleCols = order.filter(k => !hidden.has(k));

  return { visibleCols, hidden, order, toggleCol, moveCol, reset };
}
