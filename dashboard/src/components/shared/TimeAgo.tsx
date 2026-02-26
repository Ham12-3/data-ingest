"use client";

import { useState, useEffect } from "react";
import { formatTimeAgo, formatTimestamp } from "@/lib/formatters";

interface TimeAgoProps {
  timestamp: string;
  className?: string;
}

export function TimeAgo({ timestamp, className }: TimeAgoProps) {
  const [display, setDisplay] = useState(() => formatTimeAgo(timestamp));

  useEffect(() => {
    setDisplay(formatTimeAgo(timestamp));
    const interval = setInterval(() => {
      setDisplay(formatTimeAgo(timestamp));
    }, 30_000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <time
      dateTime={timestamp}
      title={formatTimestamp(timestamp)}
      className={className}
    >
      {display}
    </time>
  );
}
