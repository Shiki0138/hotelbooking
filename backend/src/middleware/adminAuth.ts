import { Request, Response, NextFunction } from 'express';
import { cmsService } from '../services/cmsService';

export async function adminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Check if user has admin privileges
    const cmsUser = await cmsService.getCMSUser(userId);
    
    if (!cmsUser || cmsUser.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Authorization check failed' 
    });
  }
}