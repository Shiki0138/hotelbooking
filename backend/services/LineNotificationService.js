/**
 * LINE Messaging API Integration Service
 * Premium LINE notifications for luxury hotel availability alerts
 */

const axios = require('axios');
const crypto = require('crypto');
const envManager = require('../../production-config/env-manager');

class LineNotificationService {
  constructor() {
    this.channelAccessToken = null;
    this.channelSecret = null;
    this.lineApiUrl = 'https://api.line.me/v2/bot';
    this.lineNotifyUrl = 'https://notify-api.line.me/api/notify';
    this.isInitialized = false;
    this.webhookUrl = null;
  }

  async initialize() {
    try {
      this.channelAccessToken = envManager.get('LINE_CHANNEL_ACCESS_TOKEN');
      this.channelSecret = envManager.get('LINE_CHANNEL_SECRET');
      this.webhookUrl = envManager.get('LINE_WEBHOOK_URL') || 'https://api.hotelbooking.com/webhook/line';

      if (!this.channelAccessToken || !this.channelSecret) {
        throw new Error('LINE API credentials not configured');
      }

      this.isInitialized = true;
      console.log('✅ LINE notification service initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize LINE service:', error);
      throw error;
    }
  }

  async sendLuxuryAvailabilityAlert(data) {
    const {
      lineUserId,
      userName,
      hotelName,
      roomType,
      checkInDate,
      checkOutDate,
      currentPrice,
      discountPercentage,
      urgencyLevel,
      isLuxurySuite,
      bookingUrl
    } = data;

    // Create rich message with Flex Message
    const flexMessage = this.createLuxuryAvailabilityFlexMessage({
      hotelName,
      roomType,
      checkInDate,
      checkOutDate,
      currentPrice,
      discountPercentage,
      urgencyLevel,
      isLuxurySuite,
      bookingUrl
    });

    const message = {
      to: lineUserId,
      messages: [
        {
          type: 'text',
          text: this.generateUrgencyMessage(urgencyLevel, hotelName, discountPercentage)
        },
        flexMessage
      ]
    };

    return await this.sendMessage(message);
  }

  createLuxuryAvailabilityFlexMessage(data) {
    const {
      hotelName,
      roomType,
      checkInDate,
      checkOutDate,
      currentPrice,
      discountPercentage,
      urgencyLevel,
      isLuxurySuite,
      bookingUrl
    } = data;

    const urgencyColor = this.getUrgencyColor(urgencyLevel);
    const urgencyEmoji = this.getUrgencyEmoji(urgencyLevel);
    const luxuryIcon = isLuxurySuite ? '👑' : '🏨';

    return {
      type: 'flex',
      altText: `${urgencyEmoji} ${hotelName} ${roomType} 空室アラート`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: urgencyEmoji,
                  size: 'lg',
                  flex: 0
                },
                {
                  type: 'text',
                  text: '高級客室空室アラート',
                  weight: 'bold',
                  color: '#ffffff',
                  size: 'md',
                  flex: 1,
                  margin: 'md'
                }
              ]
            }
          ],
          backgroundColor: urgencyColor,
          paddingAll: 'lg'
        },
        hero: {
          type: 'image',
          url: `https://cdn.hotelbooking.com/hotels/${hotelName.replace(/\s+/g, '-').toLowerCase()}/hero.jpg`,
          size: 'full',
          aspectRatio: '20:13',
          aspectMode: 'cover',
          action: {
            type: 'uri',
            uri: bookingUrl
          }
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: luxuryIcon,
                  size: 'lg',
                  flex: 0
                },
                {
                  type: 'text',
                  text: hotelName,
                  weight: 'bold',
                  size: 'lg',
                  color: '#333333',
                  flex: 1,
                  margin: 'sm'
                }
              ]
            },
            {
              type: 'text',
              text: roomType,
              size: 'md',
              color: '#666666',
              margin: 'sm'
            },
            {
              type: 'separator',
              margin: 'lg'
            },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              margin: 'lg',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '📅 チェックイン',
                      size: 'sm',
                      color: '#666666',
                      flex: 2
                    },
                    {
                      type: 'text',
                      text: this.formatDate(checkInDate),
                      size: 'sm',
                      color: '#333333',
                      weight: 'bold',
                      flex: 3,
                      align: 'end'
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '📅 チェックアウト',
                      size: 'sm',
                      color: '#666666',
                      flex: 2
                    },
                    {
                      type: 'text',
                      text: this.formatDate(checkOutDate),
                      size: 'sm',
                      color: '#333333',
                      weight: 'bold',
                      flex: 3,
                      align: 'end'
                    }
                  ]
                }
              ]
            },
            {
              type: 'separator',
              margin: 'lg'
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'lg',
              contents: [
                {
                  type: 'text',
                  text: '💰',
                  size: 'lg',
                  flex: 0
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  margin: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: this.formatCurrency(currentPrice),
                      size: 'xl',
                      weight: 'bold',
                      color: '#333333'
                    },
                    {
                      type: 'text',
                      text: '1泊あたり（税込）',
                      size: 'xs',
                      color: '#666666'
                    }
                  ]
                },
                ...(discountPercentage > 0 ? [{
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: `${Math.round(discountPercentage)}% OFF`,
                      size: 'sm',
                      weight: 'bold',
                      color: '#ffffff',
                      align: 'center',
                      backgroundColor: '#ff4444',
                      paddingAll: 'xs',
                      cornerRadius: 'md'
                    }
                  ]
                }] : [])
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'uri',
                label: '今すぐ予約する 🚀',
                uri: bookingUrl
              },
              color: '#ff4444'
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: {
                type: 'uri',
                label: '詳細を見る',
                uri: bookingUrl.replace('/book', '/details')
              }
            }
          ]
        }
      }
    };
  }

  async sendPriceDropAlert(data) {
    const {
      lineUserId,
      hotelName,
      roomType,
      originalPrice,
      newPrice,
      discountPercentage,
      validUntil,
      bookingUrl
    } = data;

    const savings = originalPrice - newPrice;
    const timeLeft = this.calculateTimeLeft(validUntil);

    const flexMessage = {
      type: 'flex',
      altText: `💰 ${hotelName} ${Math.round(discountPercentage)}%OFF 価格下落アラート`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '💰 価格下落アラート',
              weight: 'bold',
              color: '#ffffff',
              size: 'lg'
            }
          ],
          backgroundColor: '#ff6b35',
          paddingAll: 'lg'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: hotelName,
              weight: 'bold',
              size: 'lg',
              color: '#333333'
            },
            {
              type: 'text',
              text: roomType,
              size: 'md',
              color: '#666666'
            },
            {
              type: 'separator',
              margin: 'lg'
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'lg',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '通常価格',
                      size: 'sm',
                      color: '#666666'
                    },
                    {
                      type: 'text',
                      text: this.formatCurrency(originalPrice),
                      size: 'md',
                      color: '#999999',
                      decoration: 'line-through'
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '特価',
                      size: 'sm',
                      color: '#666666'
                    },
                    {
                      type: 'text',
                      text: this.formatCurrency(newPrice),
                      size: 'xl',
                      weight: 'bold',
                      color: '#ff4444'
                    }
                  ]
                }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'lg',
              contents: [
                {
                  type: 'text',
                  text: `${this.formatCurrency(savings)} お得！`,
                  size: 'lg',
                  weight: 'bold',
                  color: '#00aa00',
                  flex: 1
                },
                {
                  type: 'text',
                  text: `${Math.round(discountPercentage)}% OFF`,
                  size: 'md',
                  weight: 'bold',
                  color: '#ffffff',
                  backgroundColor: '#ff4444',
                  paddingAll: 'xs',
                  cornerRadius: 'md',
                  align: 'center'
                }
              ]
            },
            {
              type: 'text',
              text: `⏰ 残り${timeLeft}`,
              size: 'sm',
              color: '#ff4444',
              weight: 'bold',
              margin: 'lg'
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: '今すぐ予約する 🔥',
                uri: bookingUrl
              },
              color: '#ff4444'
            }
          ]
        }
      }
    };

    const message = {
      to: lineUserId,
      messages: [
        {
          type: 'text',
          text: `🔥 ${hotelName}で${Math.round(discountPercentage)}%の大幅値下げが発生しました！\n\n${this.formatCurrency(savings)}もお得に宿泊できるチャンスです。この価格は${timeLeft}限定です！`
        },
        flexMessage
      ]
    };

    return await this.sendMessage(message);
  }

  async sendLastMinuteDeal(data) {
    const {
      lineUserId,
      deals,
      expiresIn,
      totalSavings
    } = data;

    const carouselContents = deals.slice(0, 10).map(deal => ({
      type: 'bubble',
      size: 'micro',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '⚡ ラストミニッツ',
            size: 'sm',
            weight: 'bold',
            color: '#ffffff'
          }
        ],
        backgroundColor: '#ff8c00',
        paddingAll: 'sm'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: deal.hotelName,
            weight: 'bold',
            size: 'sm',
            wrap: true
          },
          {
            type: 'text',
            text: deal.roomType,
            size: 'xs',
            color: '#666666',
            wrap: true
          },
          {
            type: 'text',
            text: this.formatCurrency(deal.price),
            size: 'lg',
            weight: 'bold',
            color: '#ff4444'
          },
          {
            type: 'text',
            text: `${deal.discount}% OFF`,
            size: 'xs',
            color: '#00aa00',
            weight: 'bold'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '予約',
              uri: deal.bookingUrl
            },
            color: '#ff4444'
          }
        ]
      }
    }));

    const message = {
      to: lineUserId,
      messages: [
        {
          type: 'text',
          text: `⏰ ラストミニッツ特価情報！\n\n${deals.length}件の超お得なプランが見つかりました。\n合計${this.formatCurrency(totalSavings)}の節約チャンス！\n\n⚠️ 残り${expiresIn}分で終了します`
        },
        {
          type: 'flex',
          altText: `⚡ ラストミニッツ特価 ${deals.length}件`,
          contents: {
            type: 'carousel',
            contents: carouselContents
          }
        }
      ]
    };

    return await this.sendMessage(message);
  }

  async sendMessage(messageData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await axios.post(
        `${this.lineApiUrl}/message/push`,
        messageData,
        {
          headers: {
            'Authorization': `Bearer ${this.channelAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`📱 LINE message sent successfully to ${messageData.to}`);
      
      return {
        success: true,
        messageId: response.headers['x-line-request-id'],
        timestamp: new Date().toISOString(),
        recipient: messageData.to
      };

    } catch (error) {
      console.error(`❌ Failed to send LINE message:`, error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        code: error.response?.status || 'UNKNOWN',
        timestamp: new Date().toISOString(),
        recipient: messageData.to
      };
    }
  }

  async sendBulkMessages(messages) {
    const results = [];
    
    // LINE API rate limit: 1000 messages per second
    const batchSize = 100;
    const delayMs = 100;
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (message) => {
        try {
          return await this.sendMessage(message);
        } catch (error) {
          return {
            success: false,
            error: error.message,
            message: message
          };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(r => r.value || r.reason));
      
      // Rate limiting delay
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    return results;
  }

  async handleWebhook(signature, body) {
    // Verify webhook signature
    const hash = crypto
      .createHmac('SHA256', this.channelSecret)
      .update(body, 'utf8')
      .digest('base64');

    if (signature !== hash) {
      throw new Error('Invalid signature');
    }

    const data = JSON.parse(body);
    const results = [];

    for (const event of data.events) {
      try {
        const result = await this.handleEvent(event);
        results.push(result);
      } catch (error) {
        console.error('Error handling LINE event:', error);
        results.push({ error: error.message, event });
      }
    }

    return results;
  }

  async handleEvent(event) {
    switch (event.type) {
      case 'message':
        return await this.handleMessageEvent(event);
      case 'follow':
        return await this.handleFollowEvent(event);
      case 'unfollow':
        return await this.handleUnfollowEvent(event);
      case 'postback':
        return await this.handlePostbackEvent(event);
      default:
        return { type: 'ignored', eventType: event.type };
    }
  }

  async handleMessageEvent(event) {
    const userId = event.source.userId;
    const messageText = event.message.text;

    // Simple command handling
    if (messageText === '設定' || messageText === 'setting') {
      const settingsUrl = `https://hotelbooking.com/settings?line_user_id=${userId}`;
      
      const replyMessage = {
        type: 'flex',
        altText: '通知設定',
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '⚙️ 通知設定',
                weight: 'bold',
                size: 'lg'
              },
              {
                type: 'text',
                text: 'お好みの通知設定を行えます',
                size: 'sm',
                color: '#666666',
                margin: 'md'
              }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                style: 'primary',
                action: {
                  type: 'uri',
                  label: '設定画面を開く',
                  uri: settingsUrl
                }
              }
            ]
          }
        }
      };

      return await this.replyMessage(event.replyToken, [replyMessage]);
    }

    return { type: 'message_received', userId, messageText };
  }

  async handleFollowEvent(event) {
    const userId = event.source.userId;
    
    const welcomeMessage = {
      type: 'flex',
      altText: 'Hotel Booking Premium へようこそ！',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🏨 Hotel Booking Premium',
              weight: 'bold',
              size: 'lg'
            },
            {
              type: 'text',
              text: 'ご登録ありがとうございます！',
              size: 'md',
              margin: 'md'
            },
            {
              type: 'text',
              text: '高級ホテルの空室情報や特価情報をいち早くお届けします。',
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'md'
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: '通知設定を行う',
                uri: `https://hotelbooking.com/settings?line_user_id=${userId}`
              }
            }
          ]
        }
      }
    };

    await this.replyMessage(event.replyToken, [welcomeMessage]);
    
    return { type: 'follow', userId };
  }

  async handleUnfollowEvent(event) {
    const userId = event.source.userId;
    // TODO: Update user preferences to disable LINE notifications
    return { type: 'unfollow', userId };
  }

  async replyMessage(replyToken, messages) {
    try {
      const response = await axios.post(
        `${this.lineApiUrl}/message/reply`,
        {
          replyToken,
          messages
        },
        {
          headers: {
            'Authorization': `Bearer ${this.channelAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.headers['x-line-request-id']
      };
    } catch (error) {
      console.error('Failed to reply LINE message:', error.response?.data || error.message);
      throw error;
    }
  }

  // Utility methods
  generateUrgencyMessage(urgencyLevel, hotelName, discountPercentage) {
    const urgencyTexts = {
      10: '🚨 超緊急！',
      9: '🔥 緊急！',
      8: '⚡ 高優先度！',
      7: '📍 重要！',
      6: '📌 お知らせ',
      5: 'ℹ️ 情報',
      4: '📋 通知',
      3: '📢 案内',
      2: '💡 お得情報',
      1: '📰 ニュース'
    };

    const urgencyText = urgencyTexts[urgencyLevel] || urgencyTexts[5];
    const discountText = discountPercentage > 0 ? ` ${Math.round(discountPercentage)}%OFF` : '';
    
    return `${urgencyText} ${hotelName}${discountText} 空室情報をお届けします！`;
  }

  getUrgencyColor(urgencyLevel) {
    if (urgencyLevel >= 9) return '#ff3333';
    if (urgencyLevel >= 7) return '#ff6b35';
    if (urgencyLevel >= 5) return '#ffa500';
    if (urgencyLevel >= 3) return '#3498db';
    return '#95a5a6';
  }

  getUrgencyEmoji(urgencyLevel) {
    if (urgencyLevel >= 9) return '🚨';
    if (urgencyLevel >= 7) return '🔥';
    if (urgencyLevel >= 5) return '⚡';
    if (urgencyLevel >= 3) return '📍';
    return 'ℹ️';
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  }

  calculateTimeLeft(validUntil) {
    const now = new Date();
    const expiry = new Date(validUntil);
    const diffMs = expiry - now;
    
    if (diffMs <= 0) return '終了';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    }
    return `${minutes}分`;
  }

  async healthCheck() {
    try {
      // Test LINE API connectivity with a simple quota check
      const response = await axios.get(
        `${this.lineApiUrl}/message/quota`,
        {
          headers: {
            'Authorization': `Bearer ${this.channelAccessToken}`
          }
        }
      );

      return {
        status: 'healthy',
        quota: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.response?.data || error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
module.exports = new LineNotificationService();