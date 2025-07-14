'use client';

import { useAuth } from '~/contexts/AuthContext';
import { api } from '~/trpc/react';
import { getBadgesByCategory, type Badge } from '~/lib/badges';

interface BadgesPageProps {
  userId: string;
}

export function BadgesPage({ userId }: BadgesPageProps) {
  const { data: badgeData, isLoading } = api.post.getUserBadges.useQuery(
    { userId },
    { enabled: !!userId }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!badgeData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load badges</p>
      </div>
    );
  }

  const badgesByCategory = getBadgesByCategory(badgeData.badges);
  const categoryOrder: Badge['category'][] = ['profile', 'activity', 'trust', 'special'];
  
  const categoryInfo = {
    profile: {
      title: 'Profile Badges',
      description: 'Badges based on your account age and profile milestones',
      icon: '👤'
    },
    activity: {
      title: 'Activity Badges', 
      description: 'Badges earned through participation and engagement',
      icon: '⚡'
    },
    trust: {
      title: 'Trust Badges',
      description: 'Badges reflecting your reputation and trustworthiness',
      icon: '🤝'
    },
    special: {
      title: 'Special Badges',
      description: 'Unique badges for special achievements and milestones',
      icon: '✨'
    }
  };

  const ProgressBar = ({ current, required }: { current: number; required: number }) => {
    const percentage = Math.min((current / required) * 100, 100);
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
        <div 
          className="bg-red-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    );
  };

  const BadgeCard = ({ badge }: { badge: Badge }) => (
    <div className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
      badge.isEarned 
        ? 'border-green-200 bg-white shadow-sm hover:shadow-md' 
        : 'border-gray-200 bg-gray-50 opacity-75'
    }`}>
      {badge.isEarned && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{badge.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className={`font-semibold ${badge.isEarned ? 'text-gray-900' : 'text-gray-500'}`}>
              {badge.name}
            </h3>
            {badge.isEarned && (
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
                Earned
              </span>
            )}
          </div>
          
          <p className={`text-sm mt-1 ${badge.isEarned ? 'text-gray-600' : 'text-gray-400'}`}>
            {badge.description}
          </p>
          
          <p className={`text-xs mt-2 ${badge.isEarned ? 'text-gray-500' : 'text-gray-400'}`}>
            {badge.requirements}
          </p>
          
          {!badge.isEarned && badge.progress && (
            <div className="mt-3">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Progress</span>
                <span>{badge.progress.current} / {badge.progress.required} {badge.progress.unit}</span>
              </div>
              <ProgressBar current={badge.progress.current} required={badge.progress.required} />
            </div>
          )}
          
          {badge.isEarned && badge.earnedAt && (
            <p className="text-xs text-green-600 mt-2">
              ✓ Earned {badge.earnedAt.toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="bg-gradient-to-r from-red-50 to-pink-50 p-6 rounded-lg border border-red-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Badges</h2>
            <p className="text-gray-600">
              You&apos;ve earned {badgeData.earnedCount} out of {badgeData.totalBadges} available badges
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-red-600">{badgeData.earnedCount}</div>
            <div className="text-sm text-gray-500">badges earned</div>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span>{Math.round((badgeData.earnedCount / badgeData.totalBadges) * 100)}%</span>
          </div>
          <ProgressBar current={badgeData.earnedCount} required={badgeData.totalBadges} />
        </div>
      </div>

      {/* Badge Categories */}
      {categoryOrder.map(category => {
        const categoryBadges = badgesByCategory[category] || [];
        if (categoryBadges.length === 0) return null;

        const earnedInCategory = categoryBadges.filter(b => b.isEarned).length;
        const info = categoryInfo[category];

        return (
          <div key={category} className="space-y-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{info.icon}</span>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{info.title}</h3>
                <p className="text-gray-600 text-sm">{info.description}</p>
              </div>
              <div className="flex-1"></div>
              <div className="text-right">
                <div className="text-sm text-gray-500">
                  {earnedInCategory} / {categoryBadges.length} earned
                </div>
                <div className="text-xs text-gray-400">
                  {Math.round((earnedInCategory / categoryBadges.length) * 100)}% complete
                </div>
              </div>
            </div>
            
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {categoryBadges.map(badge => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Stats Section */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Your Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{badgeData.stats.messageCount}</div>
            <div className="text-sm text-gray-500">Messages Sent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{badgeData.stats.roomsJoined}</div>
            <div className="text-sm text-gray-500">Rooms Joined</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{badgeData.stats.trustScore}</div>
            <div className="text-sm text-gray-500">Trust Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{badgeData.stats.daysActive}</div>
            <div className="text-sm text-gray-500">Days Active</div>
          </div>
        </div>
      </div>
    </div>
  );
}