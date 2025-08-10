import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.message.deleteMany();
  await prisma.roomMember.deleteMany();
  await prisma.user.deleteMany();
  await prisma.chatRoom.deleteMany();

  // Create sample users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'alex@example.com',
        displayName: 'Alex Chen',
        password: 'password123',
        avatar: null,
        trustScore: 85,
        daysLoggedIn: 45,
        badges: JSON.stringify(['veteran', 'active', 'trusted']),
        profileAge: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.user.create({
      data: {
        email: 'sarah@example.com',
        displayName: 'Sarah Wilson',
        password: 'password123',
        avatar: null,
        trustScore: 92,
        daysLoggedIn: 60,
        badges: JSON.stringify(['veteran', 'active', 'exemplary']),
        profileAge: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
        createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.user.create({
      data: {
        email: 'mike@example.com',
        displayName: 'Mike Johnson',
        password: 'password123',
        avatar: null,
        trustScore: 78,
        daysLoggedIn: 30,
        badges: JSON.stringify(['regular', 'trusted']),
        profileAge: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.user.create({
      data: {
        email: 'emma@example.com',
        displayName: 'Emma Davis',
        password: 'password123',
        avatar: null,
        trustScore: 88,
        daysLoggedIn: 75,
        badges: JSON.stringify(['veteran', 'active', 'reliable']),
        profileAge: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000), // 150 days ago
        createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create chat rooms
  const rooms = await Promise.all([
    prisma.chatRoom.create({
      data: {
        name: 'general',
        description: 'General discussion for everyone',
        topic: 'General chat about anything and everything',
        isPublic: true,
        maxParticipants: 100,
        participantCount: 0,
        isActive: true,
        featured: true,
      },
    }),
    prisma.chatRoom.create({
      data: {
        name: 'random',
        description: 'Random conversations and off-topic chat',
        topic: 'Casual conversations',
        isPublic: true,
        maxParticipants: 50,
        participantCount: 0,
        isActive: true,
        featured: false,
      },
    }),
    prisma.chatRoom.create({
      data: {
        name: 'introductions',
        description: 'Introduce yourself to the community',
        topic: 'New member introductions',
        isPublic: true,
        maxParticipants: 30,
        participantCount: 0,
        isActive: true,
        featured: false,
      },
    }),
    prisma.chatRoom.create({
      data: {
        name: 'tech-talk',
        description: 'Discuss the latest in technology',
        topic: 'Technology and programming discussions',
        isPublic: true,
        maxParticipants: 40,
        participantCount: 0,
        isActive: true,
        featured: true,
      },
    }),
    prisma.chatRoom.create({
      data: {
        name: 'design',
        description: 'UI/UX design discussions',
        topic: 'Design patterns, tools, and inspiration',
        isPublic: true,
        maxParticipants: 30,
        participantCount: 0,
        isActive: true,
        featured: false,
      },
    }),
    prisma.chatRoom.create({
      data: {
        name: 'memes',
        description: 'Share your favorite memes',
        topic: 'Memes and humor',
        isPublic: true,
        maxParticipants: 50,
        participantCount: 0,
        isActive: true,
        featured: false,
      },
    }),
    prisma.chatRoom.create({
      data: {
        name: 'product',
        description: 'Product management and strategy',
        topic: 'Product development discussions',
        isPublic: true,
        maxParticipants: 25,
        participantCount: 0,
        isActive: true,
        featured: false,
      },
    }),
  ]);

  console.log(`✅ Created ${rooms.length} chat rooms`);

  // Create some sample messages in general and tech-talk rooms
  const generalRoom = rooms.find(r => r.name === 'general')!;
  const techRoom = rooms.find(r => r.name === 'tech-talk')!;

  const messages = await Promise.all([
    // Messages in general room
    prisma.message.create({
      data: {
        content: 'Welcome to Ever.Chat! This is the beginning of something great 🎉',
        userId: users[0].id,
        roomId: generalRoom.id,
        type: 'text',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
    }),
    prisma.message.create({
      data: {
        content: 'Hey everyone! Excited to be part of this community',
        userId: users[1].id,
        roomId: generalRoom.id,
        type: 'text',
        createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
      },
    }),
    prisma.message.create({
      data: {
        content: 'The new chat interface looks amazing! Great work team',
        userId: users[2].id,
        roomId: generalRoom.id,
        type: 'text',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      },
    }),
    prisma.message.create({
      data: {
        content: 'Thanks! We put a lot of effort into making it feel modern yet familiar',
        userId: users[0].id,
        roomId: generalRoom.id,
        type: 'text',
        createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
      },
    }),
    // Messages in tech-talk room
    prisma.message.create({
      data: {
        content: 'Has anyone tried the new Next.js 15 features?',
        userId: users[2].id,
        roomId: techRoom.id,
        type: 'text',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      },
    }),
    prisma.message.create({
      data: {
        content: 'Yes! The Turbopack improvements are incredible. Build times are so much faster',
        userId: users[0].id,
        roomId: techRoom.id,
        type: 'text',
        createdAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000), // 2.5 hours ago
      },
    }),
    prisma.message.create({
      data: {
        content: 'I\'m still on Next.js 14. Is the upgrade worth it?',
        userId: users[3].id,
        roomId: techRoom.id,
        type: 'text',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
    }),
    prisma.message.create({
      data: {
        content: 'Definitely! The performance improvements alone make it worthwhile',
        userId: users[0].id,
        roomId: techRoom.id,
        type: 'text',
        createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
      },
    }),
  ]);

  console.log(`✅ Created ${messages.length} sample messages`);

  // Create room memberships (add some users to rooms)
  const memberships = await Promise.all([
    // Add all users to general room
    ...users.map(user => 
      prisma.roomMember.create({
        data: {
          userId: user.id,
          roomId: generalRoom.id,
          isActive: false,
          joinedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last week
        },
      })
    ),
    // Add some users to tech-talk room
    prisma.roomMember.create({
      data: {
        userId: users[0].id,
        roomId: techRoom.id,
        isActive: false,
        joinedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.roomMember.create({
      data: {
        userId: users[2].id,
        roomId: techRoom.id,
        isActive: false,
        joinedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.roomMember.create({
      data: {
        userId: users[3].id,
        roomId: techRoom.id,
        isActive: false,
        joinedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  console.log(`✅ Created ${memberships.length} room memberships`);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });