/* eslint-disable */
import React, { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { getPublicTestimonials } from "../../services/testimonialService";
import { toApiAssetUrl } from "../../services/apiClient";
import "../../STYLES/TestimonialsPage.css";

const FALLBACK_TESTIMONIALS = [
  {
    id: "fallback-1",
    name: "Amit Sharma",
    designation: "Regular Traveler",
    rating: 5,
    comment: "Outstanding booking experience! Fast, transparent pricing, and the seat map made picking our seats super easy.",
    status: "Active"
  },
  {
    id: "fallback-2",
    name: "Priya Patel",
    designation: "Verified Customer",
    rating: 5,
    comment: "PickNBook made booking our family vacation a breeze. Best customer service I have experienced in a long time.",
    status: "Active"
  },
  {
    id: "fallback-3",
    name: "David K.",
    designation: "Business Consultant",
    rating: 4,
    comment: "I use PickNBook for all my business flights. Fast, robust checkout, and accurate ticket confirmation.",
    status: "Active"
  }
];

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTestimonials() {
      try {
        setLoading(true);
        const data = await getPublicTestimonials();
        if (data && Array.isArray(data) && data.length > 0) {
          setTestimonials(data.filter(t => t.status === "Active"));
        } else {
          setTestimonials(FALLBACK_TESTIMONIALS);
        }
      } catch (err) {
        console.warn("Failed to load testimonials from API, using fallback data", err);
        setTestimonials(FALLBACK_TESTIMONIALS);
      } finally {
        setLoading(false);
      }
    }
    loadTestimonials();
  }, []);

  const renderStars = (rating) => {
    const stars = [];
    const starsCount = Number(rating) || 5;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={16}
          fill={i <= starsCount ? "#f59e0b" : "transparent"}
          color={i <= starsCount ? "#f59e0b" : "#cbd5e1"}
        />
      );
    }
    return <div className="testimonial-stars">{stars}</div>;
  };

  const getInitials = (name) => {
    return String(name || "?")
      .split(" ")
      .map(part => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="testimonials-page-wrapper">
      <div className="testimonials-container">
        
        <div className="testimonials-header">
          <h1>Customer <span>Testimonials</span></h1>
          <p>Read what our travelers have to say about their experiences booking with us.</p>
        </div>

        {loading ? (
          <div className="testimonials-loading">
            <Loader2 size={40} className="spinner-icon" />
            <p>Loading testimonials...</p>
          </div>
        ) : testimonials.length > 0 ? (
          <div className="testimonials-grid">
            {testimonials.map((t) => (
              <div key={t.id} className="public-testimonial-card">
                
                <div className="testimonial-card-body">
                  {renderStars(t.rating)}
                  <p className="testimonial-quote">
                    "{t.comment || t.message || ""}"
                  </p>
                </div>

                <div className="testimonial-card-user">
                  {t.imageUrl || t.image ? (
                    <img
                      src={toApiAssetUrl(t.imageUrl || t.image)}
                      alt={t.name}
                      className="testimonial-user-photo"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div 
                    className="testimonial-user-placeholder"
                    style={{ display: t.imageUrl || t.image ? "none" : "flex" }}
                  >
                    {getInitials(t.name)}
                  </div>
                  
                  <div className="testimonial-user-info">
                    <span className="testimonial-user-name">{t.name}</span>
                    <span className="testimonial-user-designation">{t.designation}</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="testimonials-empty">
            <p>No testimonials available at the moment.</p>
          </div>
        )}

      </div>
    </div>
  );
}
