import { Star } from 'lucide-react';
import { extractPrefix } from '../lib/favorites-utils';

interface FavoriteButtonProps {
  filename: string;
  state: 'favorite' | 'oldfav' | undefined;
  onAdd: (prefix: string) => void;
  onRemove: (prefix: string) => void;
  onReactivate: (prefix: string) => void;
  size?: number;
  className?: string;
}

export function FavoriteButton({ filename, state, onAdd, onRemove, onReactivate, size = 24, className = '' }: FavoriteButtonProps) {
  const prefix = extractPrefix(filename);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (state === 'favorite') {
      onRemove(prefix);
    } else if (state === 'oldfav') {
      onReactivate(prefix);
    } else {
      onAdd(prefix);
    }
  };

  const isActive = state === 'favorite';
  const pad = size >= 20 ? 'p-2' : 'p-0.5';

  return (
    <button
      onClick={handleClick}
      className={`${pad} bg-black/50 rounded-full hover:bg-black/70 transition-colors z-20 ${className}`}
      title={isActive ? 'Remove from favorites' : state === 'oldfav' ? 'Restore to favorites' : 'Add to favorites'}
    >
      <Star
        size={size}
        className={isActive ? 'text-yellow-400' : 'text-white'}
        fill={isActive ? 'currentColor' : 'none'}
      />
    </button>
  );
}
