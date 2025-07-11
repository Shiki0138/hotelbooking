import { Request, Response } from 'express';
import { cmsService } from '../services/cmsService';

export const cmsController = {
  // User Management
  async createCMSUser(req: Request, res: Response) {
    try {
      const userData = req.body;
      const user = await cmsService.createCMSUser(userData);
      res.json({ success: true, data: user });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getCMSUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const user = await cmsService.getCMSUser(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      res.json({ success: true, data: user });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateCMSUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = await cmsService.updateCMSUser(id, updates);
      res.json({ success: true, data: user });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Page Management
  async createPage(req: Request, res: Response) {
    try {
      const pageData = {
        ...req.body,
        author_id: req.user?.id
      };
      
      // Check permissions
      const hasPermission = await cmsService.checkPermission(
        req.user?.id,
        'create',
        'page',
        pageData.hotel_id
      );
      
      if (!hasPermission) {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }
      
      const page = await cmsService.createPage(pageData);
      res.json({ success: true, data: page });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getPage(req: Request, res: Response) {
    try {
      const { hotelId, slug } = req.params;
      const page = await cmsService.getPage(hotelId, slug);
      
      if (!page) {
        return res.status(404).json({ success: false, error: 'Page not found' });
      }
      
      res.json({ success: true, data: page });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updatePage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Check permissions
      const hasPermission = await cmsService.checkPermission(
        req.user?.id,
        'update',
        'page'
      );
      
      if (!hasPermission) {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }
      
      const page = await cmsService.updatePage(id, updates, req.user?.id);
      res.json({ success: true, data: page });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async publishPage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Check permissions
      const hasPermission = await cmsService.checkPermission(
        req.user?.id,
        'update',
        'page'
      );
      
      if (!hasPermission) {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }
      
      const page = await cmsService.publishPage(id, req.user?.id);
      res.json({ success: true, data: page });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async listPages(req: Request, res: Response) {
    try {
      const { hotelId, status } = req.query;
      const pages = await cmsService.listPages(
        hotelId as string,
        status as string
      );
      res.json({ success: true, data: pages });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Media Management
  async uploadMedia(req: Request, res: Response) {
    try {
      const mediaData = {
        ...req.body,
        uploaded_by: req.user?.id
      };
      
      // Check permissions
      const hasPermission = await cmsService.checkPermission(
        req.user?.id,
        'create',
        'media',
        mediaData.hotel_id
      );
      
      if (!hasPermission) {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }
      
      const media = await cmsService.uploadMedia(mediaData);
      res.json({ success: true, data: media });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getMediaLibrary(req: Request, res: Response) {
    try {
      const { hotelId } = req.query;
      const media = await cmsService.getMediaLibrary(hotelId as string);
      res.json({ success: true, data: media });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteMedia(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Check permissions
      const hasPermission = await cmsService.checkPermission(
        req.user?.id,
        'delete',
        'media'
      );
      
      if (!hasPermission) {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }
      
      await cmsService.deleteMedia(id, req.user?.id);
      res.json({ success: true, message: 'Media deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Block Management
  async createBlock(req: Request, res: Response) {
    try {
      const blockData = {
        ...req.body,
        created_by: req.user?.id
      };
      
      // Check permissions
      const hasPermission = await cmsService.checkPermission(
        req.user?.id,
        'create',
        'block',
        blockData.hotel_id
      );
      
      if (!hasPermission) {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }
      
      const block = await cmsService.createBlock(blockData);
      res.json({ success: true, data: block });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getBlocks(req: Request, res: Response) {
    try {
      const { hotelId, blockType } = req.query;
      const blocks = await cmsService.getBlocks(
        hotelId as string,
        blockType as string
      );
      res.json({ success: true, data: blocks });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateBlock(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Check permissions
      const hasPermission = await cmsService.checkPermission(
        req.user?.id,
        'update',
        'block'
      );
      
      if (!hasPermission) {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }
      
      const block = await cmsService.updateBlock(id, updates, req.user?.id);
      res.json({ success: true, data: block });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Content Builder
  async getPageContent(req: Request, res: Response) {
    try {
      const { hotelId, slug } = req.params;
      const content = await cmsService.buildPageContent(hotelId, slug);
      
      if (!content) {
        return res.status(404).json({ success: false, error: 'Content not found' });
      }
      
      res.json({ success: true, data: content });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};