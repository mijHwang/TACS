import type { ReactNode } from 'react';

const BLUE = '#03BAE9';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  icon?: ReactNode;
}

export default function EmptyState({ title, subtitle, accentColor = BLUE, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: `${accentColor}12`, border: `1.5px solid ${accentColor}30` }}
      >
        {icon ?? (
          <svg viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.8" className="w-6 h-6" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 12h6" />
          </svg>
        )}
      </div>
      <p className="text-sm font-semibold text-text">{title}</p>
      {subtitle && <p className="text-xs text-muted max-w-xs">{subtitle}</p>}
    </div>
  );
}
