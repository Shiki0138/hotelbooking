import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface PaymentFormData {
  cardNumber: string;
  cardHolder: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  billingAddress: string;
  billingZip: string;
}

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [bookingData, setBookingData] = useState<any>(null);
  const [formData, setFormData] = useState<PaymentFormData>({
    cardNumber: '',
    cardHolder: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    billingAddress: '',
    billingZip: '',
  });
  const [errors, setErrors] = useState<Partial<PaymentFormData>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const data = sessionStorage.getItem('bookingData');
    if (!data) {
      navigate('/');
      return;
    }
    setBookingData(JSON.parse(data));
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cardNumber') {
      const formatted = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<PaymentFormData> = {};
    
    if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, '').length !== 16) {
      newErrors.cardNumber = 'カード番号は16桁で入力してください';
    }
    
    if (!formData.cardHolder) newErrors.cardHolder = 'カード名義人を入力してください';
    if (!formData.expiryMonth) newErrors.expiryMonth = '有効期限（月）を選択してください';
    if (!formData.expiryYear) newErrors.expiryYear = '有効期限（年）を選択してください';
    if (!formData.cvv || formData.cvv.length < 3) newErrors.cvv = 'セキュリティコードを入力してください';
    if (!formData.billingAddress) newErrors.billingAddress = '請求先住所を入力してください';
    if (!formData.billingZip) newErrors.billingZip = '郵便番号を入力してください';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      setLoading(true);
      
      const paymentData = {
        ...bookingData,
        payment: {
          ...formData,
          cardNumber: formData.cardNumber.replace(/\s/g, '').slice(-4),
        },
      };
      
      sessionStorage.setItem('paymentData', JSON.stringify(paymentData));
      
      setTimeout(() => {
        navigate('/booking/confirm');
      }, 1000);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);

  if (!bookingData) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">支払い情報入力</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">予約内容</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">ホテル名</span>
              <span>{bookingData.hotelName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">チェックイン</span>
              <span>{new Date(bookingData.checkIn).toLocaleDateString('ja-JP')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">チェックアウト</span>
              <span>{new Date(bookingData.checkOut).toLocaleDateString('ja-JP')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">宿泊日数</span>
              <span>{bookingData.nights}泊</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">部屋数</span>
              <span>{bookingData.rooms}部屋</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-semibold">
                <span>合計金額</span>
                <span className="text-primary-600">¥{bookingData.totalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-6">クレジットカード情報</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                カード番号 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="cardNumber"
                name="cardNumber"
                value={formData.cardNumber}
                onChange={handleChange}
                maxLength={19}
                placeholder="1234 5678 9012 3456"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600"
              />
              {errors.cardNumber && <p className="mt-1 text-sm text-red-600">{errors.cardNumber}</p>}
            </div>

            <div>
              <label htmlFor="cardHolder" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                カード名義人 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="cardHolder"
                name="cardHolder"
                value={formData.cardHolder}
                onChange={handleChange}
                placeholder="TARO YAMADA"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600"
              />
              {errors.cardHolder && <p className="mt-1 text-sm text-red-600">{errors.cardHolder}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="expiryMonth" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  有効期限（月） <span className="text-red-500">*</span>
                </label>
                <select
                  id="expiryMonth"
                  name="expiryMonth"
                  value={formData.expiryMonth}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">選択</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month.toString().padStart(2, '0')}>
                      {month.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
                {errors.expiryMonth && <p className="mt-1 text-sm text-red-600">{errors.expiryMonth}</p>}
              </div>

              <div>
                <label htmlFor="expiryYear" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  有効期限（年） <span className="text-red-500">*</span>
                </label>
                <select
                  id="expiryYear"
                  name="expiryYear"
                  value={formData.expiryYear}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">選択</option>
                  {years.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                {errors.expiryYear && <p className="mt-1 text-sm text-red-600">{errors.expiryYear}</p>}
              </div>

              <div>
                <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  CVV <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="cvv"
                  name="cvv"
                  value={formData.cvv}
                  onChange={handleChange}
                  maxLength={4}
                  placeholder="123"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600"
                />
                {errors.cvv && <p className="mt-1 text-sm text-red-600">{errors.cvv}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="billingAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                請求先住所 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="billingAddress"
                name="billingAddress"
                value={formData.billingAddress}
                onChange={handleChange}
                placeholder="東京都渋谷区..."
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600"
              />
              {errors.billingAddress && <p className="mt-1 text-sm text-red-600">{errors.billingAddress}</p>}
            </div>

            <div>
              <label htmlFor="billingZip" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                郵便番号 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="billingZip"
                name="billingZip"
                value={formData.billingZip}
                onChange={handleChange}
                placeholder="150-0001"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600"
              />
              {errors.billingZip && <p className="mt-1 text-sm text-red-600">{errors.billingZip}</p>}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              戻る
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="bg-primary-600 text-white py-2 px-6 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '処理中...' : '予約内容を確認する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentPage;