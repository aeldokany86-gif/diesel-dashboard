"use client";

import React, { useEffect, useRef, useState } from "react";

export default function ChartFrame({ children, height = 260 }) {
  const frameRef = useRef(null);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    if (!frameRef.current) return;

    const updateSize = () => {
      const nextWidth = frameRef.current?.clientWidth || 800;
      setWidth(Math.max(320, Math.floor(nextWidth)));
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(frameRef.current);

    window.addEventListener("resize", updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  return (
    <div ref={frameRef} className="fleet-chart-frame">
      {width > 0
        ? React.cloneElement(children, {
            width,
            height,
          })
        : null}
    </div>
  );
}