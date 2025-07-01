import React, { useState, useEffect } from 'react';
import { FaYenSign, FaChild, FaPercent, FaCalendarAlt } from 'react-icons/fa';
import { MdPointOfSale } from 'react-icons/md';
import JapaneseHolidayService from '../../services/JapaneseHolidayService';

const PriceDisplay = ({ 
  basePrice, 
  checkInDate, 
  checkOutDate,
  roomCount = 1,
  adultCount = 2,
  childCount = 0,
  earlyBookingDays = 0,
  lastMinuteBooking = false,
  pointRate = 0.01
}) => {
  const [priceDetails, setPriceDetails] = useState(null);
  const [showTaxIncluded, setShowTaxIncluded] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    calculateTotalPrice();
  }, [basePrice, checkInDate, checkOutDate, roomCount, adultCount, childCount, earlyBookingDays, lastMinuteBooking, showTaxIncluded]);

  const calculateTotalPrice = () => {
    if (!checkInDate || !basePrice) return;

    const nights = checkOutDate ? 
      Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)) : 1;
    
    let totalPrice = 0;
    let nightlyPrices = [];
    let specialPeriods = new Set();
    let holidays = [];

    // 各日の料金を計算
    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(checkInDate);
      currentDate.setDate(currentDate.getDate() + i);
      
      const dayPrice = JapaneseHolidayService.calculatePrice(
        basePrice * roomCount,
        currentDate,
        {
          includesTax: showTaxIncluded,
          earlyBookingDays,
          lastMinuteBooking,
          childCount: childCount * roomCount,
          childRate: 0.5
        }
      );

      nightlyPrices.push({
        date: currentDate,
        price: dayPrice,
        formattedDate: JapaneseHolidayService.formatDate(currentDate)
      });

      totalPrice += dayPrice.total;

      if (dayPrice.specialPeriod) {
        specialPeriods.add(dayPrice.specialPeriod);
      }
      if (dayPrice.isHoliday) {
        holidays.push(dayPrice.holidayName);
      }
    }

    // ポイント計算
    const points = JapaneseHolidayService.calculatePoints(totalPrice, pointRate);

    setPriceDetails({
      nights,
      nightlyPrices,
      totalPrice,
      averagePrice: Math.round(totalPrice / nights),
      points,
      specialPeriods: Array.from(specialPeriods),
      holidays: [...new Set(holidays)],
      discounts: {
        earlyBooking: earlyBookingDays >= 60 ? 30 : earlyBookingDays >= 30 ? 15 : earlyBookingDays >= 14 ? 5 : 0,
        lastMinute: lastMinuteBooking && earlyBookingDays <= 3 ? 20 : 0
      }
    });
  };

  if (!priceDetails) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ja-JP').format(price);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* メイン価格表示 */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-center gap-2">
            <FaYenSign className="text-2xl text-gray-700" />
            <span className="text-3xl font-bold text-gray-900">
              {formatPrice(priceDetails.totalPrice)}
            </span>
            <span className="text-sm text-gray-600">
              ({showTaxIncluded ? '税込' : '税別'})
            </span>
          </div>
          <button
            onClick={() => setShowTaxIncluded(!showTaxIncluded)}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            {showTaxIncluded ? '税別表示' : '税込表示'}
          </button>
        </div>
        
        <div className="text-sm text-gray-600">
          {priceDetails.nights}泊 / {roomCount}部屋 / 大人{adultCount * roomCount}名
          {childCount > 0 && ` / 子供${childCount * roomCount}名`}
        </div>
      </div>

      {/* 特別期間・祝日情報 */}
      {(priceDetails.specialPeriods.length > 0 || priceDetails.holidays.length > 0) && (
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <FaCalendarAlt />
            <span className="text-sm font-semibold">特別料金期間</span>
          </div>
          {priceDetails.specialPeriods.length > 0 && (
            <p className="text-sm text-yellow-700 mt-1">
              {priceDetails.specialPeriods.join('、')}料金が適用されています
            </p>
          )}
          {priceDetails.holidays.length > 0 && (
            <p className="text-sm text-yellow-700 mt-1">
              祝日: {priceDetails.holidays.join('、')}
            </p>
          )}
        </div>
      )}

      {/* 割引情報 */}
      {(priceDetails.discounts.earlyBooking > 0 || priceDetails.discounts.lastMinute > 0) && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <FaPercent />
            <span className="text-sm font-semibold">適用割引</span>
          </div>
          {priceDetails.discounts.earlyBooking > 0 && (
            <p className="text-sm text-green-700 mt-1">
              早期予約割引: {priceDetails.discounts.earlyBooking}%OFF
            </p>
          )}
          {priceDetails.discounts.lastMinute > 0 && (
            <p className="text-sm text-green-700 mt-1">
              直前割引: {priceDetails.discounts.lastMinute}%OFF
            </p>
          )}
        </div>
      )}

      {/* ポイント還元 */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2 text-blue-800">
          <MdPointOfSale />
          <span className="text-sm font-semibold">獲得予定ポイント</span>
        </div>
        <p className="text-sm text-blue-700 mt-1">
          {formatPrice(priceDetails.points)}ポイント
        </p>
      </div>

      {/* 料金内訳 */}
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="w-full text-sm text-blue-600 hover:text-blue-800 underline mb-2"
      >
        {showBreakdown ? '料金内訳を閉じる' : '料金内訳を見る'}
      </button>

      {showBreakdown && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-3">宿泊日別料金</h4>
          <div className="space-y-2">
            {priceDetails.nightlyPrices.map((night, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {night.formattedDate}
                  {night.price.specialPeriod && (
                    <span className="ml-2 text-xs text-yellow-600">
                      ({night.price.specialPeriod})
                    </span>
                  )}
                  {night.price.isHoliday && (
                    <span className="ml-2 text-xs text-red-600">
                      (祝)
                    </span>
                  )}
                  {night.price.isWeekend && !night.price.isHoliday && (
                    <span className="ml-2 text-xs text-blue-600">
                      (週末)
                    </span>
                  )}
                </span>
                <span className="font-medium text-gray-800">
                  ¥{formatPrice(night.price.total)}
                </span>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-gray-300">
              <div className="flex justify-between font-semibold">
                <span className="text-gray-800">合計</span>
                <span className="text-gray-900">¥{formatPrice(priceDetails.totalPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 子供料金案内 */}
      {childCount > 0 && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
          <div className="flex items-center gap-2 text-gray-700">
            <FaChild />
            <span className="text-sm">
              子供料金は大人料金の50%で計算されています
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export { PriceDisplay };
export default PriceDisplay;