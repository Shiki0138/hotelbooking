import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, fullName, phoneNumber } = req.body;

  // Basic validation
  if (!email || !password || !fullName) {
    return res.status(400).json({ 
      error: '必須項目を入力してください' 
    });
  }

  if (password.length < 8) {
    return res.status(400).json({ 
      error: 'パスワードは8文字以上で入力してください' 
    });
  }

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      
      if (authError.message.includes('already registered')) {
        return res.status(409).json({ 
          error: 'このメールアドレスは既に登録されています' 
        });
      }
      
      return res.status(400).json({ 
        error: authError.message 
      });
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        phone_number: phoneNumber
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Continue anyway - profile can be created later
    }

    // Send welcome email (simplified for Phase 1)
    console.log(`Welcome email would be sent to ${email}`);

    return res.status(201).json({
      success: true,
      message: '登録が完了しました。確認メールをご確認ください。',
      user: {
        id: authData.user.id,
        email: authData.user.email
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ 
      error: 'システムエラーが発生しました' 
    });
  }
}