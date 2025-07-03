import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface BookingFormData {
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  specialRequests?: string;
}

interface BookingFormProps {
  hotelId: string;
  hotelName: string;
  pricePerNight: number;
}

const BookingForm: React.FC<BookingFormProps> = ({ hotelId, hotelName, pricePerNight }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<BookingFormData>({
    checkIn: '',
    checkOut: '',
    guests: 1,
    rooms: 1,
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    specialRequests: '',
  });
  const [errors, setErrors] = useState<Partial<BookingFormData>>({});

  const calculateNights = () => {
    if (formData.checkIn && formData.checkOut) {
      const checkIn = new Date(formData.checkIn);
      const checkOut = new Date(formData.checkOut);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      return nights > 0 ? nights : 0;
    }
    return 0;
  };

  const calculateTotalPrice = () => {
    const nights = calculateNights();
    return nights * pricePerNight * formData.rooms;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'guests' || name === 'rooms' ? parseInt(value) : value,
    }));
  };

  const validateForm = () => {
    const newErrors: Partial<BookingFormData> = {};
    
    if (!formData.checkIn) newErrors.checkIn = 'チェックイン日を選択してください';
    if (!formData.checkOut) newErrors.checkOut = 'チェックアウト日を選択してください';
    if (!formData.guestName) newErrors.guestName = 'お名前を入力してください';
    if (!formData.guestEmail) newErrors.guestEmail = 'メールアドレスを入力してください';
    if (!formData.guestPhone) newErrors.guestPhone = '電話番号を入力してください';
    
    const checkIn = new Date(formData.checkIn);
    const checkOut = new Date(formData.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkIn < today) {
      newErrors.checkIn = 'チェックイン日は今日以降の日付を選択してください';
    }
    
    if (checkOut <= checkIn) {
      newErrors.checkOut = 'チェックアウト日はチェックイン日より後の日付を選択してください';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const bookingData = {
        ...formData,
        hotelId,
        hotelName,
        totalPrice: calculateTotalPrice(),
        nights: calculateNights(),
      };
      
      sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
      navigate('/booking/payment');
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">予約情報入力</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="checkIn" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            チェックイン日 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="checkIn"
            name="checkIn"
            value={formData.checkIn}
            onChange={handleChange}
            min={today}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
          {errors.checkIn && <p className="mt-1 text-sm text-red-600">{errors.checkIn}</p>}
        </div>

        <div>
          <label htmlFor="checkOut" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            チェックアウト日 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="checkOut"
            name="checkOut"
            value={formData.checkOut}
            onChange={handleChange}
            min={formData.checkIn || today}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
          {errors.checkOut && <p className="mt-1 text-sm text-red-600">{errors.checkOut}</p>}
        </div>

        <div>
          <label htmlFor="rooms" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            部屋数
          </label>
          <select
            id="rooms"
            name="rooms"
            value={formData.rooms}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600"
          >
            {[1, 2, 3, 4, 5].map(num => (
              <option key={num} value={num}>{num}部屋</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="guests" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            宿泊人数
          </label>
          <select
            id="guests"
            name="guests"
            value={formData.guests}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
              <option key={num} value={num}>{num}名</option>
            ))}
          </select>
        </div>
      </div>

      <h4 className="text-lg font-medium text-gray-900 dark:text-white mt-6">宿泊者情報</h4>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            お名前 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="guestName"
            name="guestName"
            value={formData.guestName}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
          {errors.guestName && <p className="mt-1 text-sm text-red-600">{errors.guestName}</p>}
        </div>

        <div>
          <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="guestEmail"
            name="guestEmail"
            value={formData.guestEmail}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
          {errors.guestEmail && <p className="mt-1 text-sm text-red-600">{errors.guestEmail}</p>}
        </div>

        <div>
          <label htmlFor="guestPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            電話番号 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            id="guestPhone"
            name="guestPhone"
            value={formData.guestPhone}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
          {errors.guestPhone && <p className="mt-1 text-sm text-red-600">{errors.guestPhone}</p>}
        </div>

        <div>
          <label htmlFor="specialRequests" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            特別なリクエスト（任意）
          </label>
          <textarea
            id="specialRequests"
            name="specialRequests"
            value={formData.specialRequests}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600"
            placeholder="アレルギー、特別な要望など"
          />
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600 dark:text-gray-400">宿泊日数</span>
          <span className="font-medium">{calculateNights()}泊</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600 dark:text-gray-400">1泊あたり</span>
          <span className="font-medium">¥{pricePerNight.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600 dark:text-gray-400">部屋数</span>
          <span className="font-medium">{formData.rooms}部屋</span>
        </div>
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">合計金額</span>
            <span className="text-2xl font-bold text-primary-600">¥{calculateTotalPrice().toLocaleString()}</span>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-primary-600 text-white py-3 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 font-medium text-lg"
      >
        支払い情報入力へ進む
      </button>
    </form>
  );
};

export default BookingForm;