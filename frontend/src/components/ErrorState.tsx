const RED = '#D82D31';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  color?: string;
}

export default function ErrorState({
  message = 'No se pudo cargar la información.',
  onRetry,
  color = RED,
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <p className="text-base font-semibold" style={{ color }}>
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-6 py-2 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: color }}
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
