import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

interface HotelManagerRequest extends Request {
  hotelManager?: {
    id: string;
    email: string;
    hotelIds: string[];
  };
}

export const hotelManagerAuth = async (
  req: HotelManagerRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || (user.role !== 'HOTEL_MANAGER' && user.role !== 'ADMIN')) {
      throw new Error();
    }

    // Get hotels managed by this user
    const managedHotels = await prisma.$queryRaw<Array<{ hotel_id: string }>>`
      SELECT hotel_id FROM hotel_manager_hotels WHERE user_id = ${user.id}
    `;

    req.hotelManager = {
      id: user.id,
      email: user.email,
      hotelIds: managedHotels.map((h) => h.hotel_id),
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate as hotel manager' });
  }
};