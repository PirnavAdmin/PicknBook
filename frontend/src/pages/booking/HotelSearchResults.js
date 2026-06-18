import React, { useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  CalendarRange,
  Heart,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toDisplayDate, getDefaultDateString } from "../../utils/apiDateFormat";
import { searchHotels, getOfferDetails } from "../../services/hotelBookingService";
import { buildStayFacts, getHotelVisuals } from "./hotelPresentation";
import "../../STYLES/HotelSearchResults.css";

const HOTEL_COLLECTIONS = [
  { id: "all", label: "All stays" },
  { id: "guest-favourite", label: "Guest favourite" },
  { id: "breakfast", label: "Breakfast" },
  { id: "work-ready", label: "Work-ready" },
  { id: "value", label: "Best value" },
];

function readValue(params, state, key, fallback = "") {
  const queryValue = params.get(key);

  if (typeof queryValue === "string" && queryValue.trim()) {
    return queryValue.trim();
  }

  const stateValue = state?.[key];
  return typeof stateValue === "string" && stateValue.trim() ? stateValue.trim() : fallback;
}

function formatCurrency(value) {
  return `INR ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)}`;
}

function buildPassengerDetailsQuery(hotel, offerId, searchContext) {
  const params = new URLSearchParams();

  const entries = [
    ["offerId", offerId],
    ["hotelId", hotel?.hotelId],
    ["hotelName", hotel?.name],
    ["hotelCity", hotel?.city],
    ["hotelArea", hotel?.area],
    ["hotelAddress", hotel?.address],
    ["hotelRating", hotel?.rating],
    ["hotelTag", hotel?.tag],
    ["hotelAmenities", Array.isArray(hotel?.amenities) ? hotel.amenities.join("|") : ""],
    ["destination", searchContext?.destination],
    ["checkInDate", searchContext?.checkInDate],
    ["checkOutDate", searchContext?.checkOutDate],
    ["adults", searchContext?.adults],
    ["rooms", searchContext?.rooms],
    ["guests", searchContext?.guests],
  ];

  entries.forEach(([key, value]) => {
    const text = String(value ?? "").trim();
    if (text) {
      params.set(key, text);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

export default function HotelSearchResults() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const destination = readValue(searchParams, state, "destination", "Hyderabad");
  const checkInDate = readValue(searchParams, state, "checkInDate", getDefaultDateString(0));
  const checkOutDate = readValue(searchParams, state, "checkOutDate", getDefaultDateString(1));
  const rooms = readValue(searchParams, state, "rooms", "1");
  const adults = readValue(searchParams, state, "adults", "2");
  const guests = readValue(
    searchParams,
    state,
    "guests",
    `${rooms} Room${Number(rooms) > 1 ? "s" : ""}, ${adults} Adult${Number(adults) > 1 ? "s" : ""}`,
  );

  const [sortKey, setSortKey] = useState("recommended");
  const [collectionKey, setCollectionKey] = useState("all");
  const [apiHotels, setApiHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [actionError, setActionError] = useState("");
  const [expandedHotelId, setExpandedHotelId] = useState(null);
  const [bookingOfferId, setBookingOfferId] = useState("");
  const [savedStayIds, setSavedStayIds] = useState([]);

  useEffect(() => {
    let isCurrent = true;

    async function fetchHotelResults() {
      setLoading(true);
      setSearchError("");
      setActionError("");

      try {
        const data = await searchHotels({
          city: destination,
          checkInDate,
          checkOutDate,
          adults: Number(adults) || 2,
          rooms: Number(rooms) || 1,
        });

        if (isCurrent) {
          setApiHotels(data || []);
        }
      } catch (err) {
        if (isCurrent) {
          setSearchError(err.message || "Failed to search hotels. Please try again.");
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    fetchHotelResults();
    return () => {
      isCurrent = false;
    };
  }, [destination, checkInDate, checkOutDate, adults, rooms]);

  const hotels = useMemo(() => {
    return [...apiHotels]
      .map((hotelRecord, index) => {
        const firstOffer = hotelRecord.offers?.[0] || {};
        const basePrice = Number(firstOffer.price || 0);
        const hotelName = hotelRecord.name || "Hotel stay";
        const visuals = getHotelVisuals(`${hotelRecord.hotelId || hotelName}-${destination}-${index}`);
        const rating = Number(hotelRecord.rating || 4.6) || 4.6;
        const reviewCount = 36 + ((index + 1) * 17) % 112;

        return {
          id: hotelRecord.hotelId || `hotel-${String(hotelName).toLowerCase().replace(/\s+/g, "-")}`,
          hotelId: hotelRecord.hotelId,
          name: hotelName,
          city: hotelRecord.cityCode || destination,
          area: hotelRecord.address ? hotelRecord.address.split(",")[0] : "City centre",
          address: hotelRecord.address || destination,
          rating,
          reviewCount,
          tag:
            hotelRecord.tag ||
            (rating >= 4.8 ? "Guest favourite" : rating >= 4.5 ? "Popular with city travelers" : "Value pick"),
          price: basePrice,
          oldPrice: Math.round(basePrice * 1.18),
          amenities: Array.isArray(hotelRecord.amenities) ? hotelRecord.amenities : ["Wi-Fi", "Breakfast", "Room service"],
          note: firstOffer.cancellationPolicy || "Flexible plans available on select rooms.",
          offers: hotelRecord.offers || [],
          image: visuals.cardImage,
          thumbImage: visuals.thumbImage,
          propertyLabel: visuals.propertyLabel,
          highlightLabel: visuals.highlightLabel,
          facts: buildStayFacts(
            { city: hotelRecord.cityCode || destination },
            firstOffer,
            { adults, rooms },
          ),
        };
      })
      .filter((hotelRecord) => {
        if (collectionKey === "all") {
          return true;
        }

        if (collectionKey === "guest-favourite") {
          return hotelRecord.rating >= 4.7;
        }

        if (collectionKey === "breakfast") {
          return hotelRecord.amenities.some((item) => /breakfast/i.test(item));
        }

        if (collectionKey === "work-ready") {
          return hotelRecord.amenities.some((item) => /wi-?fi|desk|workspace/i.test(item));
        }

        if (collectionKey === "value") {
          return hotelRecord.price <= 6000;
        }

        return true;
      })
      .sort((left, right) => {
        if (sortKey === "price") {
          return left.price - right.price;
        }

        if (sortKey === "rating") {
          return right.rating - left.rating;
        }

        return right.rating * 100 - right.price / 100 - (left.rating * 100 - left.price / 100);
      });
  }, [apiHotels, adults, collectionKey, destination, rooms, sortKey]);

  const toggleSavedStay = (hotelId) => {
    setSavedStayIds((current) =>
      current.includes(hotelId) ? current.filter((item) => item !== hotelId) : [...current, hotelId],
    );
  };

  const handleSelectOffer = async (hotel, offer) => {
    setActionError("");
    setBookingOfferId(offer.offerId);

    try {
      const offerDetails = await getOfferDetails(offer.offerId);
      const selectedOffer = {
        ...offer,
        ...offerDetails,
        checkInDate: offerDetails?.checkInDate || offer.checkInDate || checkInDate,
        checkOutDate: offerDetails?.checkOutDate || offer.checkOutDate || checkOutDate,
      };

      const nextState = {
        hotel: {
          hotelId: hotel.hotelId,
          name: hotel.name,
          city: hotel.city,
          area: hotel.area,
          address: hotel.address,
          rating: hotel.rating,
          tag: hotel.tag,
          amenities: hotel.amenities,
        },
        offer: selectedOffer,
        searchContext: {
          destination,
          checkInDate,
          checkOutDate,
          adults,
          rooms,
          guests,
        },
      };

      navigate(
        {
          pathname: "/hotel/passenger-details",
          search: buildPassengerDetailsQuery(hotel, selectedOffer.offerId, nextState.searchContext),
        },
        { state: nextState },
      );
    } catch (err) {
      setActionError(err.message || "Failed to fetch room details. Please try again.");
    } finally {
      setBookingOfferId("");
    }
  };

  const renderLoadingCard = (index) => (
    <article className="hotel-stay-card hotel-stay-card--skeleton" key={`skeleton-${index}`}>
      <div className="hotel-stay-media" />
      <div className="hotel-stay-content">
        <div className="hotel-skeleton hotel-skeleton--line hotel-skeleton--short" />
        <div className="hotel-skeleton hotel-skeleton--line hotel-skeleton--title" />
        <div className="hotel-skeleton hotel-skeleton--line" />
        <div className="hotel-skeleton hotel-skeleton--line hotel-skeleton--tiny" />
        <div className="hotel-skeleton hotel-skeleton--tags">
          <span className="hotel-skeleton hotel-skeleton--pill" />
          <span className="hotel-skeleton hotel-skeleton--pill" />
          <span className="hotel-skeleton hotel-skeleton--pill" />
        </div>
      </div>
    </article>
  );

  return (
    <main className="hotel-discover-page">
      <div className="hotel-discover-shell">
        <section className="hotel-discover-hero">
          <div className="hotel-hero-wallpaper">
            <video
              className="hotel-hero-wallpaper-video"
              autoPlay
              loop
              muted
              playsInline
              poster="/hotel_poster.png"
            >
              <source src="/hotel_bg.mp4" type="video/mp4" />
            </video>
            <div className="hotel-hero-wallpaper-overlay" />
          </div>

          <div className="hotel-discover-copy">
            <span className="hotel-discover-kicker">Hotel booking, reimagined</span>
            <h1>
              <span className="hotel-hero-highlight">Discover city</span> stays that feel easier to compare.
            </h1>
          </div>

          <div className="hotel-discover-searchbar">
            <div className="hotel-discover-searchcell">
              <span>Where</span>
              <strong>{destination}</strong>
            </div>
            <div className="hotel-discover-searchcell">
              <CalendarRange size={16} />
              <div>
                <span>When</span>
                <strong>
                  {toDisplayDate(checkInDate) || "Select"} - {toDisplayDate(checkOutDate) || "dates"}
                </strong>
              </div>
            </div>
            <div className="hotel-discover-searchcell">
              <Users size={16} />
              <div>
                <span>Who</span>
                <strong>{guests}</strong>
              </div>
            </div>
            <button type="button" className="hotel-discover-searchbutton" onClick={() => navigate("/?tab=hotels")}>
              <Search size={17} />
              <span>Modify</span>
            </button>
          </div>

          <div className="hotel-discover-toolbar">
            <div className="hotel-collection-row">
              {HOTEL_COLLECTIONS.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  className={`hotel-collection-chip${collectionKey === collection.id ? " is-active" : ""}`}
                  onClick={() => setCollectionKey(collection.id)}
                >
                  {collection.id === "all" ? <Sparkles size={14} /> : <ShieldCheck size={14} />}
                  <span>{collection.label}</span>
                </button>
              ))}
            </div>

            <label className="hotel-sort-field">
              <span>
                <SlidersHorizontal size={14} />
                Sort
              </span>
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
                <option value="recommended">Recommended</option>
                <option value="price">Lowest price</option>
                <option value="rating">Highest rating</option>
              </select>
            </label>
          </div>
        </section>

        {actionError && <div className="hotel-inline-alert hotel-inline-alert--error">{actionError}</div>}

        <section className="hotel-discover-results">
          <header className="hotel-discover-resultshead">
            <div>
              <span>Hotel results</span>
              <h2>
                {loading ? "Searching live inventory..." : `${hotels.length} stays in ${destination}`}
              </h2>
            </div>
          </header>

          {searchError ? (
            <div className="hotel-state-panel hotel-state-panel--error">
              <h3>We could not load hotels right now.</h3>
              <p>{searchError}</p>
              <button type="button" onClick={() => navigate("/?tab=hotels")}>
                Start a new hotel search
              </button>
            </div>
          ) : loading ? (
            <div className="hotel-stay-grid">
              {Array.from({ length: 6 }).map((_, index) => renderLoadingCard(index))}
            </div>
          ) : hotels.length === 0 ? (
            <div className="hotel-state-panel">
              <h3>No stays matched that combination.</h3>
              <p>Try different dates, fewer filters, or another nearby destination.</p>
              <button type="button" onClick={() => navigate("/?tab=hotels")}>
                Modify your hotel search
              </button>
            </div>
          ) : (
            <div className="hotel-stay-grid">
              {hotels.map((hotel) => (
                <article key={hotel.id} className="hotel-stay-card">
                  <div className="hotel-stay-media">
                    <img src={hotel.image} alt={hotel.name} />
                    <div className="hotel-stay-badges">
                      <span className="hotel-stay-badge">{hotel.tag}</span>
                      <span className="hotel-stay-badge hotel-stay-badge--light">{hotel.highlightLabel}</span>
                    </div>
                    <button
                      type="button"
                      className={`hotel-save-button${savedStayIds.includes(hotel.id) ? " is-active" : ""}`}
                      onClick={() => toggleSavedStay(hotel.id)}
                      aria-label={savedStayIds.includes(hotel.id) ? "Remove saved stay" : "Save stay"}
                    >
                      <Heart size={17} fill={savedStayIds.includes(hotel.id) ? "currentColor" : "none"} />
                    </button>
                  </div>

                  <div className="hotel-stay-content">
                    <div className="hotel-stay-topline">
                      <div>
                        <span className="hotel-stay-label">{hotel.propertyLabel}</span>
                        <h3>{hotel.name}</h3>
                      </div>
                      <div className="hotel-stay-rating">
                        <Star size={14} fill="currentColor" />
                        <strong>{hotel.rating.toFixed(1)}</strong>
                        <span>({hotel.reviewCount})</span>
                      </div>
                    </div>

                    <p className="hotel-stay-address">
                      <MapPin size={15} />
                      <span>
                        {hotel.area}, {hotel.city}
                      </span>
                    </p>

                    <div className="hotel-stay-facts">
                      {hotel.facts.map((fact) => (
                        <span key={fact}>{fact}</span>
                      ))}
                    </div>

                    <div className="hotel-stay-amenities">
                      {hotel.amenities.slice(0, 4).map((amenity) => (
                        <span key={amenity}>{amenity}</span>
                      ))}
                    </div>

                    <p className="hotel-stay-note">{hotel.note}</p>

                    <div className="hotel-stay-footer">
                      <div className="hotel-stay-pricebox">
                        <strong>{formatCurrency(hotel.price)}</strong>
                        <span>
                          night · <s>{formatCurrency(hotel.oldPrice)}</s>
                        </span>
                      </div>

                      <button
                        type="button"
                        className="hotel-stay-toggle"
                        onClick={() => setExpandedHotelId(expandedHotelId === hotel.id ? null : hotel.id)}
                      >
                        {expandedHotelId === hotel.id ? "Hide rooms" : "View rooms"}
                      </button>
                    </div>

                    {expandedHotelId === hotel.id && (
                      <div className="hotel-offers-panel">
                        {hotel.offers.length > 0 ? (
                          hotel.offers.map((offer) => (
                            <div key={offer.offerId} className="hotel-offer-item">
                              <div className="hotel-offer-copy">
                                <span className="hotel-offer-tag">Room option</span>
                                <h4>
                                  {offer.roomCategory ? offer.roomCategory.replace(/_/g, " ") : "Standard room"}
                                </h4>
                                <p>{offer.roomDescription || "Comfortable room for the selected stay."}</p>
                                <div className="hotel-offer-meta">
                                  <span>
                                    <BedDouble size={14} />
                                    {offer.bedType || "Double"} bed
                                  </span>
                                  <span>{offer.cancellationPolicy || "Cancellation policy available"}</span>
                                </div>
                              </div>

                              <div className="hotel-offer-price">
                                <strong>{formatCurrency(offer.price)}</strong>
                                <span>total stay</span>
                                <button
                                  type="button"
                                  onClick={() => handleSelectOffer(hotel, offer)}
                                  disabled={bookingOfferId === offer.offerId}
                                >
                                  {bookingOfferId === offer.offerId ? (
                                    <>
                                      <Loader2 size={14} className="hotel-spin" />
                                      Reserving...
                                    </>
                                  ) : (
                                    "Select stay"
                                  )}
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="hotel-offer-empty">No active room offers were returned for these dates.</div>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
