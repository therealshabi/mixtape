import { useEffect, useRef, useState, type PointerEvent } from "react";

type NoteCardProps = {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  maxLength?: number;
};

function sentencesForDisplay(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.{3,}/g, "…")
    .replace(/([.!?…])\s+/g, "$1\n");
}

export function NoteCard({
  value,
  onChange,
  readOnly = false,
  className = "",
  maxLength = 280,
}: NoteCardProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const [scrollable, setScrollable] = useState(false);
  const [thumb, setThumb] = useState({ top: 0, height: 28 });

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    function update() {
      const node = scrollerRef.current;
      const rail = railRef.current;
      if (!node) return;
      const canScroll = node.scrollHeight > node.clientHeight + 2;
      const railHeight = rail?.clientHeight || node.clientHeight;
      const thumbHeight = canScroll ? Math.max(22, (node.clientHeight / node.scrollHeight) * railHeight) : 28;
      const maxTop = Math.max(0, railHeight - thumbHeight);
      const range = node.scrollHeight - node.clientHeight;
      const top = range > 0 ? (node.scrollTop / range) * maxTop : 0;
      setScrollable(canScroll);
      setThumb({ top, height: thumbHeight });
    }

    update();
    scroller.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    const later = window.setTimeout(update, 750);
    return () => {
      scroller.removeEventListener("scroll", update);
      observer.disconnect();
      window.clearTimeout(later);
    };
  }, [value, readOnly]);

  function scrollFromPointer(clientY: number) {
    const node = scrollerRef.current;
    const rail = railRef.current;
    if (!node || !rail) return;
    const rect = rail.getBoundingClientRect();
    const range = node.scrollHeight - node.clientHeight;
    if (range <= 0) return;
    const y = Math.min(Math.max(0, clientY - rect.top), rect.height);
    node.scrollTop = (y / rect.height) * range;
  }

  function onRailPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    scrollFromPointer(event.clientY);
  }

  return (
    <div className={`note-card ${className}${scrollable ? " is-scrollable" : ""}`}>
      <img src="/assets/note-paper.png" alt="" aria-hidden="true" className="note-paper" draggable={false} />
      <div className="note-margin" />
      <div className="note-lines" />
      <div className="note-scroll-clip">
        <div ref={scrollerRef} className="note-scroll">
          {readOnly ? (
            <p className="note-text" tabIndex={0} aria-label="Mixtape note">
              {sentencesForDisplay(value)}
            </p>
          ) : (
            <textarea
              className="note-text note-input"
              value={value}
              maxLength={maxLength}
              placeholder="Write something sweet…"
              aria-label="Mixtape note"
              onChange={(event) => onChange?.(event.target.value)}
            />
          )}
        </div>
      </div>
      {scrollable && (
        <div
          ref={railRef}
          className="note-scrollbar"
          role="scrollbar"
          aria-label="Note scroll"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(thumb.top)}
          aria-orientation="vertical"
          onPointerDown={onRailPointerDown}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) scrollFromPointer(event.clientY);
          }}
        >
          <span className="note-scrollbar-thumb" style={{ height: thumb.height, top: thumb.top }} />
        </div>
      )}
      {!readOnly && (
        <span className="note-count">
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  );
}
