import { Request, Response } from 'express';
import { TwoFactorAuthService } from '../services/twoFactorAuthService';
import { sendEmail } from '../services/emailService';

const twoFactorService = new TwoFactorAuthService();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const generateSecret = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { secret, qrCode, backupCodes } = await twoFactorService.generateSecret(
      req.user.id,
      req.user.email
    );

    // Send backup codes via email
    await sendEmail({
      to: req.user.email,
      subject: '2FA Backup Codes - LastMinuteStay',
      template: 'twoFactorBackupCodes',
      data: {
        userName: req.user.email,
        backupCodes,
      },
    });

    res.json({
      qrCode,
      backupCodes,
      message: 'Scan the QR code with your authenticator app',
    });
  } catch (error) {
    console.error('Generate 2FA secret error:', error);
    res.status(500).json({ error: 'Failed to generate 2FA secret' });
  }
};

export const enable2FA = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    const enabled = await twoFactorService.enable2FA(req.user.id, token);

    if (!enabled) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    res.json({
      message: '2FA enabled successfully',
      enabled: true,
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
};

export const disable2FA = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    const disabled = await twoFactorService.disable2FA(req.user.id, password);

    if (!disabled) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    res.json({
      message: '2FA disabled successfully',
      enabled: false,
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
};

export const verify2FA = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    const isValid = await twoFactorService.verifyToken(req.user.id, token);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    // Record successful verification
    await twoFactorService.recordVerification(req.user.id);

    res.json({
      message: 'Verification successful',
      valid: true,
    });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA token' });
  }
};

export const regenerateBackupCodes = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    // Verify password
    const bcrypt = await import('bcryptjs');
    const { prisma } = await import('../lib/prisma');
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { password: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const backupCodes = await twoFactorService.regenerateBackupCodes(req.user.id);

    // Send new backup codes via email
    await sendEmail({
      to: req.user.email,
      subject: 'New 2FA Backup Codes - LastMinuteStay',
      template: 'twoFactorBackupCodes',
      data: {
        userName: req.user.email,
        backupCodes,
        isRegenerated: true,
      },
    });

    res.json({
      backupCodes,
      message: 'New backup codes generated',
    });
  } catch (error) {
    console.error('Regenerate backup codes error:', error);
    res.status(500).json({ error: 'Failed to regenerate backup codes' });
  }
};

export const get2FAStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const status = await twoFactorService.get2FAStatus(req.user.id);

    res.json(status);
  } catch (error) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
};

export const check2FARequirement = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { operation } = req.query;

    if (!operation) {
      return res.status(400).json({ error: 'Operation type required' });
    }

    const required = await twoFactorService.requiresAdditional2FA(
      req.user.id,
      operation as 'payment' | 'profile_change' | 'booking_cancel'
    );

    res.json({
      required,
      operation,
    });
  } catch (error) {
    console.error('Check 2FA requirement error:', error);
    res.status(500).json({ error: 'Failed to check 2FA requirement' });
  }
};