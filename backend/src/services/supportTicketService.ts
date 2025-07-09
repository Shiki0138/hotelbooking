import { prisma } from '../lib/prisma';
import { sendEmail } from './emailService';
import { io } from '../index';

export interface CreateTicketDto {
  userId: string;
  category: 'booking' | 'payment' | 'technical' | 'general';
  subject: string;
  message: string;
  bookingId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface TicketReplyDto {
  ticketId: string;
  userId: string;
  message: string;
  isStaff: boolean;
}

export class SupportTicketService {
  async createTicket(data: CreateTicketDto) {
    const ticketNumber = await this.generateTicketNumber();
    
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId: data.userId,
        category: data.category,
        subject: data.subject,
        status: 'OPEN',
        priority: data.priority || 'medium',
        bookingId: data.bookingId,
        messages: {
          create: {
            userId: data.userId,
            message: data.message,
            isStaff: false,
          },
        },
      },
      include: {
        user: true,
        messages: true,
      },
    });

    // Send confirmation email
    await sendEmail({
      to: ticket.user.email,
      subject: `Support Ticket Created - #${ticketNumber}`,
      template: 'supportTicketCreated',
      data: {
        userName: ticket.user.name,
        ticketNumber,
        subject: ticket.subject,
        category: ticket.category,
      },
    });

    // Notify support staff via WebSocket
    io.to('support-staff').emit('new-ticket', {
      ticketId: ticket.id,
      ticketNumber,
      category: ticket.category,
      priority: ticket.priority,
      subject: ticket.subject,
    });

    return ticket;
  }

  async replyToTicket(data: TicketReplyDto) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: data.ticketId },
      include: { user: true },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const reply = await prisma.ticketMessage.create({
      data: {
        ticketId: data.ticketId,
        userId: data.userId,
        message: data.message,
        isStaff: data.isStaff,
      },
    });

    // Update ticket status if staff replied
    if (data.isStaff && ticket.status === 'OPEN') {
      await prisma.supportTicket.update({
        where: { id: data.ticketId },
        data: { 
          status: 'IN_PROGRESS',
          assignedToId: data.userId,
        },
      });
    }

    // Update last activity
    await prisma.supportTicket.update({
      where: { id: data.ticketId },
      data: { lastActivityAt: new Date() },
    });

    // Send notification email
    const recipientEmail = data.isStaff ? ticket.user.email : 'support@lastminutestay.com';
    await sendEmail({
      to: recipientEmail,
      subject: `New Reply - Ticket #${ticket.ticketNumber}`,
      template: 'ticketReply',
      data: {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        message: data.message,
        isStaffReply: data.isStaff,
      },
    });

    // Real-time notification
    const socketRoom = data.isStaff ? `user-${ticket.userId}` : 'support-staff';
    io.to(socketRoom).emit('ticket-reply', {
      ticketId: ticket.id,
      message: reply,
    });

    return reply;
  }

  async getTickets(userId: string, isStaff: boolean = false) {
    const where = isStaff ? {} : { userId };
    
    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { lastActivityAt: 'desc' },
      ],
    });

    return tickets;
  }

  async getTicketDetails(ticketId: string, userId: string, isStaff: boolean = false) {
    const where = isStaff 
      ? { id: ticketId }
      : { id: ticketId, userId };

    const ticket = await prisma.supportTicket.findUnique({
      where,
      include: {
        user: true,
        booking: {
          include: {
            hotel: true,
            room: true,
          },
        },
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        assignedTo: true,
      },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return ticket;
  }

  async updateTicketStatus(
    ticketId: string,
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED',
    userId: string
  ) {
    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { 
        status,
        resolvedAt: status === 'RESOLVED' ? new Date() : null,
        closedAt: status === 'CLOSED' ? new Date() : null,
      },
      include: { user: true },
    });

    // Log status change
    await prisma.ticketMessage.create({
      data: {
        ticketId,
        userId,
        message: `Status changed to ${status}`,
        isStaff: true,
        isSystemMessage: true,
      },
    });

    // Send notification
    if (status === 'RESOLVED' || status === 'CLOSED') {
      await sendEmail({
        to: ticket.user.email,
        subject: `Ticket ${status} - #${ticket.ticketNumber}`,
        template: 'ticketStatusUpdate',
        data: {
          userName: ticket.user.name,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          status,
        },
      });
    }

    return ticket;
  }

  async assignTicket(ticketId: string, assignToId: string) {
    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { 
        assignedToId: assignToId,
        status: 'IN_PROGRESS',
      },
      include: { 
        assignedTo: true,
        user: true,
      },
    });

    // Log assignment
    await prisma.ticketMessage.create({
      data: {
        ticketId,
        userId: assignToId,
        message: `Ticket assigned to ${ticket.assignedTo?.name}`,
        isStaff: true,
        isSystemMessage: true,
      },
    });

    // Notify assigned staff
    io.to(`user-${assignToId}`).emit('ticket-assigned', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
    });

    return ticket;
  }

  async searchTickets(query: string, isStaff: boolean = false) {
    const tickets = await prisma.supportTicket.findMany({
      where: {
        OR: [
          { ticketNumber: { contains: query, mode: 'insensitive' } },
          { subject: { contains: query, mode: 'insensitive' } },
          { user: { email: { contains: query, mode: 'insensitive' } } },
        ],
        ...(isStaff ? {} : { userId: query }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 20,
    });

    return tickets;
  }

  async getTicketStats(period: 'day' | 'week' | 'month' = 'week') {
    const startDate = new Date();
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const stats = await prisma.$transaction([
      // Total tickets
      prisma.supportTicket.count({
        where: { createdAt: { gte: startDate } },
      }),
      // Open tickets
      prisma.supportTicket.count({
        where: { 
          status: 'OPEN',
          createdAt: { gte: startDate },
        },
      }),
      // Resolved tickets
      prisma.supportTicket.count({
        where: { 
          status: 'RESOLVED',
          resolvedAt: { gte: startDate },
        },
      }),
      // Average resolution time
      prisma.$queryRaw<[{ avg_resolution_time: number }]>`
        SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_time
        FROM support_tickets
        WHERE resolved_at IS NOT NULL
        AND created_at >= ${startDate}
      `,
      // Tickets by category
      prisma.supportTicket.groupBy({
        by: ['category'],
        where: { createdAt: { gte: startDate } },
        _count: true,
      }),
      // Tickets by priority
      prisma.supportTicket.groupBy({
        by: ['priority'],
        where: { createdAt: { gte: startDate } },
        _count: true,
      }),
    ]);

    return {
      total: stats[0],
      open: stats[1],
      resolved: stats[2],
      avgResolutionTimeHours: stats[3][0]?.avg_resolution_time || 0,
      byCategory: stats[4],
      byPriority: stats[5],
    };
  }

  private async generateTicketNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    const lastTicket = await prisma.supportTicket.findFirst({
      where: {
        ticketNumber: {
          startsWith: `T${year}${month}`,
        },
      },
      orderBy: { ticketNumber: 'desc' },
    });

    let sequence = 1;
    if (lastTicket) {
      const lastSequence = parseInt(lastTicket.ticketNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    return `T${year}${month}${sequence.toString().padStart(4, '0')}`;
  }
}