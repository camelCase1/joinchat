// Test script to verify authentication is working with database
import { db } from '../src/server/db.js'

async function testAuth() {
  try {
    // Test user creation
    console.log('🧪 Testing user creation...')
    
    const testEmail = 'test@example.com'
    const testDisplayName = 'Test User'
    
    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email: testEmail }
    })
    
    if (existingUser) {
      console.log('✅ Test user already exists:', existingUser.displayName)
      return
    }
    
    // Create test user
    const user = await db.user.create({
      data: {
        email: testEmail,
        displayName: testDisplayName,
        badges: JSON.stringify(['member'])
      }
    })
    
    console.log('✅ Created test user:', user.displayName, 'with ID:', user.id)
    
    // Removed all user_passwords table logic; password is now in User table
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await db.$disconnect()
  }
}

testAuth()