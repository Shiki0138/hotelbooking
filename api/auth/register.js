import { getSupabaseClient } from '../_lib/supabase.js';
import { errorResponse, validateRequest } from '../_middleware.js';
import Joi from 'joi';

// Validation schema
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  fullName: Joi.string().required(),
  phoneNumber: Joi.string().optional(),
  preferredLanguage: Joi.string().valid('ja', 'en').default('ja'),
  preferences: Joi.object({
    notifyLastMinute: Joi.boolean().default(true),
    notifyPriceDrops: Joi.boolean().default(true),
    notifyNewAvailability: Joi.boolean().default(true),
    preferredAreas: Joi.array().items(Joi.string()).optional(),
    preferredChains: Joi.array().items(Joi.string()).optional(),
    priceRange: Joi.object({
      min: Joi.number().positive().optional(),
      max: Joi.number().positive().optional()
    }).optional()
  }).optional()
});

// Send welcome email
async function sendWelcomeEmail(email, fullName, language = 'ja') {
  // Import Resend for email sending
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  const templates = {
    ja: {
      subject: '【LastMinuteStay】ご登録ありがとうございます',
      html: `
        <h2>${fullName}様</h2>
        <p>LastMinuteStayへのご登録ありがとうございます。</p>
        <p>日本の高級ホテルの直前予約情報を、いち早くお届けいたします。</p>
        <h3>ご利用方法</h3>
        <ol>
          <li>お好みのホテルやエリアを登録</li>
          <li>空室が出たら即座にメール通知</li>
          <li>お得な直前割引でご予約</li>
        </ol>
        <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        <hr>
        <p>LastMinuteStay Team</p>
      `
    },
    en: {
      subject: 'Welcome to LastMinuteStay',
      html: `
        <h2>Dear ${fullName}</h2>
        <p>Thank you for registering with LastMinuteStay.</p>
        <p>We'll notify you of last-minute availability at luxury hotels in Japan.</p>
        <h3>How it works</h3>
        <ol>
          <li>Set your preferred hotels or areas</li>
          <li>Get instant email notifications when rooms become available</li>
          <li>Book with exclusive last-minute discounts</li>
        </ol>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <hr>
        <p>LastMinuteStay Team</p>
      `
    }
  };
  
  const template = templates[language] || templates.ja;
  
  try {
    await resend.emails.send({
      from: 'LastMinuteStay <noreply@lastminutestay.com>',
      to: email,
      subject: template.subject,
      html: template.html
    });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}

// Create initial preferences
async function createDefaultPreferences(userId, preferences = {}) {
  const supabase = getSupabaseClient();
  const defaultPreferences = [];
  
  // Add area preferences
  if (preferences.preferredAreas && preferences.preferredAreas.length > 0) {
    for (const area of preferences.preferredAreas) {
      defaultPreferences.push({
        user_id: userId,
        preference_type: 'area',
        area_name: area,
        notify_last_minute: preferences.notifyLastMinute ?? true,
        notify_price_drop: preferences.notifyPriceDrops ?? true,
        notify_new_availability: preferences.notifyNewAvailability ?? true,
        min_price: preferences.priceRange?.min,
        max_price: preferences.priceRange?.max,
        is_active: true
      });
    }
  }
  
  // Add chain preferences
  if (preferences.preferredChains && preferences.preferredChains.length > 0) {
    for (const chain of preferences.preferredChains) {
      defaultPreferences.push({
        user_id: userId,
        preference_type: 'chain',
        chain_name: chain,
        notify_last_minute: preferences.notifyLastMinute ?? true,
        notify_price_drop: preferences.notifyPriceDrops ?? true,
        notify_new_availability: preferences.notifyNewAvailability ?? true,
        min_price: preferences.priceRange?.min,
        max_price: preferences.priceRange?.max,
        is_active: true
      });
    }
  }
  
  // Add default Tokyo preference if no preferences specified
  if (defaultPreferences.length === 0) {
    defaultPreferences.push({
      user_id: userId,
      preference_type: 'area',
      area_name: '東京',
      notify_last_minute: true,
      notify_price_drop: true,
      notify_new_availability: true,
      is_active: true
    });
  }
  
  const { error } = await supabase
    .from('user_preferences')
    .insert(defaultPreferences);
  
  if (error) {
    console.error('Failed to create default preferences:', error);
  }
}

// Main handler
async function registerHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json(errorResponse(new Error('Method not allowed'), 405));
  }
  
  try {
    const validatedData = req.body;
    const supabase = getSupabaseClient();
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          full_name: validatedData.fullName,
          preferred_language: validatedData.preferredLanguage
        }
      }
    });
    
    if (authError) {
      if (authError.message.includes('already registered')) {
        return res.status(409).json(
          errorResponse(new Error('このメールアドレスは既に登録されています'), 409)
        );
      }
      throw authError;
    }
    
    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: validatedData.email,
        full_name: validatedData.fullName,
        phone_number: validatedData.phoneNumber,
        preferred_language: validatedData.preferredLanguage,
        notification_enabled: true
      });
    
    if (profileError) {
      console.error('Failed to create user profile:', profileError);
      // Continue anyway - profile can be created later
    }
    
    // Create default preferences
    if (validatedData.preferences) {
      await createDefaultPreferences(authData.user.id, validatedData.preferences);
    }
    
    // Send welcome email
    await sendWelcomeEmail(
      validatedData.email,
      validatedData.fullName,
      validatedData.preferredLanguage
    );
    
    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          fullName: validatedData.fullName
        },
        session: authData.session
      },
      message: '登録が完了しました。メールをご確認ください。'
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json(errorResponse(error));
  }
}

// Apply validation middleware
export default validateRequest(registerSchema)(registerHandler);