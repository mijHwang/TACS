import { useId } from 'react';

const GREEN = '#05B15A';

interface StarRatingProps {
  score: number;
  size?: number;
  emptyColor?: string;
}

export default function StarRating({ score, size = 24, emptyColor = '#E5E7EB' }: StarRatingProps) {
  const uid = useId();
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${score.toFixed(1)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.min(Math.max(score - (star - 1), 0), 1);
        const id = `star-${uid}-${star}`;
        return (
          <svg key={star} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <linearGradient id={id}>
                <stop offset={`${fill * 100}%`} stopColor={GREEN} />
                <stop offset={`${fill * 100}%`} stopColor={emptyColor} />
              </linearGradient>
            </defs>
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill={`url(#${id})`}
              stroke={GREEN}
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </div>
  );
}
