import { useRef } from 'react';

interface Props {
  children: React.ReactNode;
}

export default function Carousel({ children }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'right' ? 280 : -280, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {/* Izquierda */}
      <button
        type="button"
        aria-label="Anterior"
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center cursor-pointer hover:shadow-lg transition-all duration-150"
      >
        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>

      {/* Track */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {/* Derecha */}
      <button
        type="button"
        aria-label="Siguiente"
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center cursor-pointer hover:shadow-lg transition-all duration-150"
      >
        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>
  );
}
