import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcrypt";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { calculateUserBadges, type UserStats } from "~/lib/badges";

// Secure password hashing using bcrypt
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
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
          password: await hashPassword(input.password),
          badges: JSON.stringify(['member']),
        }
      });

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
      // Find user (include password)
      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
        select: { id: true, email: true, displayName: true, password: true }
      });

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password"
        });
      }

      // Check password
      if (!user.password || !(await verifyPassword(input.password, user.password))) {
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
        displayName: user.displayName,
        badges: JSON.parse(user.badges) as string[],
        trustScore: user.trustScore,
        profileAge: user.profileAge,
        createdAt: user.createdAt
      };
    }),

  updateUser: publicProcedure
    .input(z.object({
      userId: z.string(),
      displayName: z.string().min(1).max(50).optional(),
      avatar: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const updateData: { displayName?: string; avatar?: string } = {};

      if (input.displayName) {
        updateData.displayName = input.displayName;
      }

      if (input.avatar) {
        updateData.avatar = input.avatar;
      }

      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: updateData
      });

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
            roomMembers: {
              where: { isActive: true }
            },
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

  joinRoom: publicProcedure
    .input(z.object({
      roomId: z.string(),
      userId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user exists
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId }
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found"
        });
      }

      // Check if room exists
      const room = await ctx.db.chatRoom.findUnique({
        where: { id: input.roomId }
      });

      if (!room) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Room not found"
        });
      }

      // Check if user is already a member
      const existingMember = await ctx.db.roomMember.findUnique({
        where: {
          userId_roomId: {
            userId: input.userId,
            roomId: input.roomId
          }
        }
      });

      if (!existingMember) {
        // Add user to room
        await ctx.db.roomMember.create({
          data: {
            userId: input.userId,
            roomId: input.roomId,
            isActive: true
          }
        });
      } else {
        // Update last seen and make active
        await ctx.db.roomMember.update({
          where: {
            userId_roomId: {
              userId: input.userId,
              roomId: input.roomId
            }
          },
          data: {
            lastSeen: new Date(),
            isActive: true
          }
        });
      }

      return { success: true };
    }),

  leaveRoom: publicProcedure
    .input(z.object({
      roomId: z.string(),
      userId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Mark member as inactive
      await ctx.db.roomMember.updateMany({
        where: {
          userId: input.userId,
          roomId: input.roomId
        },
        data: {
          isActive: false,
          lastSeen: new Date()
        }
      });

      return { success: true };
    }),

  getUserRecentRooms: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const recentRooms = await ctx.db.roomMember.findMany({
        where: {
          userId: input.userId,
          isActive: true
        },
        orderBy: {
          lastSeen: "desc"
        },
        take: 10,
        include: {
          room: {
            include: {
              messages: {
                orderBy: { createdAt: "desc" },
                take: 50, // fetch last 50 messages for unread count
                include: {
                  user: true
                }
              },
              _count: {
                select: {
                  roomMembers: {
                    where: { isActive: true }
                  }
                }
              }
            }
          }
        }
      });

      return recentRooms.map(member => {
        const lastSeen = member.lastSeen;
        const unreadCount = member.room.messages.filter(m => m.createdAt > lastSeen).length;
        return {
          roomId: member.room.id,
          roomName: member.room.name,
          lastMessage: member.room.messages[0]?.content,
          lastMessageTime: member.room.messages[0]?.createdAt || member.lastSeen,
          participantCount: member.room._count.roomMembers,
          unreadCount
        };
      });
    }),

  saveMessage: publicProcedure
    .input(z.object({
      roomId: z.string(),
      userId: z.string(),
      content: z.string(),
      type: z.enum(["TEXT", "IMAGE", "VIDEO", "SYSTEM"]).default("TEXT")
    }))
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.db.message.create({
        data: {
          roomId: input.roomId,
          userId: input.userId,
          content: input.content,
          type: input.type
        },
        include: {
          user: true
        }
      });

      // Update room member last seen
      await ctx.db.roomMember.updateMany({
        where: {
          userId: input.userId,
          roomId: input.roomId
        },
        data: {
          lastSeen: new Date()
        }
      });

      return message;
    }),

  deleteRoom: publicProcedure
    .input(z.object({
      roomId: z.string(),
      userId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if room exists
      const room = await ctx.db.chatRoom.findUnique({
        where: { id: input.roomId },
        include: {
          _count: {
            select: {
              roomMembers: {
                where: { isActive: true }
              }
            }
          },
          roomMembers: {
            where: { isActive: true }
          }
        }
      });

      if (!room) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Room not found"
        });
      }

      // Check if user is the only active member
      if (room._count.roomMembers !== 1 || room.roomMembers[0]?.userId !== input.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Can only delete room if you are the only person in it"
        });
      }

      // Delete the room (this will cascade delete messages and room members)
      await ctx.db.chatRoom.delete({
        where: { id: input.roomId }
      });

      return { success: true };
    }),

  getRoom: publicProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.db.chatRoom.findUnique({
        where: { id: input.roomId },
        include: {
          roomMembers: {
            where: { isActive: true },
            include: {
              user: true
            }
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 50,
            include: {
              user: true
            }
          }
        }
      });

      if (!room) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Room not found"
        });
      }

      return {
        id: room.id,
        name: room.name,
        maxParticipants: room.maxParticipants,
        participants: room.roomMembers.map(member => ({
          id: member.user.id,
          name: member.user.displayName,
          badges: JSON.parse(member.user.badges) as string[],
          joinedAt: member.joinedAt,
          trustScore: member.user.trustScore,
          profileAge: member.user.profileAge,
          messageCount: 0
        })),
        messages: room.messages.reverse().map(message => ({
          id: message.id,
          userId: message.userId,
          userName: message.user.displayName,
          content: message.content,
          timestamp: message.createdAt,
          type: 'text' as const
        })),
        createdAt: room.createdAt
      };
    }),

  getUserStats: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        include: {
          messages: true,
          roomMembers: {
            include: {
              room: true
            }
          }
        }
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found"
        });
      }

      // Calculate stats
      const messageCount = user.messages.length;
      const roomsJoined = user.roomMembers.length;
      const roomsCreated = await ctx.db.chatRoom.count({
        where: {
          // Note: We don't have a createdBy field, so this is placeholder
          // You might want to add this to track who created rooms
        }
      });

      const userStats: UserStats = {
        profileAge: user.profileAge,
        trustScore: user.trustScore,
        messageCount,
        roomsJoined,
        roomsCreated: 0, // Placeholder until we add room creation tracking
        daysActive: 1, // Placeholder - would need activity tracking
        createdAt: user.createdAt
      };

      return userStats;
    }),

  getUserBadges: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // First get user stats
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        include: {
          messages: true,
          roomMembers: {
            include: {
              room: true
            }
          }
        }
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found"
        });
      }

      // Calculate stats
      const messageCount = user.messages.length;
      const roomsJoined = user.roomMembers.length;

      const userStats: UserStats = {
        profileAge: user.profileAge,
        trustScore: user.trustScore,
        messageCount,
        roomsJoined,
        roomsCreated: 0, // Placeholder
        daysActive: Math.floor((new Date().getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) || 1,
        createdAt: user.createdAt
      };

      // Calculate badges
      const badges = calculateUserBadges(userStats);

      return {
        badges,
        stats: userStats,
        earnedBadges: badges.filter(b => b.isEarned),
        totalBadges: badges.length,
        earnedCount: badges.filter(b => b.isEarned).length
      };
    }),

  deleteUserMessagesInRoom: publicProcedure
    .input(z.object({ userId: z.string(), roomId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.message.deleteMany({
        where: {
          userId: input.userId,
          roomId: input.roomId,
        },
      });
      return { success: true };
    }),

  removeRoomFromRecent: publicProcedure
    .input(z.object({ userId: z.string(), roomId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Set isActive to false for this RoomMember entry
      await ctx.db.roomMember.updateMany({
        where: {
          userId: input.userId,
          roomId: input.roomId,
        },
        data: {
          isActive: false,
        },
      });
      return { success: true };
    }),
});
