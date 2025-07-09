import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FaQrcode, FaShieldAlt, FaKey, FaCopy } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface TwoFactorStatus {
  enabled: boolean;
  enabledAt: string | null;
  backupCodesRemaining: number;
  lastVerification: string | null;
}

export const TwoFactorSetup: React.FC = () => {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationToken, setVerificationToken] = useState('');
  const [password, setPassword] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  React.useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/2fa/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch status');

      const data = await response.json();
      setStatus(data);
    } catch (error) {
      toast.error('Failed to load 2FA status');
    }
  };

  const generateSecret = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/2fa/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to generate secret');

      const data = await response.json();
      setQrCode(data.qrCode);
      setBackupCodes(data.backupCodes);
      setShowSetup(true);
    } catch (error) {
      toast.error('Failed to generate 2FA secret');
    } finally {
      setLoading(false);
    }
  };

  const enable2FA = async () => {
    if (!verificationToken) {
      toast.error('Please enter verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      if (!response.ok) throw new Error('Invalid verification code');

      toast.success('2FA enabled successfully');
      setShowSetup(false);
      setVerificationToken('');
      fetchStatus();
    } catch (error) {
      toast.error('Failed to enable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) throw new Error('Invalid password');

      toast.success('2FA disabled successfully');
      setShowDisable(false);
      setPassword('');
      fetchStatus();
    } catch (error) {
      toast.error('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const downloadBackupCodes = () => {
    const content = backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lastminutestay-backup-codes.txt';
    a.click();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">2要素認証設定</h1>

      {/* Current Status */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FaShieldAlt className="mr-2" /> セキュリティステータス
            </h2>
            {status?.enabled ? (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                有効
              </span>
            ) : (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                無効
              </span>
            )}
          </div>

          {status && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">2FA状態:</span>
                <span className="font-medium">
                  {status.enabled ? '有効' : '無効'}
                </span>
              </div>
              {status.enabled && status.enabledAt && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">有効化日:</span>
                    <span>{new Date(status.enabledAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">バックアップコード残数:</span>
                    <span>{status.backupCodesRemaining}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-6">
            {status?.enabled ? (
              <Button
                onClick={() => setShowDisable(true)}
                variant="danger"
                className="w-full"
              >
                2FAを無効にする
              </Button>
            ) : (
              <Button
                onClick={generateSecret}
                variant="primary"
                className="w-full"
                disabled={loading}
              >
                2FAを有効にする
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Setup Flow */}
      {showSetup && (
        <Card className="mb-6">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">2FAセットアップ</h3>
            
            {/* Step 1: QR Code */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">ステップ1: QRコードをスキャン</h4>
              <p className="text-sm text-gray-600 mb-4">
                Google AuthenticatorやAuthyなどの認証アプリでQRコードをスキャンしてください。
              </p>
              <div className="flex justify-center mb-4">
                <img src={qrCode} alt="2FA QR Code" className="border p-2 bg-white" />
              </div>
            </div>

            {/* Step 2: Backup Codes */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">ステップ2: バックアップコードを保存</h4>
              <p className="text-sm text-gray-600 mb-4">
                認証アプリにアクセスできない場合に使用できます。安全な場所に保管してください。
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-white rounded px-3 py-2 text-sm font-mono"
                    >
                      <span>{code}</span>
                      <button
                        onClick={() => copyToClipboard(code)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <FaCopy />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                onClick={downloadBackupCodes}
                variant="secondary"
                size="sm"
                className="w-full"
              >
                バックアップコードをダウンロード
              </Button>
            </div>

            {/* Step 3: Verify */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">ステップ3: 認証コードを入力</h4>
              <p className="text-sm text-gray-600 mb-4">
                認証アプリに表示される6桁のコードを入力してください。
              </p>
              <input
                type="text"
                placeholder="000000"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 text-center text-lg font-mono"
                value={verificationToken}
                onChange={(e) => setVerificationToken(e.target.value)}
                maxLength={6}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowSetup(false)}
                variant="secondary"
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                onClick={enable2FA}
                variant="primary"
                className="flex-1"
                disabled={loading || !verificationToken}
              >
                2FAを有効化
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Disable Flow */}
      {showDisable && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">2FAを無効化</h3>
            <p className="text-sm text-gray-600 mb-4">
              セキュリティのため、パスワードの確認が必要です。
            </p>
            <input
              type="password"
              placeholder="パスワード"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 mb-4"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowDisable(false);
                  setPassword('');
                }}
                variant="secondary"
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                onClick={disable2FA}
                variant="danger"
                className="flex-1"
                disabled={loading || !password}
              >
                無効化する
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Info Section */}
      <Card className="mt-6">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FaKey className="mr-2" /> 2要素認証について
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              2要素認証（2FA）は、パスワードに加えて追加の認証要素を使用することで、
              アカウントのセキュリティを大幅に向上させます。
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>ログイン時に認証アプリのコードが必要になります</li>
              <li>決済や重要な変更時に追加認証が求められます</li>
              <li>バックアップコードは緊急時のアクセス用です</li>
              <li>認証アプリを失った場合はサポートにご連絡ください</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};