interface Props {
  cards?: number;
}

export default function SectionSkeleton({ cards = 3 }: Props) {
  return (
    <div className="flex gap-4">
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="flex-none w-48 h-28 rounded-2xl bg-gray-100 animate-pulse" />
      ))}
    </div>
  );
}
