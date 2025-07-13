import { db } from "~/server/db";

export async function initializeDatabase() {
  try {
    // Create password table if it doesn't exist
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS user_passwords (
        userId TEXT PRIMARY KEY,
        passwordHash TEXT NOT NULL
      )
    `;

    // Check if default rooms exist
    const existingRooms = await db.chatRoom.findMany();
    
    if (existingRooms.length === 0) {
      console.log('Creating default chat rooms...');
      
      const defaultRooms = [
        { name: 'general', description: 'General discussion for all topics', topic: 'general' },
        { name: 'tech', description: 'Technology discussions and programming', topic: 'technology' },
        { name: 'gaming', description: 'Gaming community and discussions', topic: 'gaming' },
        { name: 'music', description: 'Music lovers and discussions', topic: 'music' },
        { name: 'movies', description: 'Movie discussions and recommendations', topic: 'entertainment' },
        { name: 'sports', description: 'Sports talk and updates', topic: 'sports' },
      ];

      for (const room of defaultRooms) {
        await db.chatRoom.create({
          data: {
            name: room.name,
            description: room.description,
            topic: room.topic,
            featured: true,
          }
        });
      }
      
      console.log('✅ Default chat rooms created');
    } else {
      console.log('✅ Database already initialized');
    }
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
}