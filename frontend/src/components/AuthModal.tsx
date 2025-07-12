import * as React from 'react';
import { authService } from '../services/supabase';

const { useState, createElement: e } = React;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  mode: 'signin' | 'signup';
}

const AuthModal = ({ isOpen, onClose, onSuccess, mode: initialMode }: AuthModalProps) => {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'signup') {
        const { user } = await authService.signUp(email, password, fullName);
        setSuccess('アカウントを作成しました！メールを確認してください。');
        if (user) {
          setTimeout(() => {
            onSuccess(user);
            onClose();
          }, 2000);
        }
      } else {
        const { user } = await authService.signIn(email, password);
        if (user) {
          onSuccess(user);
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    
    try {
      await authService.signInWithGoogle();
      // Googleログインはリダイレクトするため、ここでは処理なし
    } catch (err: any) {
      setError(err.message || 'Googleログインに失敗しました');
      setLoading(false);
    }
  };

  return e('div', {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    onClick: onClose
  }, e('div', {
    style: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: window.innerWidth < 640 ? '24px' : '32px',
      maxWidth: '400px',
      width: '100%',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
    },
    onClick: (e: any) => e.stopPropagation()
  }, [
    // ヘッダー
    e('div', {
      key: 'header',
      style: {
        textAlign: 'center',
        marginBottom: '24px'
      }
    }, [
      e('h2', {
        key: 'title',
        style: {
          fontSize: window.innerWidth < 640 ? '24px' : '28px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '8px'
        }
      }, mode === 'signup' ? '新規登録' : 'ログイン'),
      e('p', {
        key: 'subtitle',
        style: {
          fontSize: '14px',
          color: '#6b7280'
        }
      }, mode === 'signup' ? 
        'アカウントを作成して、お気に入りや価格アラートを利用しましょう' :
        'アカウントにログインしてください'
      )
    ]),

    // エラー/成功メッセージ
    error && e('div', {
      key: 'error',
      style: {
        padding: '12px',
        backgroundColor: '#fee2e2',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '14px',
        color: '#dc2626'
      }
    }, error),

    success && e('div', {
      key: 'success',
      style: {
        padding: '12px',
        backgroundColor: '#d1fae5',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '14px',
        color: '#059669'
      }
    }, success),

    // フォーム
    e('form', {
      key: 'form',
      onSubmit: handleSubmit,
      style: {
        marginBottom: '24px'
      }
    }, [
      // 名前（新規登録時のみ）
      mode === 'signup' && e('div', {
        key: 'name-field',
        style: { marginBottom: '16px' }
      }, [
        e('label', {
          key: 'label',
          style: {
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }
        }, 'お名前'),
        e('input', {
          key: 'input',
          type: 'text',
          value: fullName,
          onChange: (e: any) => setFullName(e.target.value),
          placeholder: '山田 太郎',
          style: {
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.2s'
          },
          onFocus: (e: any) => { e.target.style.borderColor = '#3b82f6'; },
          onBlur: (e: any) => { e.target.style.borderColor = '#d1d5db'; }
        })
      ]),

      // メールアドレス
      e('div', {
        key: 'email-field',
        style: { marginBottom: '16px' }
      }, [
        e('label', {
          key: 'label',
          style: {
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }
        }, 'メールアドレス'),
        e('input', {
          key: 'input',
          type: 'email',
          value: email,
          onChange: (e: any) => setEmail(e.target.value),
          required: true,
          placeholder: 'example@email.com',
          style: {
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.2s'
          },
          onFocus: (e: any) => { e.target.style.borderColor = '#3b82f6'; },
          onBlur: (e: any) => { e.target.style.borderColor = '#d1d5db'; }
        })
      ]),

      // パスワード
      e('div', {
        key: 'password-field',
        style: { marginBottom: '24px' }
      }, [
        e('label', {
          key: 'label',
          style: {
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }
        }, 'パスワード'),
        e('input', {
          key: 'input',
          type: 'password',
          value: password,
          onChange: (e: any) => setPassword(e.target.value),
          required: true,
          placeholder: mode === 'signup' ? '6文字以上' : 'パスワード',
          minLength: mode === 'signup' ? 6 : undefined,
          style: {
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.2s'
          },
          onFocus: (e: any) => { e.target.style.borderColor = '#3b82f6'; },
          onBlur: (e: any) => { e.target.style.borderColor = '#d1d5db'; }
        })
      ]),

      // 送信ボタン
      e('button', {
        key: 'submit',
        type: 'submit',
        disabled: loading,
        style: {
          width: '100%',
          padding: '12px',
          backgroundColor: loading ? '#9ca3af' : '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s'
        },
        onMouseEnter: (e: any) => { 
          if (!loading) e.currentTarget.style.backgroundColor = '#1d4ed8'; 
        },
        onMouseLeave: (e: any) => { 
          if (!loading) e.currentTarget.style.backgroundColor = '#2563eb'; 
        }
      }, loading ? '処理中...' : (mode === 'signup' ? '登録する' : 'ログイン'))
    ]),

    // Googleログイン
    e('div', {
      key: 'social',
      style: {
        marginBottom: '24px'
      }
    }, [
      e('div', {
        key: 'divider',
        style: {
          display: 'flex',
          alignItems: 'center',
          marginBottom: '16px'
        }
      }, [
        e('div', {
          key: 'line1',
          style: {
            flex: 1,
            height: '1px',
            backgroundColor: '#e5e7eb'
          }
        }),
        e('span', {
          key: 'text',
          style: {
            padding: '0 16px',
            fontSize: '14px',
            color: '#6b7280'
          }
        }, 'または'),
        e('div', {
          key: 'line2',
          style: {
            flex: 1,
            height: '1px',
            backgroundColor: '#e5e7eb'
          }
        })
      ]),

      e('button', {
        key: 'google',
        type: 'button',
        onClick: handleGoogleSignIn,
        disabled: loading,
        style: {
          width: '100%',
          padding: '12px',
          backgroundColor: 'white',
          color: '#374151',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '500',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s'
        },
        onMouseEnter: (e: any) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#9ca3af';
          }
        },
        onMouseLeave: (e: any) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#d1d5db';
          }
        }
      }, [
        e('svg', {
          key: 'icon',
          width: '20',
          height: '20',
          viewBox: '0 0 24 24'
        }, [
          e('path', {
            key: 'blue',
            fill: '#4285F4',
            d: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
          }),
          e('path', {
            key: 'green',
            fill: '#34A853',
            d: 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
          }),
          e('path', {
            key: 'yellow',
            fill: '#FBBC05',
            d: 'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
          }),
          e('path', {
            key: 'red',
            fill: '#EA4335',
            d: 'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
          })
        ]),
        e('span', { key: 'text' }, 'Googleでログイン')
      ])
    ]),

    // モード切り替え
    e('div', {
      key: 'toggle',
      style: {
        textAlign: 'center',
        fontSize: '14px',
        color: '#6b7280'
      }
    }, [
      e('span', { key: 'text' }, 
        mode === 'signup' ? 'すでにアカウントをお持ちですか？' : 'アカウントをお持ちでないですか？'
      ),
      e('button', {
        key: 'toggle-btn',
        type: 'button',
        onClick: () => {
          setMode(mode === 'signup' ? 'signin' : 'signup');
          setError('');
          setSuccess('');
        },
        style: {
          marginLeft: '4px',
          color: '#2563eb',
          fontWeight: '500',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textDecoration: 'underline'
        }
      }, mode === 'signup' ? 'ログイン' : '新規登録')
    ])
  ]));
};

export default AuthModal;