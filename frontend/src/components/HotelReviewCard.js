import React from "react";
import { Building2, Star, Check } from "lucide-react";
import "../STYLES/HotelReviewCard.css";

export default function HotelReviewCard({ review }) {
  // Parse rating (e.g. "4.6/5" or "4.6")
  const ratingText = review.rating || "5.0/5";
  const numericRating = parseFloat(ratingText);
  const ratingScore = isNaN(numericRating) ? 5.0 : numericRating;

  // Calculate full and empty stars based on ratingScore
  const renderStars = () => {
    const stars = [];
    const roundedRating = Math.round(ratingScore);
    for (let i = 1; i <= 5; i++) {
      if (i <= roundedRating) {
        stars.push(
          <Star
            key={i}
            size={14}
            className="hotel-card-star-icon"
            fill="#f59e0b"
            stroke="#f59e0b"
          />
        );
      } else {
        stars.push(
          <Star
            key={i}
            size={14}
            className="hotel-card-star-icon"
            fill="transparent"
            stroke="#f59e0b"
          />
        );
      }
    }
    return stars;
  };

  // Generate initials for avatar
  const initials = review.author
    ? review.author
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "TR";

  return (
    <article className="hotel-review-card">
      {/* Red Curved Corner Badge Shape with Hotel Icon */}
      <div className="hotel-card-corner-badge">
        <div className="hotel-card-corner-icon-circle">
          <Building2 size={22} className="hotel-card-corner-icon" />
        </div>
      </div>

      {/* Header Info */}
      <div className="hotel-card-header">
        <span className="hotel-card-type-label">
          {review.type || "HOTEL BOOKING"}
        </span>
        {review.verified !== false && (
          <span className="hotel-card-verified-pill">
            <Check size={11} strokeWidth={3} className="hotel-card-verified-icon" />
            Verified Trip
          </span>
        )}
      </div>

      {/* Rating Area */}
      <div className="hotel-card-rating-row">
        <div className="hotel-card-rating-num">
          {ratingScore.toFixed(1)}<span>/5</span>
        </div>
        <div className="hotel-card-stars">
          {renderStars()}
        </div>
      </div>

      {/* Comment Content */}
      <p className="hotel-card-comment">
        {review.comment}
      </p>

      {/* Footer Info */}
      <div className="hotel-card-footer">
        <div className="hotel-card-avatar">
          {initials}
        </div>
        <div className="hotel-card-author-info">
          <span className="hotel-card-author-name">{review.author}</span>
          <div className="hotel-card-meta-row">
            <span>{review.location || "Verified Guest"}</span>
            <span className="hotel-card-meta-dot">•</span>
            <span>{review.date || "Recent Stay"}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
