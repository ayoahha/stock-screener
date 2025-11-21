import { cn } from '@/lib/utils';

export type StockType = 'value' | 'growth' | 'dividend';

interface StockTypeBadgeProps {
  type: StockType;
  className?: string;
}

const typeConfig = {
  value: {
    label: 'Value',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  growth: {
    label: 'Croissance',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  dividend: {
    label: 'Rendement',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
};

export function StockTypeBadge({ type, className }: StockTypeBadgeProps) {
  const config = typeConfig[type];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
