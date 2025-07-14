// Test script to verify room operations are working with database
import { db } from '../src/server/db.js'

async function testRooms() {
  try {
    console.log('🧪 Testing room operations...')
    
    // Get test user
    const user = await db.user.findFirst({
      where: { email: 'test@example.com' }
    })
    
    if (!user) {
      console.log('❌ Test user not found, run test-auth.ts first')
      return
    }
    
    console.log('✅ Found test user:', user.displayName)
    
    // Get a room
    const room = await db.chatRoom.findFirst()
    
    if (!room) {
      console.log('❌ No rooms found, run seed.ts first')
      return
    }
    
    console.log('✅ Found test room:', room.name)
    
    // Test joining room
    const roomMember = await db.roomMember.create({
      data: {
        userId: user.id,
        roomId: room.id,
        isActive: true
      }
    })
    
    console.log('✅ User joined room successfully')
    
    // Test message creation
    const message = await db.message.create({
      data: {
        userId: user.id,
        roomId: room.id,
        content: 'Hello from test script!',
        type: 'TEXT'
      }
    })
    
    console.log('✅ Message created:', message.content)
    
    // Test getting recent rooms for user
    const recentRooms = await db.roomMember.findMany({
      where: {
        userId: user.id,
        isActive: true
      },
      include: {
        room: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    })
    
    console.log('✅ Found recent rooms for user:', recentRooms.length)
    console.log('  - Room:', recentRooms[0]?.room.name)
    console.log('  - Last message:', recentRooms[0]?.room.messages[0]?.content)
    
    // Test room participant count
    const roomWithCount = await db.chatRoom.findFirst({
      where: { id: room.id },
      include: {
        _count: {
          select: {
            roomMembers: {
              where: { isActive: true }
            }
          }
        }
      }
    })
    
    console.log('✅ Room participant count:', roomWithCount?._count.roomMembers)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await db.$disconnect()
  }
}

testRooms()