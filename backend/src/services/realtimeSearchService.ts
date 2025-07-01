import { Server, Socket } from 'socket.io';
import { SearchOptimizationService } from './searchOptimizationService';
import { cache } from './cacheService';
import { AdvancedSearchFilters, SortOptions } from '../types/search';
import { logger } from '../utils/logger';
import { getPrisma } from './databaseService';

interface SearchSession {
  userId?: string;
  socketId: string;
  currentFilters?: AdvancedSearchFilters;
  lastUpdate: Date;
}

export class RealtimeSearchService {
  private io: Server;
  private optimizationService = new SearchOptimizationService();
  private prisma = getPrisma();
  private searchSessions: Map<string, SearchSession> = new Map();
  
  constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
    this.startAvailabilityMonitor();
  }
  
  // Setup Socket.IO event handlers
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected for realtime search: ${socket.id}`);
      
      // Initialize search session
      this.searchSessions.set(socket.id, {
        socketId: socket.id,
        lastUpdate: new Date()
      });
      
      // Handle search filter updates
      socket.on('search:update', async (data) => {
        await this.handleSearchUpdate(socket, data);
      });
      
      // Handle instant filter changes
      socket.on('filter:change', async (data) => {
        await this.handleFilterChange(socket, data);
      });
      
      // Subscribe to price alerts
      socket.on('price:subscribe', async (data) => {
        await this.handlePriceSubscription(socket, data);
      });
      
      // Subscribe to specific hotel updates
      socket.on('hotel:subscribe', async (hotelIds: string[]) => {
        await this.subscribeToHotelUpdates(socket, hotelIds);
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }
  
  // Handle search update with debouncing
  private async handleSearchUpdate(
    socket: Socket,
    data: {
      filters: AdvancedSearchFilters;
      sortOptions: SortOptions;
      page?: number;
      limit?: number;
    }
  ): Promise<void> {
    const session = this.searchSessions.get(socket.id);
    if (!session) return;
    
    try {
      // Update session
      session.currentFilters = data.filters;
      session.lastUpdate = new Date();
      
      // Perform optimized search
      const results = await this.optimizationService.performOptimizedSearch(
        data.filters,
        data.page || 1,
        data.limit || 20
      );
      
      // Emit results
      socket.emit('search:results', {
        results: results.results,
        total: results.total,
        facets: results.facets,
        timestamp: new Date()
      });
      
      // Subscribe to relevant updates
      const hotelIds = results.results.map((h: any) => h.id);
      await this.subscribeToHotelUpdates(socket, hotelIds);
      
    } catch (error) {
      logger.error('Search update error', error);
      socket.emit('search:error', {
        message: '検索中にエラーが発生しました',
        timestamp: new Date()
      });
    }
  }
  
  // Handle instant filter changes (e.g., price slider)
  private async handleFilterChange(
    socket: Socket,
    data: {
      filterType: string;
      filterValue: any;
      currentFilters: AdvancedSearchFilters;
    }
  ): Promise<void> {
    try {
      // Apply filter change
      const updatedFilters = { ...data.currentFilters };
      
      switch (data.filterType) {
        case 'priceRange':
          updatedFilters.priceRange = data.filterValue;
          break;
        case 'amenities':
          updatedFilters.hotelAmenities = data.filterValue;
          break;
        case 'rating':
          updatedFilters.ratings = { 
            ...updatedFilters.ratings, 
            minRating: data.filterValue 
          };
          break;
        default:
          (updatedFilters as any)[data.filterType] = data.filterValue;
      }
      
      // Get quick count estimate
      const countEstimate = await this.getQuickCountEstimate(updatedFilters);
      
      // Emit immediate feedback
      socket.emit('filter:preview', {
        filterType: data.filterType,
        estimatedResults: countEstimate,
        timestamp: new Date()
      });
      
    } catch (error) {
      logger.error('Filter change error', error);
    }
  }
  
  // Subscribe to price updates
  private async handlePriceSubscription(
    socket: Socket,
    data: {
      hotelIds: string[];
      checkIn: Date;
      checkOut: Date;
    }
  ): Promise<void> {
    const room = `price:${data.checkIn}:${data.checkOut}`;
    socket.join(room);
    
    // Send current prices
    const prices = await this.getCurrentPrices(
      data.hotelIds,
      new Date(data.checkIn),
      new Date(data.checkOut)
    );
    
    socket.emit('price:current', prices);
  }
  
  // Subscribe to hotel availability updates
  private async subscribeToHotelUpdates(
    socket: Socket,
    hotelIds: string[]
  ): Promise<void> {
    // Join rooms for each hotel
    hotelIds.forEach(hotelId => {
      socket.join(`hotel:${hotelId}`);
    });
  }
  
  // Monitor availability changes and notify clients
  private startAvailabilityMonitor(): void {
    // Listen for availability updates from the main application
    setInterval(async () => {
      await this.checkForAvailabilityUpdates();
    }, 5000); // Check every 5 seconds
  }
  
  // Check for availability updates
  private async checkForAvailabilityUpdates(): Promise<void> {
    try {
      // Get recent availability changes
      if (!this.prisma) {
        logger.error('Prisma client not initialized');
        return;
      }
      
      const recentChanges = await this.prisma.$queryRaw<any[]>`
        SELECT DISTINCT
          r."hotelId",
          a."roomId",
          a.date,
          a.available,
          a.price,
          a."updatedAt"
        FROM "Availability" a
        INNER JOIN "Room" r ON r.id = a."roomId"
        WHERE a."updatedAt" > NOW() - INTERVAL '10 seconds'
        ORDER BY a."updatedAt" DESC
        LIMIT 100
      `;
      
      // Group by hotel and notify
      const hotelUpdates = new Map<string, any[]>();
      
      recentChanges.forEach(change => {
        if (!hotelUpdates.has(change.hotelId)) {
          hotelUpdates.set(change.hotelId, []);
        }
        hotelUpdates.get(change.hotelId)!.push(change);
      });
      
      // Emit updates to subscribed clients
      hotelUpdates.forEach((updates, hotelId) => {
        this.io.to(`hotel:${hotelId}`).emit('availability:update', {
          hotelId,
          updates,
          timestamp: new Date()
        });
      });
      
      // Check for price drops
      await this.checkForPriceDrops(recentChanges);
      
    } catch (error) {
      logger.error('Availability monitor error', error);
    }
  }
  
  // Check for price drops and notify
  private async checkForPriceDrops(changes: any[]): Promise<void> {
    const priceDrops = [];
    
    for (const change of changes) {
      const cacheKey = `last-price:${change.roomId}:${change.date}`;
      const lastPrice = await cache.get<number>(cacheKey);
      
      if (lastPrice && change.price < lastPrice) {
        const dropPercentage = ((lastPrice - change.price) / lastPrice) * 100;
        
        if (dropPercentage >= 10) { // 10% or more drop
          priceDrops.push({
            hotelId: change.hotelId,
            roomId: change.roomId,
            date: change.date,
            oldPrice: lastPrice,
            newPrice: change.price,
            dropPercentage
          });
        }
      }
      
      // Update cache
      await cache.set(cacheKey, change.price, 86400); // 24 hours
    }
    
    // Notify about significant price drops
    if (priceDrops.length > 0) {
      this.io.emit('price:drops', {
        drops: priceDrops,
        timestamp: new Date()
      });
    }
  }
  
  // Get quick count estimate for filters
  private async getQuickCountEstimate(
    filters: AdvancedSearchFilters
  ): Promise<number> {
    // Use cached count if available
    const cacheKey = `count-estimate:${JSON.stringify(filters)}`;
    const cached = await cache.get<number>(cacheKey);
    
    if (cached !== null) {
      return cached;
    }
    
    // Quick count query
    if (!this.prisma) {
      return 0;
    }
    
    const count = await this.prisma.hotel.count({
      where: {
        ...(filters.city && { city: { contains: filters.city, mode: 'insensitive' } }),
        ...(filters.ratings?.minRating && { rating: { gte: filters.ratings.minRating } }),
        ...(filters.propertyTypes && { propertyType: { in: filters.propertyTypes } }),
        ...(filters.starRatings && { starRating: { in: filters.starRatings } })
      }
    });
    
    await cache.set(cacheKey, count, 60); // 1 minute cache
    
    return count;
  }
  
  // Get current prices for hotels
  private async getCurrentPrices(
    hotelIds: string[],
    checkIn: Date,
    checkOut: Date
  ): Promise<any[]> {
    if (!this.prisma) {
      return [];
    }
    
    const prices = await this.prisma.$queryRaw`
      SELECT 
        r."hotelId",
        MIN(a.price) as "minPrice",
        MAX(a.price) as "maxPrice",
        AVG(a.price) as "avgPrice"
      FROM "Room" r
      INNER JOIN "Availability" a ON a."roomId" = r.id
      WHERE r."hotelId" = ANY(${hotelIds})
        AND a.date >= ${checkIn}
        AND a.date < ${checkOut}
        AND a.available > 0
      GROUP BY r."hotelId"
    ` as any[];
    
    return prices;
  }
  
  // Handle client disconnect
  private handleDisconnect(socket: Socket): void {
    this.searchSessions.delete(socket.id);
    logger.info(`Client disconnected from realtime search: ${socket.id}`);
  }
  
  // Broadcast search trends
  async broadcastSearchTrends(): Promise<void> {
    try {
      if (!this.prisma) {
        logger.error('Prisma client not initialized');
        return;
      }
      
      const trends = await this.prisma.$queryRaw`
        SELECT 
          city,
          COUNT(*) as "searchCount",
          AVG(guests) as "avgGuests"
        FROM "SearchHistory"
        WHERE timestamp > NOW() - INTERVAL '1 hour'
        GROUP BY city
        ORDER BY "searchCount" DESC
        LIMIT 10
      ` as any[];
      
      this.io.emit('trends:update', {
        topDestinations: trends,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to broadcast search trends', error);
    }
  }
}