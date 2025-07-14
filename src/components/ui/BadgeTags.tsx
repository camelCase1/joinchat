'use client';

import { getEarnedBadges, type Badge } from '~/lib/badges';
import { useState } from 'react';

interface BadgeTagsProps {
  badges: string[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  progress?: Record<string, string>;
}

export function BadgeTags({ badges, maxDisplay = 3, size = 'md', progress = {} }: BadgeTagsProps) {
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);
  const badgeDescriptions: Record<string, string> = {
    member: 'Join a chat to earn this badge.',
    regular: 'Be active for 7+ days.',
    veteran: 'Be active for 30+ days.',
    active: 'Send 100+ messages.',
    chatty: 'Send 500+ messages.',
    superstar: 'Send 1000+ messages.',
    trusted: 'Reach 50 trust score.',
    reliable: 'Reach 80 trust score.',
    exemplary: 'Reach 95 trust score.',
    // Add more as needed
  };
  const badgeProgress: Record<string, string> = progress || {};

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {badges.slice(0, maxDisplay).map((badge) => {
        const isObj = typeof badge === 'object' && badge !== null && 'name' in badge;
        const badgeKey = isObj ? (badge as any).name : badge;
        const badgeLabel = isObj
          ? ((badge as any).name.charAt(0).toUpperCase() + (badge as any).name.slice(1))
          : (badge as string).charAt(0).toUpperCase() + (badge as string).slice(1);
        return (
          <div key={badgeKey} className="relative group flex items-center">
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 relative ${size === 'sm' ? 'text-xs px-1 py-0.5' : ''}`}>
              {badgeLabel}
              {/* Progression display if available */}
              {badgeProgress[badgeKey] && (
                <span className="ml-1 text-gray-500">({badgeProgress[badgeKey]})</span>
              )}
              {/* Question mark icon */}
              <span
                className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-white rounded-full border border-gray-300 cursor-pointer group-hover:bg-gray-200"
                onMouseEnter={() => setHoveredBadge(badgeKey)}
                onMouseLeave={() => setHoveredBadge(null)}
                onClick={() => setHoveredBadge(hoveredBadge === badgeKey ? null : badgeKey)}
                title="How to earn this badge?"
              >
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16h.01M12 8v4" />
                </svg>
              </span>
              {/* Tooltip/modal */}
              {hoveredBadge === badgeKey && (
                <div className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 w-48 p-2 bg-white border border-gray-300 rounded shadow-lg text-xs text-gray-700">
                  {badgeDescriptions[badgeKey] || 'No description.'}
                </div>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Quick component for just displaying top badges
export function TopBadges({ userId }: { userId: string }) {
  // This would need a separate hook or be integrated into existing queries
  return <div className="text-xs text-gray-500">Loading badges...</div>;
}