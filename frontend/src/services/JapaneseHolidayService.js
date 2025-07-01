import { addDays, isWithinInterval, format, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';

class JapaneseHolidayService {
  constructor() {
    // 2024年の日本の祝日
    this.holidays2024 = [
      { date: new Date(2024, 0, 1), name: '元日' },
      { date: new Date(2024, 0, 8), name: '成人の日' },
      { date: new Date(2024, 1, 11), name: '建国記念の日' },
      { date: new Date(2024, 1, 12), name: '振替休日' },
      { date: new Date(2024, 1, 23), name: '天皇誕生日' },
      { date: new Date(2024, 2, 20), name: '春分の日' },
      { date: new Date(2024, 3, 29), name: '昭和の日' },
      { date: new Date(2024, 4, 3), name: '憲法記念日' },
      { date: new Date(2024, 4, 4), name: 'みどりの日' },
      { date: new Date(2024, 4, 5), name: 'こどもの日' },
      { date: new Date(2024, 4, 6), name: '振替休日' },
      { date: new Date(2024, 6, 15), name: '海の日' },
      { date: new Date(2024, 7, 11), name: '山の日' },
      { date: new Date(2024, 7, 12), name: '振替休日' },
      { date: new Date(2024, 8, 16), name: '敬老の日' },
      { date: new Date(2024, 8, 22), name: '秋分の日' },
      { date: new Date(2024, 8, 23), name: '振替休日' },
      { date: new Date(2024, 9, 14), name: 'スポーツの日' },
      { date: new Date(2024, 10, 3), name: '文化の日' },
      { date: new Date(2024, 10, 4), name: '振替休日' },
      { date: new Date(2024, 10, 23), name: '勤労感謝の日' }
    ];

    // 2025年の日本の祝日
    this.holidays2025 = [
      { date: new Date(2025, 0, 1), name: '元日' },
      { date: new Date(2025, 0, 13), name: '成人の日' },
      { date: new Date(2025, 1, 11), name: '建国記念の日' },
      { date: new Date(2025, 1, 23), name: '天皇誕生日' },
      { date: new Date(2025, 1, 24), name: '振替休日' },
      { date: new Date(2025, 2, 20), name: '春分の日' },
      { date: new Date(2025, 3, 29), name: '昭和の日' },
      { date: new Date(2025, 4, 3), name: '憲法記念日' },
      { date: new Date(2025, 4, 4), name: 'みどりの日' },
      { date: new Date(2025, 4, 5), name: 'こどもの日' },
      { date: new Date(2025, 4, 6), name: '振替休日' },
      { date: new Date(2025, 6, 21), name: '海の日' },
      { date: new Date(2025, 7, 11), name: '山の日' },
      { date: new Date(2025, 8, 15), name: '敬老の日' },
      { date: new Date(2025, 8, 23), name: '秋分の日' },
      { date: new Date(2025, 9, 13), name: 'スポーツの日' },
      { date: new Date(2025, 10, 3), name: '文化の日' },
      { date: new Date(2025, 10, 23), name: '勤労感謝の日' },
      { date: new Date(2025, 10, 24), name: '振替休日' }
    ];

    // 特別期間の定義
    this.specialPeriods = {
      goldenWeek: {
        2024: { start: new Date(2024, 3, 27), end: new Date(2024, 4, 6) },
        2025: { start: new Date(2025, 3, 26), end: new Date(2025, 4, 6) }
      },
      obon: {
        2024: { start: new Date(2024, 7, 10), end: new Date(2024, 7, 18) },
        2025: { start: new Date(2025, 7, 9), end: new Date(2025, 7, 17) }
      },
      yearEnd: {
        2024: { start: new Date(2024, 11, 28), end: new Date(2025, 0, 5) },
        2025: { start: new Date(2025, 11, 27), end: new Date(2026, 0, 4) }
      }
    };
  }

  // 指定日が祝日かどうかを判定
  isHoliday(date) {
    const year = date.getFullYear();
    const holidays = year === 2024 ? this.holidays2024 : this.holidays2025;
    
    return holidays.some(holiday => isSameDay(holiday.date, date));
  }

  // 祝日名を取得
  getHolidayName(date) {
    const year = date.getFullYear();
    const holidays = year === 2024 ? this.holidays2024 : this.holidays2025;
    
    const holiday = holidays.find(h => isSameDay(h.date, date));
    return holiday ? holiday.name : null;
  }

  // 特別期間かどうかを判定
  isSpecialPeriod(date) {
    const year = date.getFullYear();
    
    for (const [periodName, years] of Object.entries(this.specialPeriods)) {
      if (years[year]) {
        if (isWithinInterval(date, { start: years[year].start, end: years[year].end })) {
          return {
            isSpecial: true,
            periodName: this.getPeriodDisplayName(periodName),
            priceMultiplier: this.getPriceMultiplier(periodName)
          };
        }
      }
    }
    
    return { isSpecial: false, periodName: null, priceMultiplier: 1.0 };
  }

  // 期間の表示名を取得
  getPeriodDisplayName(periodName) {
    const names = {
      goldenWeek: 'ゴールデンウィーク',
      obon: 'お盆',
      yearEnd: '年末年始'
    };
    return names[periodName] || periodName;
  }

  // 価格倍率を取得
  getPriceMultiplier(periodName) {
    const multipliers = {
      goldenWeek: 2.5,
      obon: 2.0,
      yearEnd: 3.0
    };
    return multipliers[periodName] || 1.5;
  }

  // 週末かどうかを判定
  isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // 日曜日または土曜日
  }

  // 料金計算
  calculatePrice(basePrice, date, options = {}) {
    const {
      includesTax = true,
      taxRate = 0.10,
      earlyBookingDays = 0,
      lastMinuteBooking = false,
      childCount = 0,
      childRate = 0.5
    } = options;

    let price = basePrice;

    // 特別期間の料金調整
    const specialPeriod = this.isSpecialPeriod(date);
    if (specialPeriod.isSpecial) {
      price *= specialPeriod.priceMultiplier;
    } else if (this.isHoliday(date)) {
      price *= 1.5; // 祝日は1.5倍
    } else if (this.isWeekend(date)) {
      price *= 1.2; // 週末は1.2倍
    }

    // 早割
    if (earlyBookingDays >= 60) {
      price *= 0.7; // 60日前予約で30%割引
    } else if (earlyBookingDays >= 30) {
      price *= 0.85; // 30日前予約で15%割引
    } else if (earlyBookingDays >= 14) {
      price *= 0.95; // 14日前予約で5%割引
    }

    // 直前割引
    if (lastMinuteBooking && earlyBookingDays <= 3) {
      price *= 0.8; // 3日前以内の予約で20%割引
    }

    // 子供料金
    const childPrice = price * childRate * childCount;
    const totalPrice = price + childPrice;

    // 税金計算
    const tax = includesTax ? 0 : totalPrice * taxRate;
    const finalPrice = totalPrice + tax;

    return {
      basePrice: Math.round(price),
      childPrice: Math.round(childPrice),
      subtotal: Math.round(totalPrice),
      tax: Math.round(tax),
      total: Math.round(finalPrice),
      specialPeriod: specialPeriod.periodName,
      isHoliday: this.isHoliday(date),
      holidayName: this.getHolidayName(date),
      isWeekend: this.isWeekend(date)
    };
  }

  // ポイント還元計算
  calculatePoints(price, pointRate = 0.01) {
    return Math.floor(price * pointRate);
  }

  // 日付フォーマット
  formatDate(date) {
    return format(date, 'yyyy年M月d日(E)', { locale: ja });
  }

  // カレンダー用の月間データ生成
  getMonthCalendarData(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const specialPeriod = this.isSpecialPeriod(date);
      
      days.push({
        date,
        day,
        isHoliday: this.isHoliday(date),
        holidayName: this.getHolidayName(date),
        isWeekend: this.isWeekend(date),
        isSpecialPeriod: specialPeriod.isSpecial,
        specialPeriodName: specialPeriod.periodName,
        priceMultiplier: specialPeriod.isSpecial ? specialPeriod.priceMultiplier : 
                        this.isHoliday(date) ? 1.5 : 
                        this.isWeekend(date) ? 1.2 : 1.0
      });
    }

    return days;
  }
}

export default new JapaneseHolidayService();