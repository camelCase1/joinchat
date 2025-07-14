import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create some test rooms
  const rooms = await Promise.all([
    prisma.chatRoom.create({
      data: {
        name: 'Gaming',
        description: 'Discuss the latest games and gaming news',
        topic: 'gaming',
        featured: true,
      },
    }),
    prisma.chatRoom.create({
      data: {
        name: 'Technology',
        description: 'Talk about tech trends and innovations',
        topic: 'technology',
        featured: true,
      },
    }),
    prisma.chatRoom.create({
      data: {
        name: 'Movies & TV',
        description: 'Share your favorite shows and movie recommendations',
        topic: 'entertainment',
        featured: false,
      },
    }),
    prisma.chatRoom.create({
      data: {
        name: 'Fitness',
        description: 'Share workout tips and fitness goals',
        topic: 'fitness',
        featured: false,
      },
    }),
  ])

  console.log('Created rooms:', rooms.map(r => r.name).join(', '))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })