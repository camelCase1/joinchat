// Badge system definitions and logic

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'profile' | 'activity' | 'trust' | 'special';
  requirements: string;
  isEarned?: boolean;
  earnedAt?: Date;
  progress?: {
    current: number;
    required: number;
    unit: string;
  };
}

export interface UserStats {
  profileAge: Date;
  trustScore: number;
  messageCount: number;
  roomsJoined: number;
  roomsCreated: number;
  daysActive: number;
  createdAt: Date;
}

// All available badges in the system
export const ALL_BADGES: Omit<Badge, 'isEarned' | 'earnedAt' | 'progress'>[] = [
  // Profile Age Badges
  {
    id: 'newcomer',
    name: 'Newcomer',
    description: 'Welcome to Join.Chat! Start your journey here.',
    icon: '🌱',
    color: 'bg-green-100 text-green-800',
    category: 'profile',
    requirements: 'Create your account'
  },
  {
    id: 'week-veteran',
    name: 'Week Veteran',
    description: 'Been part of the community for a week.',
    icon: '📅',
    color: 'bg-blue-100 text-blue-800',
    category: 'profile',
    requirements: 'Account age: 7 days'
  },
  {
    id: 'month-veteran',
    name: 'Month Veteran',
    description: 'A full month of being part of our community.',
    icon: '🗓️',
    color: 'bg-purple-100 text-purple-800',
    category: 'profile',
    requirements: 'Account age: 30 days'
  },
  {
    id: 'year-veteran',
    name: 'Year Veteran',
    description: 'A whole year of conversations and connections.',
    icon: '🎂',
    color: 'bg-yellow-100 text-yellow-800',
    category: 'profile',
    requirements: 'Account age: 365 days'
  },

  // Trust Score Badges
  {
    id: 'trusted-member',
    name: 'Trusted Member',
    description: 'Gained the trust of the community.',
    icon: '🤝',
    color: 'bg-indigo-100 text-indigo-800',
    category: 'trust',
    requirements: 'Trust score: 50+'
  },
  {
    id: 'highly-trusted',
    name: 'Highly Trusted',
    description: 'Your contributions are highly valued.',
    icon: '⭐',
    color: 'bg-amber-100 text-amber-800',
    category: 'trust',
    requirements: 'Trust score: 80+'
  },
  {
    id: 'guardian',
    name: 'Community Guardian',
    description: 'A pillar of trust and reliability.',
    icon: '🛡️',
    color: 'bg-red-100 text-red-800',
    category: 'trust',
    requirements: 'Trust score: 95+'
  },

  // Activity Badges
  {
    id: 'first-message',
    name: 'First Words',
    description: 'Sent your first message in a chat room.',
    icon: '💬',
    color: 'bg-cyan-100 text-cyan-800',
    category: 'activity',
    requirements: 'Send 1 message'
  },
  {
    id: 'chatterbox',
    name: 'Chatterbox',
    description: 'Love to chat! Sent 100 messages.',
    icon: '🗣️',
    color: 'bg-orange-100 text-orange-800',
    category: 'activity',
    requirements: 'Send 100 messages'
  },
  {
    id: 'conversation-master',
    name: 'Conversation Master',
    description: 'A true conversation enthusiast.',
    icon: '🎯',
    color: 'bg-emerald-100 text-emerald-800',
    category: 'activity',
    requirements: 'Send 500 messages'
  },
  {
    id: 'room-explorer',
    name: 'Room Explorer',
    description: 'Joined 10 different chat rooms.',
    icon: '🗺️',
    color: 'bg-teal-100 text-teal-800',
    category: 'activity',
    requirements: 'Join 10 rooms'
  },
  {
    id: 'room-creator',
    name: 'Room Creator',
    description: 'Created your first chat room.',
    icon: '🏗️',
    color: 'bg-violet-100 text-violet-800',
    category: 'activity',
    requirements: 'Create 1 room'
  },
  {
    id: 'community-builder',
    name: 'Community Builder',
    description: 'Created 5 chat rooms for others to enjoy.',
    icon: '🏛️',
    color: 'bg-rose-100 text-rose-800',
    category: 'activity',
    requirements: 'Create 5 rooms'
  },

  // Special Badges
  {
    id: 'early-adopter',
    name: 'Early Adopter',
    description: 'One of the first to join Join.Chat.',
    icon: '🚀',
    color: 'bg-gradient-to-r from-purple-400 to-pink-400 text-white',
    category: 'special',
    requirements: 'Joined during beta'
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Active during late night hours.',
    icon: '🦉',
    color: 'bg-slate-100 text-slate-800',
    category: 'special',
    requirements: 'Active between 12AM-6AM'
  },
  {
    id: 'daily-visitor',
    name: 'Daily Visitor',
    description: 'Visited Join.Chat for 7 consecutive days.',
    icon: '📆',
    color: 'bg-lime-100 text-lime-800',
    category: 'special',
    requirements: '7 consecutive active days'
  }
];

// Calculate user badges based on stats
export function calculateUserBadges(userStats: UserStats): Badge[] {
  const badges: Badge[] = [];
  const now = new Date();

  // Calculate profile age in days
  const profileAgeDays = Math.floor((now.getTime() - userStats.profileAge.getTime()) / (1000 * 60 * 60 * 24));
  const accountAgeDays = Math.floor((now.getTime() - userStats.createdAt.getTime()) / (1000 * 60 * 60 * 24));

  for (const badgeTemplate of ALL_BADGES) {
    let isEarned = false;
    let progress: Badge['progress'] | undefined;

    switch (badgeTemplate.id) {
      // Profile age badges
      case 'newcomer':
        isEarned = true; // Everyone gets this
        break;
      case 'week-veteran':
        isEarned = accountAgeDays >= 7;
        if (!isEarned) {
          progress = { current: accountAgeDays, required: 7, unit: 'days' };
        }
        break;
      case 'month-veteran':
        isEarned = accountAgeDays >= 30;
        if (!isEarned) {
          progress = { current: accountAgeDays, required: 30, unit: 'days' };
        }
        break;
      case 'year-veteran':
        isEarned = accountAgeDays >= 365;
        if (!isEarned) {
          progress = { current: accountAgeDays, required: 365, unit: 'days' };
        }
        break;

      // Trust score badges
      case 'trusted-member':
        isEarned = userStats.trustScore >= 50;
        if (!isEarned) {
          progress = { current: userStats.trustScore, required: 50, unit: 'trust points' };
        }
        break;
      case 'highly-trusted':
        isEarned = userStats.trustScore >= 80;
        if (!isEarned) {
          progress = { current: userStats.trustScore, required: 80, unit: 'trust points' };
        }
        break;
      case 'guardian':
        isEarned = userStats.trustScore >= 95;
        if (!isEarned) {
          progress = { current: userStats.trustScore, required: 95, unit: 'trust points' };
        }
        break;

      // Activity badges
      case 'first-message':
        isEarned = userStats.messageCount >= 1;
        if (!isEarned) {
          progress = { current: userStats.messageCount, required: 1, unit: 'messages' };
        }
        break;
      case 'chatterbox':
        isEarned = userStats.messageCount >= 100;
        if (!isEarned) {
          progress = { current: userStats.messageCount, required: 100, unit: 'messages' };
        }
        break;
      case 'conversation-master':
        isEarned = userStats.messageCount >= 500;
        if (!isEarned) {
          progress = { current: userStats.messageCount, required: 500, unit: 'messages' };
        }
        break;
      case 'room-explorer':
        isEarned = userStats.roomsJoined >= 10;
        if (!isEarned) {
          progress = { current: userStats.roomsJoined, required: 10, unit: 'rooms' };
        }
        break;
      case 'room-creator':
        isEarned = userStats.roomsCreated >= 1;
        if (!isEarned) {
          progress = { current: userStats.roomsCreated, required: 1, unit: 'rooms' };
        }
        break;
      case 'community-builder':
        isEarned = userStats.roomsCreated >= 5;
        if (!isEarned) {
          progress = { current: userStats.roomsCreated, required: 5, unit: 'rooms' };
        }
        break;

      // Special badges (these require additional logic)
      case 'early-adopter':
        // Check if user has early adopter badge in their badges array
        isEarned = false; // This would be manually granted
        break;
      case 'night-owl':
        // This would require tracking activity times
        isEarned = false; // Placeholder
        break;
      case 'daily-visitor':
        isEarned = userStats.daysActive >= 7;
        if (!isEarned) {
          progress = { current: userStats.daysActive, required: 7, unit: 'consecutive days' };
        }
        break;
    }

    badges.push({
      ...badgeTemplate,
      isEarned,
      progress,
      earnedAt: isEarned ? userStats.createdAt : undefined
    });
  }

  return badges;
}

// Get only earned badges
export function getEarnedBadges(badges: Badge[]): Badge[] {
  return badges.filter(badge => badge.isEarned);
}

// Get badges by category
export function getBadgesByCategory(badges: Badge[]): Record<Badge['category'], Badge[]> {
  return badges.reduce((acc, badge) => {
    if (!acc[badge.category]) {
      acc[badge.category] = [];
    }
    acc[badge.category].push(badge);
    return acc;
  }, {} as Record<Badge['category'], Badge[]>);
}