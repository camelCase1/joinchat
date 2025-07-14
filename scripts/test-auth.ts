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
    
    // Create password entry
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS user_passwords (
        userId TEXT PRIMARY KEY,
        passwordHash TEXT NOT NULL
      )
    `
    
    const passwordHash = Buffer.from('testpassword').toString('base64')
    await db.$executeRaw`
      INSERT OR REPLACE INTO user_passwords (userId, passwordHash) 
      VALUES (${user.id}, ${passwordHash})
    `
    
    console.log('✅ Created password entry for user')
    
    // Test login
    const loginUser = await db.user.findUnique({
      where: { email: testEmail }
    })
    
    if (loginUser) {
      const passwordRecord = await db.$queryRaw<{passwordHash: string}[]>`
        SELECT passwordHash FROM user_passwords WHERE userId = ${loginUser.id}
      `
      
      if (passwordRecord.length > 0) {
        console.log('✅ Login test successful - user and password found')
      } else {
        console.log('❌ Password not found for user')
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await db.$disconnect()
  }
}

testAuth()