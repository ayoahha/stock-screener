'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Tab {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface TabNavigationProps {
  tabs: Tab[];
}

export function TabNavigation({ tabs }: TabNavigationProps) {
  const pathname = usePathname();

  return (
    <div className="border-b border-border mb-8">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'group inline-flex items-center border-b-2 py-4 px-1 text-sm font-semibold transition-all duration-300 relative',
                isActive
                  ? 'border-brand-gold text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              {/* Subtle background glow for active tab */}
              {isActive && (
                <span className="absolute inset-0 -z-10 bg-brand-gold/5 rounded-t-lg" />
              )}

              {tab.icon && (
                <span
                  className={cn(
                    'mr-2 h-5 w-5 transition-all duration-300',
                    isActive
                      ? 'text-brand-gold scale-110'
                      : 'text-muted-foreground group-hover:text-foreground group-hover:scale-105'
                  )}
                >
                  {tab.icon}
                </span>
              )}
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
