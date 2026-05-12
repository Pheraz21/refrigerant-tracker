"use client";
import { useRef, useEffect, useState, ReactNode } from "react";

/**
 * Wraps a table in two horizontally-scrollable divs — one above, one below —
 * with their scrollLeft positions synchronised. The top thumb appears only when
 * the table's scrollWidth exceeds its container width.
 */
export function DoubleScrollContainer({
  children,
  wrapStyle,
}: {
  children: ReactNode;
  wrapStyle?: React.CSSProperties;
}) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [innerWidth, setInnerWidth] = useState(0);
  const syncing = useRef(false);

  useEffect(() => {
    const measure = () => {
      const tbl = bottomRef.current?.querySelector("table");
      if (tbl) setInnerWidth(tbl.scrollWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (bottomRef.current) ro.observe(bottomRef.current);
    const tbl = bottomRef.current?.querySelector("table");
    if (tbl) ro.observe(tbl);
    return () => ro.disconnect();
  });

  const sync = (from: "top" | "bottom") => () => {
    if (syncing.current) return;
    syncing.current = true;
    const source = from === "top" ? topRef.current : bottomRef.current;
    const target = from === "top" ? bottomRef.current : topRef.current;
    if (source && target) target.scrollLeft = source.scrollLeft;
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  };

  const defaultWrap: React.CSSProperties = {
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  return (
    <div>
      <div
        ref={topRef}
        onScroll={sync("top")}
        style={{ overflowX: "auto", overflowY: "hidden", marginBottom: 4 }}
      >
        <div style={{ width: innerWidth, height: 1 }} />
      </div>
      <div
        ref={bottomRef}
        onScroll={sync("bottom")}
        style={{ overflowX: "auto", ...defaultWrap, ...wrapStyle }}
      >
        {children}
      </div>
    </div>
  );
}
