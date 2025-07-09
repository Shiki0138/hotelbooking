import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface CMSUser {
  id?: string;
  user_id: string;
  role: 'super_admin' | 'hotel_manager' | 'content_editor' | 'viewer';
  hotel_id?: string;
  permissions?: Record<string, any>;
  is_active?: boolean;
}

export interface CMSPage {
  id?: string;
  hotel_id?: string;
  slug: string;
  title: string;
  content: Record<string, any>;
  meta_description?: string;
  meta_keywords?: string[];
  status: 'draft' | 'published' | 'archived';
  author_id: string;
  published_at?: Date;
}

export interface CMSMedia {
  id?: string;
  hotel_id?: string;
  file_name: string;
  file_type: string;
  file_size: number;
  url: string;
  alt_text?: string;
  caption?: string;
  metadata?: Record<string, any>;
  uploaded_by: string;
}

export interface CMSBlock {
  id?: string;
  hotel_id?: string;
  block_type: 'hero' | 'gallery' | 'amenities' | 'policies' | 'faq' | 'testimonial' | 'custom';
  name: string;
  content: Record<string, any>;
  is_active?: boolean;
  created_by: string;
}

class CMSService {
  // User Management
  async createCMSUser(userData: CMSUser): Promise<CMSUser> {
    const { data, error } = await supabase
      .from('cms_users')
      .insert([userData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCMSUser(userId: string): Promise<CMSUser | null> {
    const { data, error } = await supabase
      .from('cms_users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateCMSUser(id: string, updates: Partial<CMSUser>): Promise<CMSUser> {
    const { data, error } = await supabase
      .from('cms_users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Page Management
  async createPage(pageData: CMSPage): Promise<CMSPage> {
    const { data, error } = await supabase
      .from('cms_pages')
      .insert([pageData])
      .select()
      .single();

    if (error) throw error;
    
    // Log to audit
    await this.logAudit(pageData.author_id, 'create', 'page', data.id);
    
    return data;
  }

  async getPage(hotelId: string, slug: string): Promise<CMSPage | null> {
    const { data, error } = await supabase
      .from('cms_pages')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return data;
  }

  async updatePage(id: string, updates: Partial<CMSPage>, userId: string): Promise<CMSPage> {
    const { data, error } = await supabase
      .from('cms_pages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Log to audit
    await this.logAudit(userId, 'update', 'page', id);
    
    return data;
  }

  async publishPage(id: string, userId: string): Promise<CMSPage> {
    const updates = {
      status: 'published' as const,
      published_at: new Date().toISOString()
    };

    return this.updatePage(id, updates, userId);
  }

  async listPages(hotelId?: string, status?: string): Promise<CMSPage[]> {
    let query = supabase.from('cms_pages').select('*');
    
    if (hotelId) query = query.eq('hotel_id', hotelId);
    if (status) query = query.eq('status', status);
    
    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  // Media Management
  async uploadMedia(mediaData: CMSMedia): Promise<CMSMedia> {
    const { data, error } = await supabase
      .from('cms_media')
      .insert([mediaData])
      .select()
      .single();

    if (error) throw error;
    
    // Log to audit
    await this.logAudit(mediaData.uploaded_by, 'upload', 'media', data.id);
    
    return data;
  }

  async getMediaLibrary(hotelId?: string): Promise<CMSMedia[]> {
    let query = supabase.from('cms_media').select('*');
    
    if (hotelId) query = query.eq('hotel_id', hotelId);
    
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async deleteMedia(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('cms_media')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // Log to audit
    await this.logAudit(userId, 'delete', 'media', id);
  }

  // Block Management
  async createBlock(blockData: CMSBlock): Promise<CMSBlock> {
    const { data, error } = await supabase
      .from('cms_blocks')
      .insert([blockData])
      .select()
      .single();

    if (error) throw error;
    
    // Log to audit
    await this.logAudit(blockData.created_by, 'create', 'block', data.id);
    
    return data;
  }

  async getBlocks(hotelId?: string, blockType?: string): Promise<CMSBlock[]> {
    let query = supabase.from('cms_blocks').select('*').eq('is_active', true);
    
    if (hotelId) query = query.eq('hotel_id', hotelId);
    if (blockType) query = query.eq('block_type', blockType);
    
    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async updateBlock(id: string, updates: Partial<CMSBlock>, userId: string): Promise<CMSBlock> {
    const { data, error } = await supabase
      .from('cms_blocks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Log to audit
    await this.logAudit(userId, 'update', 'block', id);
    
    return data;
  }

  // Content Builder
  async buildPageContent(hotelId: string, slug: string): Promise<any> {
    // Get the page
    const page = await this.getPage(hotelId, slug);
    if (!page || page.status !== 'published') {
      return null;
    }

    // Get active blocks for the hotel
    const blocks = await this.getBlocks(hotelId);

    // Combine page content with blocks
    const content = {
      ...page.content,
      blocks: blocks.reduce((acc, block) => {
        acc[block.name] = block.content;
        return acc;
      }, {} as Record<string, any>)
    };

    return {
      title: page.title,
      meta: {
        description: page.meta_description,
        keywords: page.meta_keywords
      },
      content
    };
  }

  // Audit Logging
  private async logAudit(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    changes?: any
  ): Promise<void> {
    const { error } = await supabase
      .from('cms_audit_log')
      .insert([{
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        changes
      }]);

    if (error) console.error('Failed to log audit:', error);
  }

  // Permission Checking
  async checkPermission(
    userId: string,
    action: string,
    resource: string,
    hotelId?: string
  ): Promise<boolean> {
    const cmsUser = await this.getCMSUser(userId);
    
    if (!cmsUser || !cmsUser.is_active) return false;
    
    // Super admins have all permissions
    if (cmsUser.role === 'super_admin') return true;
    
    // Check hotel-specific permissions
    if (hotelId && cmsUser.hotel_id !== hotelId) return false;
    
    // Role-based permissions
    const rolePermissions: Record<string, string[]> = {
      hotel_manager: ['create', 'read', 'update', 'delete'],
      content_editor: ['create', 'read', 'update'],
      viewer: ['read']
    };
    
    const allowedActions = rolePermissions[cmsUser.role] || [];
    return allowedActions.includes(action);
  }
}

export const cmsService = new CMSService();