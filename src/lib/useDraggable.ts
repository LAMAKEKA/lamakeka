import { useState, useEffect, useRef, type CSSProperties, type MouseEvent } from "react";

export function useDraggable() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const origin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  useEffect(() => {
    function onMove(e: globalThis.MouseEvent) {
      if (!dragging.current) return;
      setPos({
        x: origin.current.px + e.clientX - origin.current.mx,
        y: origin.current.py + e.clientY - origin.current.my,
      });
    }
    function onUp() {
      dragging.current = false;
      document.body.style.cursor = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  function onDragStart(e: MouseEvent) {
    dragging.current = true;
    origin.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    document.body.style.cursor = "grabbing";
    e.preventDefault();
  }

  return {
    dragStyle: { transform: `translate(${pos.x}px, ${pos.y}px)` } as CSSProperties,
    onDragStart,
  };
}
