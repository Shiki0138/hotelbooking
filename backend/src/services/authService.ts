import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '@prisma/client';
import { getPrisma } from './databaseService';
import { AppError } from '../middleware/errorHandler';

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  private prisma: ReturnType<typeof getPrisma>;
  private readonly saltRounds = 10;
  
  constructor() {
    this.prisma = getPrisma();
  }
  
  async register(data: RegisterData): Promise<{ user: Omit<User, 'password'>; token: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email }
    });
    
    if (existingUser) {
      throw new AppError(400, 'Email already registered');
    }
    
    const hashedPassword = await bcrypt.hash(data.password, this.saltRounds);
    
    const user = await this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword
      }
    });
    
    if (!user) {
      throw new AppError(500, 'Failed to create user');
    }
    
    const token = this.generateToken(user);
    const { password, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      token
    };
  }
  
  async login(data: LoginData): Promise<{ user: Omit<User, 'password'>; token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email }
    });
    
    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }
    
    const isValidPassword = await bcrypt.compare(data.password, user.password);
    
    if (!isValidPassword) {
      throw new AppError(401, 'Invalid credentials');
    }
    
    const token = this.generateToken(user);
    const { password, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      token
    };
  }
  
  private generateToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email
    };
    
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    
    const options: SignOptions = {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    } as SignOptions;
    
    return jwt.sign(payload, jwtSecret, options);
  }
}