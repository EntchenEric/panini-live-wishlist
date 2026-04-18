export type { ComicData } from '@/lib/types';

export function getPriorityStyle(priority?: number): string {
  if (!priority) return "";

  if (priority <= 3) {
    return "ring-2 ring-green-500/30 shadow-lg shadow-green-900/20 bg-gradient-to-b from-gray-800 to-green-950/30";
  } else if (priority <= 6) {
    return "ring-2 ring-yellow-500/30 shadow-lg shadow-yellow-900/20 bg-gradient-to-b from-gray-800 to-yellow-950/30";
  } else {
    return "ring-2 ring-red-500/30 shadow-lg shadow-red-900/20 bg-gradient-to-b from-gray-800 to-red-950/30";
  }
}

export function getPriorityTier(priority?: number): 'low' | 'medium' | 'high' | null {
  if (!priority) return null;
  if (priority <= 3) return 'low';
  if (priority <= 6) return 'medium';
  return 'high';
}

const TIER_SYMBOLS: Record<string, string> = {
  low: '▼',
  medium: '◆',
  high: '▲',
};

export function PriorityBadge({ priority }: { priority?: number }) {
  if (!priority) return null;

  const tier = getPriorityTier(priority);

  return (
    <div
      className="absolute top-2 right-2 z-10 h-7 px-1.5 rounded-full flex items-center justify-center text-xs font-bold gap-0.5"
      style={{
        backgroundColor: priority <= 3 ? '#065f46' : priority <= 6 ? '#854d0e' : '#7f1d1d',
        color: 'white',
        boxShadow: '0 0 8px rgba(0,0,0,0.5)',
      }}
      role="status"
      aria-label={`Priority: ${priority} (${tier})`}
    >
      <span aria-hidden="true">{tier && TIER_SYMBOLS[tier]}</span>
      {priority}
    </div>
  );
}