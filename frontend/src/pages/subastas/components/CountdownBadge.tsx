import { useEffect, useState } from 'react';

const RED    = '#D82D31';
const YELLOW = '#d97706'; // amber-600

interface CountdownBadgeProps {
  endTime: string; // ISO 8601
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Finalizada';
  const totalSeconds = Math.floor(ms / 1000);
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

export default function CountdownBadge({ endTime }: CountdownBadgeProps) {

  
  const formatTargetTime = (isoString: string) => {
    return isoString.endsWith('Z') ? isoString : `${isoString}Z`;
  };

  const [ms, setMs] = useState(() => new Date(formatTargetTime(endTime)).getTime() - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setMs(new Date(formatTargetTime(endTime)).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  const finished = ms <= 0;
  const critical = ms > 0 && ms < 5 * 60 * 1000;   // < 5 min
  const warning  = ms > 0 && ms < 60 * 60 * 1000;  // < 1 h

  const color = finished ? '#9ca3af'
    : critical ? RED
    : warning  ? YELLOW
    : '#6b7280';

  const bg = finished ? '#f3f4f6'
    : critical ? `${RED}12`
    : warning  ? '#d9770612'
    : '#f3f4f6';

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-semibold transition-all duration-300"
      style={{ background: bg, color }}
    >
      {critical && !finished && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse-dot shrink-0"
          style={{ background: RED }}
        />
      )}
      {formatCountdown(ms)}
    </span>
  );
}
