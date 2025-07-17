export interface BookingSystem {
  name: string;
  logo: string;
  price: number;
  currency: string;
  availability: boolean;
  deepLink: string;
  features: string[];
}

export interface HotelPriceComparison {
  hotelId: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  bookingSystems: BookingSystem[];
  lastUpdated: Date;
}

// 予約システムのモックデータ生成
const bookingSystems = [
  { name: '楽天トラベル', logo: '🏨', features: ['楽天ポイント付与', '国内最大級の宿泊施設数'] },
  { name: 'じゃらん', logo: '🏯', features: ['Pontaポイント付与', 'お得なクーポン多数'] },
  { name: 'Booking.com', logo: '🌐', features: ['世界最大級', '24時間日本語サポート'] },
  { name: '一休.com', logo: '✨', features: ['高級ホテル特化', 'タイムセール'] },
  { name: 'Expedia', logo: '✈️', features: ['航空券セット割引', '会員限定価格'] },
  { name: 'Hotels.com', logo: '🏢', features: ['10泊で1泊無料', '最低価格保証'] },
  { name: 'Agoda', logo: '🌏', features: ['アジア最強', 'ポイント即時利用可'] }
];

// 価格比較データを取得
export async function getHotelPriceComparison(
  hotelId: string,
  hotelName: string,
  checkIn: string,
  checkOut: string,
  rooms: number = 1,
  adults: number = 2,
  children: number = 0
): Promise<HotelPriceComparison> {
  
  // 実際のAPIコールの代わりにモックデータを生成
  // 本番環境では各予約サイトのAPIを呼び出す
  
  const basePrice = 10000 + Math.random() * 20000; // 10,000〜30,000円のベース価格
  
  // ランダムに3〜5つの予約システムを選択
  const selectedSystems = bookingSystems
    .sort(() => Math.random() - 0.5)
    .slice(0, 3 + Math.floor(Math.random() * 3));
  
  const bookingSystemResults: BookingSystem[] = selectedSystems.map((system, index) => {
    // 価格にランダムな変動を加える（±20%）
    const priceVariation = 0.8 + Math.random() * 0.4;
    const systemPrice = Math.floor(basePrice * priceVariation);
    
    return {
      name: system.name,
      logo: system.logo,
      price: systemPrice,
      currency: 'JPY',
      availability: Math.random() > 0.1, // 90%の確率で空室あり
      deepLink: `https://example.com/${system.name.toLowerCase()}/hotel/${hotelId}`,
      features: system.features
    };
  });
  
  // 価格順にソート（安い順）
  bookingSystemResults.sort((a, b) => a.price - b.price);
  
  return {
    hotelId,
    hotelName,
    checkIn,
    checkOut,
    rooms,
    adults,
    children,
    bookingSystems: bookingSystemResults,
    lastUpdated: new Date()
  };
}

// 複数ホテルの価格比較を一括取得
export async function getMultipleHotelPriceComparisons(
  hotels: Array<{ id: string; name: string }>,
  checkIn: string,
  checkOut: string,
  rooms: number = 1,
  adults: number = 2,
  children: number = 0
): Promise<HotelPriceComparison[]> {
  
  const comparisons = await Promise.all(
    hotels.map(hotel => 
      getHotelPriceComparison(
        hotel.id,
        hotel.name,
        checkIn,
        checkOut,
        rooms,
        adults,
        children
      )
    )
  );
  
  return comparisons;
}

// 最安値の予約システムを取得
export function getCheapestBookingSystem(comparison: HotelPriceComparison): BookingSystem | null {
  const availableSystems = comparison.bookingSystems.filter(system => system.availability);
  if (availableSystems.length === 0) return null;
  
  return availableSystems.reduce((cheapest, current) => 
    current.price < cheapest.price ? current : cheapest
  );
}

// 価格差を計算（最安値と最高値の差）
export function getPriceDifference(comparison: HotelPriceComparison): {
  amount: number;
  percentage: number;
} | null {
  const availableSystems = comparison.bookingSystems.filter(system => system.availability);
  if (availableSystems.length < 2) return null;
  
  const prices = availableSystems.map(system => system.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  return {
    amount: maxPrice - minPrice,
    percentage: Math.round(((maxPrice - minPrice) / minPrice) * 100)
  };
}