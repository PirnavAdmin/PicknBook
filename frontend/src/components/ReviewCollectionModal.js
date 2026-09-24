import React, { useState } from 'react';
import { X, Star, Loader } from 'lucide-react';
import './ReviewCollectionModal.css';

const ReviewCollectionModal = ({ isOpen, onClose, tripData }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      const formData = new FormData();
      // Use user profile data if available, or default
      const userProfileStr = localStorage.getItem('userProfile');
      let name = 'Traveler';
      if (userProfileStr) {
        try {
          const profile = JSON.parse(userProfileStr);
          name = profile.firstName ? `${profile.firstName} ${profile.lastName || ''}` : 'Traveler';
        } catch(err) {}
      }
      
      formData.append('Name', name);
      formData.append('Role', 'Verified Customer');
      formData.append('Rating', rating);
      formData.append('Comment', comment);
      
      if (tripData && tripData.destination) {
        formData.append('Location', tripData.destination);
      }

      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });

      if (!res.ok) {
        throw new Error('Failed to submit review. Please try again.');
      }

      setSuccess(true);
      
      // Store in localStorage that we've reviewed this trip (or just generally dismissed)
      if (tripData && tripData.id) {
        const reviewed = JSON.parse(localStorage.getItem('reviewedTrips') || '[]');
        reviewed.push(tripData.id);
        localStorage.setItem('reviewedTrips', JSON.stringify(reviewed));
      }
      
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    if (tripData && tripData.id) {
      const dismissed = JSON.parse(localStorage.getItem('dismissedReviewTrips') || '[]');
      if (!dismissed.includes(tripData.id)) {
        dismissed.push(tripData.id);
        localStorage.setItem('dismissedReviewTrips', JSON.stringify(dismissed));
      }
    }
    onClose();
  };

  if (success) {
    return (
      <div className="review-modal-overlay">
        <div className="review-modal-content success-state">
          <div className="success-icon-wrap">
            <Star size={40} className="success-star-icon" fill="#f59e0b" color="#f59e0b" />
          </div>
          <h3>Thank You!</h3>
          <p>Your review helps us improve and guides other travelers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="review-modal-overlay">
      <div className="review-modal-content">
        <button type="button" className="review-modal-close" onClick={handleDismiss}>
          <X size={20} />
        </button>
        
        <div className="review-modal-header">
          <h2>How was your trip?</h2>
          <p>We hope you had a great time{tripData?.destination ? ` in ${tripData.destination}` : ''}. We'd love to hear about your experience with Pick&book.</p>
        </div>

        <form onSubmit={handleSubmit} className="review-modal-form">
          <div className="rating-selector">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`star-btn ${(hoverRating || rating) >= star ? 'active' : ''}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              >
                <Star size={32} fill={(hoverRating || rating) >= star ? "#f59e0b" : "transparent"} stroke={(hoverRating || rating) >= star ? "#f59e0b" : "#cbd5e1"} />
              </button>
            ))}
          </div>
          
          <div className="rating-label">
            {rating === 1 && "Terrible"}
            {rating === 2 && "Poor"}
            {rating === 3 && "Average"}
            {rating === 4 && "Very Good"}
            {rating === 5 && "Excellent"}
          </div>

          <div className="form-group">
            <label htmlFor="review-comment">Share your experience (Optional)</label>
            <textarea
              id="review-comment"
              rows={4}
              placeholder="What did you like? What can we improve?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {error && <div className="review-error">{error}</div>}

          <div className="review-modal-actions">
            <button type="button" className="btn-skip" onClick={handleDismiss}>
              Skip for now
            </button>
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader size={18} className="spin-icon spin" /> : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewCollectionModal;
