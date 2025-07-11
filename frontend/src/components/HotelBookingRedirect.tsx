import React from 'react';

interface HotelBookingRedirectProps {
  hotelName: string;
  checkinDate: string;
  checkoutDate: string;
  city?: string;
}

export const HotelBookingRedirect: React.FC<HotelBookingRedirectProps> = ({
  hotelName,
  checkinDate,
  checkoutDate,
  city
}) => {
  const generateRakutenSearchUrl = () => {
    // 楽天トラベルのキーワード検索URLを生成
    const baseUrl = 'https://travel.rakuten.co.jp/dsearch/';
    const params = new URLSearchParams();
    
    // 日付パラメータ
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);
    
    params.set('f_nen1', checkin.getFullYear().toString());
    params.set('f_tuki1', (checkin.getMonth() + 1).toString().padStart(2, '0'));
    params.set('f_hi1', checkin.getDate().toString().padStart(2, '0'));
    params.set('f_nen2', checkout.getFullYear().toString());
    params.set('f_tuki2', (checkout.getMonth() + 1).toString().padStart(2, '0'));
    params.set('f_hi2', checkout.getDate().toString().padStart(2, '0'));
    
    // ホテル名で検索
    params.set('f_keyword', hotelName);
    
    // その他のパラメータ
    params.set('f_otona_su', '2'); // 大人2名
    params.set('f_si_ok', '1'); // 検索実行
    
    return `${baseUrl}?${params.toString()}`;
  };

  const handleBooking = () => {
    const url = generateRakutenSearchUrl();
    window.open(url, '_blank');
  };

  return (
    <button
      onClick={handleBooking}
      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
    >
      楽天トラベルで予約
    </button>
  );
};