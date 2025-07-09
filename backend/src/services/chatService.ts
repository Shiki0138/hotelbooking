import { io } from '../index';
import { prisma } from '../lib/prisma';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  isStaff: boolean;
}

export class ChatService {
  private activeChats: Map<string, Set<string>> = new Map();

  constructor() {
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    io.on('connection', (socket) => {
      // Join chat room
      socket.on('join-chat', async (data: { userId: string; isStaff: boolean }) => {
        const roomId = data.isStaff ? 'support-staff' : `chat-${data.userId}`;
        socket.join(roomId);
        
        // Add to active users
        if (!this.activeChats.has(roomId)) {
          this.activeChats.set(roomId, new Set());
        }
        this.activeChats.get(roomId)!.add(socket.id);

        // Send chat history
        const history = await this.getChatHistory(roomId);
        socket.emit('chat-history', history);

        // Notify staff of new user
        if (!data.isStaff) {
          io.to('support-staff').emit('user-joined-chat', {
            userId: data.userId,
            roomId,
          });
        }
      });

      // Handle chat messages
      socket.on('send-message', async (data: {
        userId: string;
        userName: string;
        message: string;
        isStaff: boolean;
      }) => {
        const roomId = data.isStaff ? `chat-${data.userId}` : `chat-${data.userId}`;
        
        const message: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          roomId,
          userId: data.userId,
          userName: data.userName,
          message: data.message,
          timestamp: new Date(),
          isStaff: data.isStaff,
        };

        // Save to Redis (keep last 100 messages per room)
        await redis.lpush(`chat:${roomId}`, JSON.stringify(message));
        await redis.ltrim(`chat:${roomId}`, 0, 99);
        await redis.expire(`chat:${roomId}`, 86400); // 24 hour expiry

        // Broadcast to room
        io.to(roomId).emit('new-message', message);
        
        // If customer message, also send to support staff room
        if (!data.isStaff) {
          io.to('support-staff').emit('customer-message', {
            roomId,
            message,
          });
        }
      });

      // Handle typing indicators
      socket.on('typing', (data: { userId: string; isTyping: boolean }) => {
        const roomId = `chat-${data.userId}`;
        socket.to(roomId).emit('user-typing', {
          userId: data.userId,
          isTyping: data.isTyping,
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        // Remove from all active chats
        this.activeChats.forEach((users, roomId) => {
          users.delete(socket.id);
          if (users.size === 0) {
            this.activeChats.delete(roomId);
          }
        });
      });
    });
  }

  async getChatHistory(roomId: string): Promise<ChatMessage[]> {
    const messages = await redis.lrange(`chat:${roomId}`, 0, -1);
    return messages.map(msg => JSON.parse(msg)).reverse();
  }

  async createChatSession(userId: string, initialMessage?: string) {
    const sessionId = `chat-${userId}-${Date.now()}`;
    
    const session = await prisma.chatSession.create({
      data: {
        sessionId,
        userId,
        status: 'ACTIVE',
      },
    });

    if (initialMessage) {
      const message: ChatMessage = {
        id: `msg-${Date.now()}`,
        roomId: `chat-${userId}`,
        userId,
        userName: 'Customer',
        message: initialMessage,
        timestamp: new Date(),
        isStaff: false,
      };

      await redis.lpush(`chat:chat-${userId}`, JSON.stringify(message));
    }

    // Notify support staff
    io.to('support-staff').emit('new-chat-session', {
      sessionId,
      userId,
      timestamp: new Date(),
    });

    return session;
  }

  async endChatSession(sessionId: string, summary?: string) {
    const session = await prisma.chatSession.update({
      where: { sessionId },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
        summary,
      },
    });

    // Archive chat history
    const roomId = `chat-${session.userId}`;
    const history = await this.getChatHistory(roomId);
    
    if (history.length > 0) {
      await prisma.chatHistory.create({
        data: {
          sessionId,
          userId: session.userId,
          messages: JSON.stringify(history),
          messageCount: history.length,
        },
      });
    }

    // Clear Redis
    await redis.del(`chat:${roomId}`);

    return session;
  }

  async getActiveChatSessions() {
    const sessions = await prisma.chatSession.findMany({
      where: { status: 'ACTIVE' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add online status
    const sessionsWithStatus = sessions.map(session => ({
      ...session,
      isOnline: this.activeChats.has(`chat-${session.userId}`),
      activeUsers: this.activeChats.get(`chat-${session.userId}`)?.size || 0,
    }));

    return sessionsWithStatus;
  }

  async getChatMetrics() {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    
    const metrics = await prisma.$transaction([
      // Total active chats
      prisma.chatSession.count({
        where: { status: 'ACTIVE' },
      }),
      // Chats started today
      prisma.chatSession.count({
        where: {
          createdAt: { gte: today },
        },
      }),
      // Average chat duration
      prisma.$queryRaw<[{ avg_duration: number }]>`
        SELECT AVG(EXTRACT(EPOCH FROM (ended_at - created_at))/60) as avg_duration
        FROM chat_sessions
        WHERE status = 'ENDED'
        AND created_at >= ${today}
      `,
      // Messages sent today
      prisma.chatHistory.aggregate({
        where: {
          createdAt: { gte: today },
        },
        _sum: {
          messageCount: true,
        },
      }),
    ]);

    return {
      activeChats: metrics[0],
      chatsToday: metrics[1],
      avgDurationMinutes: metrics[2][0]?.avg_duration || 0,
      messagesToday: metrics[3]._sum.messageCount || 0,
      onlineStaff: this.activeChats.get('support-staff')?.size || 0,
    };
  }

  // AI-powered chat suggestions
  async generateChatSuggestions(context: string): Promise<string[]> {
    // In a real implementation, this would use an AI service
    // For now, return context-based suggestions
    const suggestions = {
      booking: [
        'I can help you check your booking status.',
        'Would you like to modify your reservation?',
        'Let me look up your booking details.',
      ],
      payment: [
        'I can assist with payment-related queries.',
        'Let me check your payment status.',
        'Would you like information about our refund policy?',
      ],
      technical: [
        'I can help troubleshoot the issue.',
        'Have you tried clearing your browser cache?',
        'Let me escalate this to our technical team.',
      ],
      general: [
        'How can I assist you today?',
        'I\'m here to help with any questions.',
        'Feel free to ask me anything about our service.',
      ],
    };

    const category = this.detectCategory(context);
    return suggestions[category] || suggestions.general;
  }

  private detectCategory(text: string): 'booking' | 'payment' | 'technical' | 'general' {
    const lower = text.toLowerCase();
    
    if (lower.includes('booking') || lower.includes('reservation') || lower.includes('cancel')) {
      return 'booking';
    } else if (lower.includes('payment') || lower.includes('refund') || lower.includes('charge')) {
      return 'payment';
    } else if (lower.includes('error') || lower.includes('not working') || lower.includes('bug')) {
      return 'technical';
    }
    
    return 'general';
  }
}