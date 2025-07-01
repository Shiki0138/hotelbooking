import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      error: 'メールアドレスとパスワードを入力してください' 
    });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Login error:', error);
      return res.status(401).json({ 
        error: 'メールアドレスまたはパスワードが正しくありません' 
      });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return res.status(200).json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: profile?.full_name
      },
      session: data.session
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'システムエラーが発生しました' 
    });
  }
}