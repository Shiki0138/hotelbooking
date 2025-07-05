import React from 'react';
import { useTranslation } from 'react-i18next';
import { Review } from '../../types/review.types';
import './ReviewList.css';

interface ReviewListProps {
  reviews: Review[];
}

const ReviewList: React.FC<ReviewListProps> = ({ reviews }) => {
  const { t } = useTranslation();

  if (reviews.length === 0) {
    return (
      <div className="no-reviews">
        <p>{t('review.noReviews')}</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="review-list">
      <h3>{t('review.reviewsTitle')}</h3>
      {reviews.map((review) => (
        <div key={review.id} className="review-item">
          <div className="review-header">
            <span className="reviewer-name">{review.userName}</span>
            <span className="review-date">{formatDate(review.createdAt)}</span>
          </div>
          <div className="review-rating">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={`star ${i < review.rating ? 'filled' : ''}`}>
                ★
              </span>
            ))}
          </div>
          <p className="review-comment">{review.comment}</p>
        </div>
      ))}
    </div>
  );
};

export default ReviewList;