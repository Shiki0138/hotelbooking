import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma';

export class TwoFactorAuthService {
  // Generate 2FA secret for user
  async generateSecret(userId: string, email: string): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `LastMinuteStay (${email})`,
      issuer: 'LastMinuteStay',
      length: 32,
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Store encrypted secret in database
    await prisma.$executeRaw`
      UPDATE users 
      SET two_factor_secret = ${secret.base32},
          two_factor_enabled = false,
          two_factor_backup_codes = ${JSON.stringify(backupCodes)}
      WHERE id = ${userId}
    `;

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
    };
  }

  // Verify TOTP token
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user || !user.twoFactorSecret) {
      return false;
    }

    // Check if it's a backup code
    if (user.twoFactorBackupCodes) {
      const backupCodes = JSON.parse(user.twoFactorBackupCodes as string) as string[];
      const codeIndex = backupCodes.indexOf(token);
      
      if (codeIndex !== -1) {
        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        await prisma.user.update({
          where: { id: userId },
          data: {
            twoFactorBackupCodes: JSON.stringify(backupCodes),
          },
        });
        return true;
      }
    }

    // Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps in either direction
    });

    return verified;
  }

  // Enable 2FA after successful verification
  async enable2FA(userId: string, token: string): Promise<boolean> {
    const isValid = await this.verifyToken(userId, token);
    
    if (!isValid) {
      return false;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorEnabledAt: new Date(),
      },
    });

    return true;
  }

  // Disable 2FA
  async disable2FA(userId: string, password: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: true,
      },
    });

    if (!user) {
      return false;
    }

    // Verify password
    const bcrypt = await import('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return false;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
        twoFactorEnabledAt: null,
      },
    });

    return true;
  }

  // Generate new backup codes
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const backupCodes = this.generateBackupCodes();

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodes: JSON.stringify(backupCodes),
      },
    });

    return backupCodes;
  }

  // Check if user has 2FA enabled
  async is2FAEnabled(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
      },
    });

    return user?.twoFactorEnabled || false;
  }

  // Generate backup codes
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }

    return codes;
  }

  // Verify 2FA requirement for sensitive operations
  async requiresAdditional2FA(
    userId: string,
    operation: 'payment' | 'profile_change' | 'booking_cancel'
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        lastTwoFactorVerification: true,
      },
    });

    if (!user?.twoFactorEnabled) {
      return false;
    }

    // Check if recent verification exists
    if (user.lastTwoFactorVerification) {
      const timeSinceLastVerification = 
        Date.now() - new Date(user.lastTwoFactorVerification).getTime();
      
      // Don't require re-verification within 15 minutes
      if (timeSinceLastVerification < 15 * 60 * 1000) {
        return false;
      }
    }

    // Require 2FA for sensitive operations
    const sensitiveOperations = ['payment', 'profile_change', 'booking_cancel'];
    return sensitiveOperations.includes(operation);
  }

  // Record successful 2FA verification
  async recordVerification(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastTwoFactorVerification: new Date(),
      },
    });
  }

  // Get 2FA status for user
  async get2FAStatus(userId: string): Promise<{
    enabled: boolean;
    enabledAt: Date | null;
    backupCodesRemaining: number;
    lastVerification: Date | null;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorEnabledAt: true,
        twoFactorBackupCodes: true,
        lastTwoFactorVerification: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const backupCodes = user.twoFactorBackupCodes 
      ? JSON.parse(user.twoFactorBackupCodes as string) as string[]
      : [];

    return {
      enabled: user.twoFactorEnabled || false,
      enabledAt: user.twoFactorEnabledAt,
      backupCodesRemaining: backupCodes.length,
      lastVerification: user.lastTwoFactorVerification,
    };
  }
}