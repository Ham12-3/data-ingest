"use client";

import { useEffect, useState } from "react";
import { formatTimeAgo, formatTimestamp } from "@/lib/formatters";

interface TimeAgoProps {
  date: string | Date;
  className?: string;
}

export function TimeAgo({ date, className }: TimeAgoProps) {
  const [timeAgo, setTimeAgo] = useState(() => formatTimeAgo(date));

  useEffect(() => {
    setTimeAgo(formatTimeAgo(date));
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(date));
    }, 30_000);
    return () => clearInterval(interval);
  }, [date]);

  return (
    <time
      dateTime={new Date(date).toISOString()}
      title={formatTimestamp(date)}
      className={className}
    >
      {timeAgo}
    </time>
  );
}
