import React from "react";
import FlightHero from "./FlightHero";
import FlightSearchForm from "./FlightSearchForm";
import FeaturedOffersCarousel from "./FeaturedOffersCarousel";
import FlightStats from "./FlightStats";
import AboutFlightBooking from "./AboutFlightBooking";
import FlightRatingsReviews from "./FlightRatingsReviews";

export default function FlightsPage({
  onSearch,
  offers,
  stats,
  reviews,
  initialSearchValues,
}) {
  return (
    <div className="overflow-x-hidden w-full max-w-full bg-slate-50/50">
      {/* ── Hero Search Section [PNB_FLT_057] ── */}
      <section className="relative w-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <FlightHero
            title="Book Flights Smarter. Fly Higher."
            highlightText="Fly Higher."
            subtitle="Compare 100+ domestic & international airlines with real-time seat inventory, zero hidden fees, and instant confirmation."
          />
          <FlightSearchForm onSearch={onSearch} initialValues={initialSearchValues} />
        </div>
      </section>

      {/* ── Main Content Container with standard section spacing ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Featured Offers Carousel [PNB_FLT_059, PNB_FLT_060, PNB_FLT_061] */}
        <FeaturedOffersCarousel offers={offers} onSelectOffer={onSearch} />

        {/* Flight Statistics [PNB_FLT_068, PNB_FLT_069] */}
        <FlightStats stats={stats} />

        {/* Your Flight. Our Priority. [PNB_FLT_066, PNB_FLT_067] */}
        <AboutFlightBooking onSelectRoute={onSearch} />

        {/* Customer Ratings & Reviews [PNB_FLT_070, PNB_FLT_071, PNB_FLT_072] */}
        <FlightRatingsReviews reviews={reviews} />
      </div>
    </div>
  );
}
