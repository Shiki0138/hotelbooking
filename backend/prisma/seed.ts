import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create test user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
      phone: '+1234567890'
    }
  });

  console.log('Created test user:', user.email);

  // Create hotels
  const hotels = await Promise.all([
    prisma.hotel.create({
      data: {
        name: 'ヒルトン東京',
        description: '新宿に位置する高級ホテル。ビジネスと観光の両方に最適。',
        address: '〒160-0023 東京都新宿区西新宿6-6-2',
        city: '東京',
        country: '日本',
        latitude: 35.6938,
        longitude: 139.6903,
        rating: 4.5,
        reviewCount: 1250,
        amenities: ['無料Wi-Fi', '駐車場', 'フィットネスセンター', 'レストラン', 'ビジネスセンター'],
        images: ['/images/hotels/hilton-tokyo-1.jpg', '/images/hotels/hilton-tokyo-2.jpg'],
        propertyType: 'hotel',
        starRating: 5,
        tags: ['ビジネス', '高級', '新宿'],
        distanceFromCenter: 2.5
      }
    }),
    prisma.hotel.create({
      data: {
        name: 'パークハイアット東京',
        description: '新宿パークタワーの最上階に位置する最高級ホテル。',
        address: '〒163-1055 東京都新宿区西新宿3-7-1-2',
        city: '東京',
        country: '日本',
        latitude: 35.6851,
        longitude: 139.6904,
        rating: 4.8,
        reviewCount: 890,
        amenities: ['無料Wi-Fi', '駐車場', 'スパ', 'プール', 'レストラン', 'バー'],
        images: ['/images/hotels/park-hyatt-1.jpg', '/images/hotels/park-hyatt-2.jpg'],
        propertyType: 'hotel',
        starRating: 5,
        tags: ['高級', 'ビジネス', '新宿', 'スカイライン'],
        distanceFromCenter: 3.0
      }
    }),
    prisma.hotel.create({
      data: {
        name: 'ホテルグレイスリー新宿',
        description: '歌舞伎町に位置し、観光とエンターテイメントに最適。',
        address: '〒160-8487 東京都新宿区歌舞伎町1-19-1',
        city: '東京',
        country: '日本',
        latitude: 35.6951,
        longitude: 139.7006,
        rating: 4.2,
        reviewCount: 2100,
        amenities: ['無料Wi-Fi', 'レストラン', '24時間フロント', 'コンビニ'],
        images: ['/images/hotels/gracery-1.jpg', '/images/hotels/gracery-2.jpg'],
        propertyType: 'hotel',
        starRating: 4,
        tags: ['観光', '歌舞伎町', 'ゴジラ'],
        distanceFromCenter: 0.5
      }
    })
  ]);

  console.log(`Created ${hotels.length} hotels`);

  // Create rooms for each hotel
  for (const hotel of hotels) {
    const rooms = await Promise.all([
      prisma.room.create({
        data: {
          hotelId: hotel.id,
          type: 'standard',
          name: 'スタンダードルーム',
          description: '快適な滞在を提供する標準的な客室',
          capacity: 2,
          basePrice: 15000,
          amenities: ['エアコン', 'テレビ', '冷蔵庫', 'セーフティボックス'],
          images: ['/images/rooms/standard-1.jpg'],
          totalRooms: 50
        }
      }),
      prisma.room.create({
        data: {
          hotelId: hotel.id,
          type: 'deluxe',
          name: 'デラックスルーム',
          description: 'より広く、豪華な設備を備えた客室',
          capacity: 2,
          basePrice: 25000,
          amenities: ['エアコン', 'テレビ', '冷蔵庫', 'セーフティボックス', 'バスタブ', 'ミニバー'],
          images: ['/images/rooms/deluxe-1.jpg'],
          totalRooms: 30
        }
      }),
      prisma.room.create({
        data: {
          hotelId: hotel.id,
          type: 'suite',
          name: 'スイートルーム',
          description: '最高級の快適さとサービスを提供',
          capacity: 4,
          basePrice: 50000,
          amenities: ['エアコン', 'テレビ', '冷蔵庫', 'セーフティボックス', 'バスタブ', 'ミニバー', 'リビングルーム', 'キッチネット'],
          images: ['/images/rooms/suite-1.jpg'],
          totalRooms: 10
        }
      })
    ]);

    // Create availability for the next 90 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const room of rooms) {
      const availabilities = [];
      for (let i = 0; i < 90; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        
        // Dynamic pricing based on day of week and season
        let priceMultiplier = 1;
        const dayOfWeek = date.getDay();
        
        // Weekend pricing
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          priceMultiplier = 1.3;
        }
        
        // Peak season (July-August, December)
        const month = date.getMonth();
        if (month === 6 || month === 7 || month === 11) {
          priceMultiplier *= 1.2;
        }
        
        availabilities.push({
          roomId: room.id,
          date: date,
          available: Math.floor(Math.random() * room.totalRooms * 0.8) + Math.floor(room.totalRooms * 0.2),
          price: Math.floor(room.basePrice * priceMultiplier)
        });
      }
      
      await prisma.availability.createMany({
        data: availabilities
      });
    }
  }

  console.log('Created rooms and availability data');

  // Create some reviews
  const reviews = await Promise.all(
    hotels.flatMap(hotel => [
      prisma.review.create({
        data: {
          userId: user.id,
          hotelId: hotel.id,
          rating: 5,
          comment: '素晴らしいホテルでした！スタッフの対応も完璧で、また利用したいです。'
        }
      }),
      prisma.review.create({
        data: {
          userId: user.id,
          hotelId: hotel.id,
          rating: 4,
          comment: '立地が良く、清潔で快適でした。朝食がもう少し種類があれば完璧です。'
        }
      })
    ])
  );

  console.log(`Created ${reviews.length} reviews`);

  console.log('Database seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });