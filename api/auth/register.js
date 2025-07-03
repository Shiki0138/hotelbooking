import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: '必須項目を入力してください' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'パスワードは6文字以上で入力してください' 
      });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return res.status(400).json({ 
          error: 'このメールアドレスは既に登録されています' 
        });
      }
      throw authError;
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email: email,
          name: name,
          created_at: new Date().toISOString()
        }
      ]);

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    return res.status(200).json({
      success: true,
      message: '登録が完了しました',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: name
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      error: '登録処理中にエラーが発生しました' 
    });
  }
}