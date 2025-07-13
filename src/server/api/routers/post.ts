import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

// Simple password hashing (in production, use bcrypt)
function hashPassword(password: string): string {
  return Buffer.from(password).toString('base64');
}

function verifyPassword(password: string, hash: string): boolean {
  return Buffer.from(password).toString('base64') === hash;
}

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  // Authentication procedures
  signup: publicProcedure
    .input(z.object({ 
      email: z.string().email(),
      password: z.string().min(6),
      displayName: z.string().min(1)
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email }
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already exists"
        });
      }

      // Create new user
      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          displayName: input.displayName,
          badges: JSON.stringify(['member']),
        }
      });

      // Store password separately (in a real app, this would be properly secured)
      await ctx.db.$executeRaw`
        CREATE TABLE IF NOT EXISTS user_passwords (
          userId TEXT PRIMARY KEY,
          passwordHash TEXT NOT NULL
        )
      `;
      
      await ctx.db.$executeRaw`
        INSERT INTO user_passwords (userId, passwordHash) 
        VALUES (${user.id}, ${hashPassword(input.password)})
      `;

      return {
        user: {
          uid: user.id,
          email: user.email,
          displayName: user.displayName
        }
      };
    }),

  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Find user
      const user = await ctx.db.user.findUnique({
        where: { email: input.email }
      });

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password"
        });
      }

      // Check password
      const passwordRecord = await ctx.db.$queryRaw<{passwordHash: string}[]>`
        SELECT passwordHash FROM user_passwords WHERE userId = ${user.id}
      `;

      if (!passwordRecord.length || !verifyPassword(input.password, passwordRecord[0]!.passwordHash)) {
        throw new TRPCError({
          code: "UNAUTHORIZED", 
          message: "Invalid email or password"
        });
      }

      return {
        user: {
          uid: user.id,
          email: user.email,
          displayName: user.displayName
        }
      };
    }),

  getCurrentUser: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId }
      });

      if (!user) {
        return null;
      }

      return {
        uid: user.id,
        email: user.email,
        displayName: user.displayName
      };
    }),

  getRooms: publicProcedure.query(async ({ ctx }) => {
    const rooms = await ctx.db.chatRoom.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            roomMembers: true,
          },
        },
      },
    });

    return rooms.map(room => ({
      id: room.id,
      name: room.name,
      participantCount: room._count.roomMembers,
      maxParticipants: room.maxParticipants,
      createdAt: room.createdAt,
      featured: room.featured,
    }));
  }),

  createRoom: publicProcedure
    .input(z.object({
      name: z.string().min(1).max(50),
      description: z.string().optional(),
      topic: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if room name already exists
      const existingRoom = await ctx.db.chatRoom.findFirst({
        where: { 
          name: input.name
        }
      });

      if (existingRoom) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A room with this name already exists"
        });
      }

      // Create new room
      const room = await ctx.db.chatRoom.create({
        data: {
          name: input.name,
          description: input.description || `Discussion about ${input.name}`,
          topic: input.topic || input.name.toLowerCase(),
          featured: false,
        }
      });

      return {
        id: room.id,
        name: room.name,
        participantCount: 0,
        maxParticipants: room.maxParticipants,
        createdAt: room.createdAt,
        featured: room.featured,
      };
    }),

  getMessages: publicProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ ctx, input }) => {
      const messages = await ctx.db.message.findMany({
        where: { roomId: input.roomId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          user: true,
        },
      });

      return messages.reverse();
    }),
});
