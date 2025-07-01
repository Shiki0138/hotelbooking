import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import JapaneseHolidayService from '../../services/JapaneseHolidayService';

const HolidayCalendar = ({ onDateSelect, selectedDates = [], basePrice = 10000 }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState([]);

  useEffect(() => {
    generateCalendarData();
  }, [currentMonth]);

  const generateCalendarData = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthData = JapaneseHolidayService.getMonthCalendarData(year, month);
    setCalendarData(monthData);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateClick = (date) => {
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  const isDateSelected = (date) => {
    return selectedDates.some(selected => 
      selected.toDateString() === date.toDateString()
    );
  };

  const getDayClass = (dayData) => {
    let classes = 'relative p-2 border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors ';
    
    if (dayData.isSpecialPeriod) {
      classes += 'bg-yellow-100 ';
    } else if (dayData.isHoliday) {
      classes += 'bg-red-50 ';
    } else if (dayData.isWeekend) {
      classes += 'bg-blue-50 ';
    }
    
    if (isDateSelected(dayData.date)) {
      classes += 'ring-2 ring-blue-500 ';
    }
    
    return classes;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ja-JP').format(Math.round(price));
  };

  const getWeekDays = () => {
    return ['日', '月', '火', '水', '木', '金', '土'];
  };

  const getMonthGrid = () => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = calendarData.length;
    
    const grid = [];
    let week = [];
    
    // 月初めの空白
    for (let i = 0; i < startingDayOfWeek; i++) {
      week.push(null);
    }
    
    // 日付を追加
    for (let i = 0; i < daysInMonth; i++) {
      week.push(calendarData[i]);
      
      if (week.length === 7) {
        grid.push(week);
        week = [];
      }
    }
    
    // 最後の週の空白を埋める
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      grid.push(week);
    }
    
    return grid;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <FaChevronLeft className="text-gray-600" />
        </button>
        
        <h3 className="text-xl font-bold text-gray-800">
          {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
        </h3>
        
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <FaChevronRight className="text-gray-600" />
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 mb-2">
        {getWeekDays().map((day, index) => (
          <div
            key={index}
            className={`text-center text-sm font-semibold p-2 ${
              index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-1">
        {getMonthGrid().map((week, weekIndex) => (
          week.map((day, dayIndex) => (
            <div
              key={`${weekIndex}-${dayIndex}`}
              className={day ? getDayClass(day) : 'p-2'}
              onClick={() => day && handleDateClick(day.date)}
            >
              {day && (
                <>
                  <div className="text-sm font-medium">{day.day}</div>
                  
                  {day.holidayName && (
                    <div className="text-xs text-red-600 truncate">
                      {day.holidayName}
                    </div>
                  )}
                  
                  {day.specialPeriodName && (
                    <div className="text-xs text-yellow-700 truncate">
                      {day.specialPeriodName}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-600 mt-1">
                    ¥{formatPrice(basePrice * day.priceMultiplier)}
                  </div>
                  
                  {day.priceMultiplier > 1 && (
                    <div className="absolute top-1 right-1 text-xs font-semibold">
                      {day.priceMultiplier === 3.0 && <span className="text-red-600">×3.0</span>}
                      {day.priceMultiplier === 2.5 && <span className="text-orange-600">×2.5</span>}
                      {day.priceMultiplier === 2.0 && <span className="text-yellow-600">×2.0</span>}
                      {day.priceMultiplier === 1.5 && <span className="text-blue-600">×1.5</span>}
                      {day.priceMultiplier === 1.2 && <span className="text-green-600">×1.2</span>}
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        ))}
      </div>

      {/* 凡例 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">料金凡例</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border border-gray-300"></div>
            <span>特別期間 (×2.0〜3.0)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border border-gray-300"></div>
            <span>祝日 (×1.5)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 border border-gray-300"></div>
            <span>週末 (×1.2)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HolidayCalendar;