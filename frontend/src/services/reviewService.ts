import { Review, ReviewStats } from '../types/review.types';

const REVIEWS_STORAGE_KEY = 'hotel_reviews';

class ReviewService {
  private getReviews(): Review[] {
    const stored = localStorage.getItem(REVIEWS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private saveReviews(reviews: Review[]): void {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
  }

  createReview(review: Omit<Review, 'id' | 'createdAt'>): Review {
    const newReview: Review = {
      ...review,
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };

    const reviews = this.getReviews();
    reviews.push(newReview);
    this.saveReviews(reviews);

    return newReview;
  }

  getReviewsByHotel(hotelId: string): Review[] {
    const reviews = this.getReviews();
    return reviews
      .filter(review => review.hotelId === hotelId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getReviewStats(hotelId: string): ReviewStats {
    const reviews = this.getReviewsByHotel(hotelId);
    
    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    reviews.forEach(review => {
      totalRating += review.rating;
      ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
    });

    return {
      averageRating: totalRating / reviews.length,
      totalReviews: reviews.length,
      ratingDistribution
    };
  }

  updateReview(reviewId: string, updates: Partial<Review>): Review | null {
    const reviews = this.getReviews();
    const index = reviews.findIndex(r => r.id === reviewId);
    
    if (index === -1) return null;

    reviews[index] = {
      ...reviews[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.saveReviews(reviews);
    return reviews[index];
  }

  deleteReview(reviewId: string): boolean {
    const reviews = this.getReviews();
    const filtered = reviews.filter(r => r.id !== reviewId);
    
    if (filtered.length === reviews.length) return false;
    
    this.saveReviews(filtered);
    return true;
  }

  getUserReviews(userId: string): Review[] {
    const reviews = this.getReviews();
    return reviews
      .filter(review => review.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export default new ReviewService();