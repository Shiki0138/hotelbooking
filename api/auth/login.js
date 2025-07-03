import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'メールアドレスとパスワードを入力してください' 
      });
    }

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return res.status(401).json({ 
          error: 'メールアドレスまたはパスワードが正しくありません' 
        });
      }
      throw error;
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // Set secure cookie
    res.setHeader('Set-Cookie', [
      `access_token=${data.session.access_token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`,
      `refresh_token=${data.session.refresh_token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`
    ]);

    return res.status(200).json({
      success: true,
      message: 'ログインしました',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name || data.user.user_metadata.name,
        session: {
          access_token: data.session.access_token,
          expires_at: data.session.expires_at
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'ログイン処理中にエラーが発生しました' 
    });
  }
}