"use client";

import React from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
}

export function TypewriterText({
  text,
  speed = 35,
  className,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = React.useState("");

  React.useEffect(() => {
    setDisplayed("");
    if (!text) return;

    let index = 0;
    const interval = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(interval);
      }
    }, speed);

    return () => window.clearInterval(interval);
  }, [text, speed]);

  return <span className={className}>{displayed}</span>;
}


