const sgMail = require('@sendgrid/mail');
const { createClient } = require('@supabase/supabase-js');

class NotificationEmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'notifications@hotelbooking.com';
    this.baseUrl = process.env.FRONTEND_URL || 'https://hotelbooking.vercel.app';
    
    this.supabase = createClient(
      process.env.SUPABASE_URL || 'https://demo-project.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-service-key'
    );
  }

  /**
   * Send availability alert email
   */
  async sendAvailabilityAlert(data) {
    try {
      const {
        userEmail,
        userName,
        hotelName,
        checkIn,
        checkOut,
        currentData,
        watchlistId
      } = data;

      // Format dates
      const checkInDate = new Date(checkIn).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const checkOutDate = new Date(checkOut).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      // Create tracking link
      const bookingLink = this.createTrackingLink(watchlistId, 'availability', currentData.hotelUrl);

      // Generate room details HTML
      const roomDetailsHtml = this.generateRoomDetailsHtml(currentData.roomDetails);

      const msg = {
        to: userEmail,
        from: this.fromEmail,
        subject: `🎉 ${hotelName} is now available for your dates!`,
        html: this.getAvailabilityEmailTemplate({
          userName: userName || 'Valued Guest',
          hotelName,
          checkInDate,
          checkOutDate,
          lowestPrice: currentData.lowestPrice,
          availableRoomTypes: currentData.availableRoomTypes,
          roomDetailsHtml,
          hotelImageUrl: currentData.imageUrl,
          bookingLink,
          watchlistLink: `${this.baseUrl}/watchlist`
        })
      };

      await sgMail.send(msg);
      console.log(`[NotificationEmail] Availability alert sent to ${userEmail}`);
      
      // Track email sent
      await this.trackEmailSent(watchlistId, 'availability_alert');
      
      return true;
    } catch (error) {
      console.error('[NotificationEmail] Error sending availability alert:', error);
      return false;
    }
  }

  /**
   * Send discount alert email
   */
  async sendDiscountAlert(data) {
    try {
      const {
        userEmail,
        userName,
        hotelName,
        checkIn,
        checkOut,
        currentData,
        changes,
        watchlistId
      } = data;

      // Format dates
      const checkInDate = new Date(checkIn).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const checkOutDate = new Date(checkOut).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      // Create tracking link
      const bookingLink = this.createTrackingLink(watchlistId, 'discount', currentData.hotelUrl);

      // Generate room details HTML
      const roomDetailsHtml = this.generateRoomDetailsHtml(currentData.roomDetails);

      const msg = {
        to: userEmail,
        from: this.fromEmail,
        subject: `💰 ${changes.priceDropPercentage}% price drop at ${hotelName}!`,
        html: this.getDiscountEmailTemplate({
          userName: userName || 'Valued Guest',
          hotelName,
          checkInDate,
          checkOutDate,
          lowestPrice: currentData.lowestPrice,
          priceDropPercentage: changes.priceDropPercentage,
          roomDetailsHtml,
          hotelImageUrl: currentData.imageUrl,
          bookingLink,
          watchlistLink: `${this.baseUrl}/watchlist`
        })
      };

      await sgMail.send(msg);
      console.log(`[NotificationEmail] Discount alert sent to ${userEmail}`);
      
      // Track email sent
      await this.trackEmailSent(watchlistId, 'discount_alert');
      
      return true;
    } catch (error) {
      console.error('[NotificationEmail] Error sending discount alert:', error);
      return false;
    }
  }

  /**
   * Generate room details HTML
   */
  generateRoomDetailsHtml(roomDetails) {
    if (!roomDetails || roomDetails.length === 0) {
      return '';
    }

    return roomDetails.map(room => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${room.roomName}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          <strong>¥${room.price.toLocaleString()}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${room.availability} left
        </td>
      </tr>
    `).join('');
  }

  /**
   * Create tracking link
   */
  createTrackingLink(watchlistId, type, originalUrl) {
    const trackingId = Buffer.from(`${watchlistId}-${type}-${Date.now()}`).toString('base64');
    return `${this.baseUrl}/api/track/click?id=${trackingId}&url=${encodeURIComponent(originalUrl)}`;
  }

  /**
   * Track email sent
   */
  async trackEmailSent(watchlistId, emailType) {
    try {
      await this.supabase
        .from('watchlist_notifications')
        .insert({
          watchlist_id: watchlistId,
          notification_type: emailType,
          sent_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('[NotificationEmail] Error tracking email:', error);
    }
  }

  /**
   * Availability email template
   */
  getAvailabilityEmailTemplate(data) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hotel Available - ${data.hotelName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #10b981; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Great News! 🎉</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Your watched hotel is now available!</p>
            </td>
          </tr>
          
          <!-- Hotel Image -->
          ${data.hotelImageUrl ? `
          <tr>
            <td style="padding: 0;">
              <img src="${data.hotelImageUrl}" alt="${data.hotelName}" style="width: 100%; height: 300px; object-fit: cover;">
            </td>
          </tr>
          ` : ''}
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
                Hi ${data.userName},
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
                <strong>${data.hotelName}</strong> is now available for your travel dates!
              </p>
              
              <!-- Booking Details -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px;">Booking Details</h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 5px 0; color: #6b7280;">Check-in:</td>
                    <td style="padding: 5px 0; color: #111827; text-align: right;"><strong>${data.checkInDate}</strong></td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #6b7280;">Check-out:</td>
                    <td style="padding: 5px 0; color: #111827; text-align: right;"><strong>${data.checkOutDate}</strong></td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #6b7280;">Starting from:</td>
                    <td style="padding: 5px 0; color: #10b981; text-align: right; font-size: 20px;"><strong>¥${data.lowestPrice?.toLocaleString() || 'N/A'}</strong></td>
                  </tr>
                </table>
              </div>
              
              <!-- Available Rooms -->
              ${data.roomDetailsHtml ? `
              <div style="margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px;">Available Rooms</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #f9fafb;">
                      <th style="padding: 12px; text-align: left; color: #6b7280; font-weight: 600;">Room Type</th>
                      <th style="padding: 12px; text-align: right; color: #6b7280; font-weight: 600;">Price</th>
                      <th style="padding: 12px; text-align: center; color: #6b7280; font-weight: 600;">Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.roomDetailsHtml}
                  </tbody>
                </table>
              </div>
              ` : ''}
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.bookingLink}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">Book Now</a>
              </div>
              
              <p style="margin: 20px 0; font-size: 14px; color: #6b7280; text-align: center;">
                Rooms are limited and may sell out quickly. Book now to secure your stay!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">
                Manage your watchlist preferences
              </p>
              <a href="${data.watchlistLink}" style="color: #10b981; text-decoration: none; font-size: 14px;">View Watchlist</a>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">
                You received this email because you added this hotel to your watchlist.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Discount email template
   */
  getDiscountEmailTemplate(data) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Price Drop - ${data.hotelName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #ef4444; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 36px;">💰 ${data.priceDropPercentage}% OFF!</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Price dropped for your watched hotel!</p>
            </td>
          </tr>
          
          <!-- Hotel Image -->
          ${data.hotelImageUrl ? `
          <tr>
            <td style="padding: 0;">
              <img src="${data.hotelImageUrl}" alt="${data.hotelName}" style="width: 100%; height: 300px; object-fit: cover;">
            </td>
          </tr>
          ` : ''}
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
                Hi ${data.userName},
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
                Great news! The price for <strong>${data.hotelName}</strong> has dropped by <span style="color: #ef4444; font-weight: bold;">${data.priceDropPercentage}%</span> for your selected dates!
              </p>
              
              <!-- Booking Details -->
              <div style="background-color: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #991b1b; font-size: 18px;">🔥 Limited Time Offer</h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 5px 0; color: #6b7280;">Check-in:</td>
                    <td style="padding: 5px 0; color: #111827; text-align: right;"><strong>${data.checkInDate}</strong></td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #6b7280;">Check-out:</td>
                    <td style="padding: 5px 0; color: #111827; text-align: right;"><strong>${data.checkOutDate}</strong></td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0 5px 0; color: #6b7280;">New price from:</td>
                    <td style="padding: 10px 0 5px 0; color: #ef4444; text-align: right; font-size: 24px;"><strong>¥${data.lowestPrice?.toLocaleString() || 'N/A'}</strong></td>
                  </tr>
                </table>
              </div>
              
              <!-- Available Rooms -->
              ${data.roomDetailsHtml ? `
              <div style="margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px;">Discounted Rooms</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #f9fafb;">
                      <th style="padding: 12px; text-align: left; color: #6b7280; font-weight: 600;">Room Type</th>
                      <th style="padding: 12px; text-align: right; color: #6b7280; font-weight: 600;">Price</th>
                      <th style="padding: 12px; text-align: center; color: #6b7280; font-weight: 600;">Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.roomDetailsHtml}
                  </tbody>
                </table>
              </div>
              ` : ''}
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.bookingLink}" style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">Book Now & Save</a>
              </div>
              
              <p style="margin: 20px 0; font-size: 14px; color: #6b7280; text-align: center;">
                ⏰ This special price may not last long. Book now to lock in your savings!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">
                Manage your price alerts
              </p>
              <a href="${data.watchlistLink}" style="color: #ef4444; text-decoration: none; font-size: 14px;">View Watchlist</a>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">
                You received this email because you're watching this hotel for price drops.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}

module.exports = new NotificationEmailService();