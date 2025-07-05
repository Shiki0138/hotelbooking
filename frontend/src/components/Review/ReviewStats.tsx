import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReviewStats as ReviewStatsType } from '../../types/review.types';
import './ReviewStats.css';

interface ReviewStatsProps {
  stats: ReviewStatsType;
}

const ReviewStats: React.FC<ReviewStatsProps> = ({ stats }) => {
  const { t } = useTranslation();

  return (
    <div className="review-stats">
      <div className="average-rating">
        <div className="rating-number">{stats.averageRating.toFixed(1)}</div>
        <div className="rating-stars">
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className={`star ${i < Math.round(stats.averageRating) ? 'filled' : ''}`}
            >
              ★
            </span>
          ))}
        </div>
        <div className="total-reviews">
          {stats.totalReviews} {t('review.reviewsTitle')}
        </div>
      </div>
      
      <div className="rating-distribution">
        {[5, 4, 3, 2, 1].map((rating) => (
          <div key={rating} className="rating-bar">
            <span className="rating-label">{rating}★</span>
            <div className="bar-container">
              <div
                className="bar-fill"
                style={{
                  width: `${(stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution] / stats.totalReviews) * 100}%`
                }}
              />
            </div>
            <span className="rating-count">
              {stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewStats;