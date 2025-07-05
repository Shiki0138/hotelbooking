import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import reviewService from '../../services/reviewService';
import './ReviewForm.css';

interface ReviewFormProps {
  hotelId: string;
  userId: string;
  userName: string;
  onSubmit?: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ hotelId, userId, userName, onSubmit }) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) return;

    setIsSubmitting(true);
    
    try {
      reviewService.createReview({
        hotelId,
        userId,
        userName,
        rating,
        comment: comment.trim()
      });

      setRating(5);
      setComment('');
      
      if (onSubmit) {
        onSubmit();
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <h3>{t('review.writeReview')}</h3>
      
      <div className="form-group">
        <label>{t('review.rating')}</label>
        <div className="rating-selector">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`star-btn ${rating >= star ? 'active' : ''}`}
              onClick={() => setRating(star)}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>{t('review.comment')}</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder={t('review.comment')}
          required
        />
      </div>

      <button
        type="submit"
        className="submit-btn"
        disabled={isSubmitting || !comment.trim()}
      >
        {isSubmitting ? t('common.loading') : t('review.submitReview')}
      </button>
    </form>
  );
};

export default ReviewForm;