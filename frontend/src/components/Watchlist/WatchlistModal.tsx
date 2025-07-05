import React, { useState } from 'react';
import { Modal } from '../Modal/Modal';
import { Hotel } from '../../types';
import './WatchlistModal.css';

interface WatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotel: Hotel;
  onSave: (watchlistItem: WatchlistItem) => void;
}

export interface WatchlistItem {
  hotelId: string;
  hotelName: string;
  currentPrice: number;
  targetPrice?: number;
  discountRate?: number;
  notificationChannels: NotificationChannel[];
  monitoringPeriod: {
    startDate: string;
    endDate: string;
    daysOfWeek: number[];
  };
  roomThreshold?: number;
  notifyOnAvailability?: boolean;
  icalUrl?: string;
  createdAt: string;
}

export interface NotificationChannel {
  type: 'email' | 'line' | 'sms' | 'push';
  enabled: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: '日' },
  { value: 1, label: '月' },
  { value: 2, label: '火' },
  { value: 3, label: '水' },
  { value: 4, label: '木' },
  { value: 5, label: '金' },
  { value: 6, label: '土' }
];

export const WatchlistModal: React.FC<WatchlistModalProps> = ({
  isOpen,
  onClose,
  hotel,
  onSave
}) => {
  const [priceType, setPriceType] = useState<'target' | 'discount'>('target');
  const [targetPrice, setTargetPrice] = useState('');
  const [discountRate, setDiscountRate] = useState('');
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>([
    { type: 'email', enabled: true },
    { type: 'line', enabled: false },
    { type: 'sms', enabled: false },
    { type: 'push', enabled: false }
  ]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [roomThreshold, setRoomThreshold] = useState('');
  const [notifyOnAvailability, setNotifyOnAvailability] = useState(false);
  const [generateIcal, setGenerateIcal] = useState(false);

  const handleChannelToggle = (type: NotificationChannel['type']) => {
    setNotificationChannels(prev =>
      prev.map(channel =>
        channel.type === type ? { ...channel, enabled: !channel.enabled } : channel
      )
    );
  };

  const handleDayToggle = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const generateIcalUrl = (item: WatchlistItem) => {
    const event = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LastMinuteStay//Watchlist//EN',
      'BEGIN:VEVENT',
      `UID:${item.hotelId}-${Date.now()}@lastminutestay.com`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
      `DTSTART:${item.monitoringPeriod.startDate.replace(/-/g, '')}`,
      `DTEND:${item.monitoringPeriod.endDate.replace(/-/g, '')}`,
      `SUMMARY:価格監視: ${item.hotelName}`,
      `DESCRIPTION:目標価格: ¥${item.targetPrice?.toLocaleString() || '未設定'}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    const blob = new Blob([event], { type: 'text/calendar' });
    return URL.createObjectURL(blob);
  };

  const handleSave = () => {
    const watchlistItem: WatchlistItem = {
      hotelId: hotel.id,
      hotelName: hotel.name,
      currentPrice: hotel.price,
      targetPrice: priceType === 'target' ? parseFloat(targetPrice) : undefined,
      discountRate: priceType === 'discount' ? parseFloat(discountRate) : undefined,
      notificationChannels,
      monitoringPeriod: {
        startDate,
        endDate,
        daysOfWeek: selectedDays.sort((a, b) => a - b)
      },
      roomThreshold: roomThreshold ? parseInt(roomThreshold) : undefined,
      notifyOnAvailability,
      createdAt: new Date().toISOString()
    };

    if (generateIcal) {
      watchlistItem.icalUrl = generateIcalUrl(watchlistItem);
    }

    // Save to localStorage
    const existingWatchlist = JSON.parse(localStorage.getItem('hotelWatchlist') || '[]');
    const updatedWatchlist = [...existingWatchlist, watchlistItem];
    localStorage.setItem('hotelWatchlist', JSON.stringify(updatedWatchlist));

    onSave(watchlistItem);
    onClose();
  };

  const isValid = () => {
    if (priceType === 'target' && (!targetPrice || parseFloat(targetPrice) <= 0)) {
      return false;
    }
    if (priceType === 'discount' && (!discountRate || parseFloat(discountRate) <= 0 || parseFloat(discountRate) > 100)) {
      return false;
    }
    if (!notificationChannels.some(channel => channel.enabled)) {
      return false;
    }
    if (selectedDays.length === 0) {
      return false;
    }
    return true;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="価格ウォッチ設定"
      size="medium"
    >
      <div className="watchlist-modal">
        <div className="hotel-info">
          <h3>{hotel.name}</h3>
          <p className="current-price">現在の価格: ¥{hotel.price.toLocaleString()}</p>
        </div>

        <div className="form-section">
          <h4>価格設定</h4>
          <div className="price-type-selector">
            <label>
              <input
                type="radio"
                value="target"
                checked={priceType === 'target'}
                onChange={(e) => setPriceType(e.target.value as 'target')}
              />
              目標価格
            </label>
            <label>
              <input
                type="radio"
                value="discount"
                checked={priceType === 'discount'}
                onChange={(e) => setPriceType(e.target.value as 'discount')}
              />
              割引率
            </label>
          </div>

          {priceType === 'target' ? (
            <div className="input-group">
              <label>目標価格</label>
              <div className="price-input">
                <span>¥</span>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="例: 10000"
                />
              </div>
            </div>
          ) : (
            <div className="input-group">
              <label>割引率</label>
              <div className="price-input">
                <input
                  type="number"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(e.target.value)}
                  placeholder="例: 20"
                  max="100"
                />
                <span>%</span>
              </div>
            </div>
          )}
        </div>

        <div className="form-section">
          <h4>通知設定</h4>
          <div className="notification-channels">
            {notificationChannels.map(channel => (
              <label key={channel.type} className="channel-option">
                <input
                  type="checkbox"
                  checked={channel.enabled}
                  onChange={() => handleChannelToggle(channel.type)}
                />
                <span>{channel.type === 'email' ? 'メール' :
                       channel.type === 'line' ? 'LINE' :
                       channel.type === 'sms' ? 'SMS' : 
                       'プッシュ通知'}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h4>監視期間</h4>
          <div className="date-inputs">
            <div className="input-group">
              <label>開始日</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="input-group">
              <label>終了日</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>

          <div className="days-selector">
            <label>監視する曜日</label>
            <div className="days-grid">
              {DAYS_OF_WEEK.map(day => (
                <label key={day.value} className="day-option">
                  <input
                    type="checkbox"
                    checked={selectedDays.includes(day.value)}
                    onChange={() => handleDayToggle(day.value)}
                  />
                  <span>{day.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>追加オプション</h4>
          <div className="input-group">
            <label>残室数アラート</label>
            <div className="room-threshold-input">
              <input
                type="number"
                value={roomThreshold}
                onChange={(e) => setRoomThreshold(e.target.value)}
                placeholder="例: 3"
                min="1"
              />
              <span>室以下になったら通知</span>
            </div>
          </div>
          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={notifyOnAvailability}
              onChange={(e) => setNotifyOnAvailability(e.target.checked)}
            />
            <span>満室から空室になったら通知</span>
          </label>
          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={generateIcal}
              onChange={(e) => setGenerateIcal(e.target.checked)}
            />
            <span>カレンダーに追加（iCal形式）</span>
          </label>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="cancel-button">
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid()}
            className="save-button"
          >
            ウォッチリストに追加
          </button>
        </div>
      </div>
    </Modal>
  );
};