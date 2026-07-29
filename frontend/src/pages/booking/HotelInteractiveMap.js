/* eslint-disable */
import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
  MarkerClusterer,
} from "@react-google-maps/api";

const formatCurrency = (amount) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number(amount) || 0))}`;

export default function HotelInteractiveMap({ hotels = [], onSelectHotel }) {
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [map, setMap] = useState(null);

  // 1. Filter out hotels with invalid or zero coordinates
  const validHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      const lat = Number(hotel.latitude);
      const lng = Number(hotel.longitude);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });
  }, [hotels]);

  // Load the Google Maps JavaScript API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
  });

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // 2. Automatically center and fit the map bounds to all markers
  useEffect(() => {
    if (!map || validHotels.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    validHotels.forEach((hotel) => {
      bounds.extend({
        lat: Number(hotel.latitude),
        lng: Number(hotel.longitude),
      });
    });

    if (validHotels.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, 50); // Add 50px padding around markers
    }
  }, [map, validHotels]);

  // 3. Map display options configuration
  const mapOptions = useMemo(() => {
    if (!isLoaded) return {};
    return {
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      zoomControl: true,
      gestureHandling: "greedy", // allows easy zoom/pan inside containers
      scrollwheel: true,
      keyboardShortcuts: true,
    };
  }, [isLoaded]);

  // 4. Custom marker icon showing a bed/stay shape
  const getMarkerIcon = useCallback(() => {
    if (!window.google) return null;
    return {
      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm3 7.5H9v2H7.5v-5H9v2h3v-2h1.5v3H15v-3H16.5v5H15v-2z",
      fillColor: "#dc1e26", // hotel brand red/rose color
      fillOpacity: 1.0,
      strokeColor: "#ffffff",
      strokeWeight: 1.5,
      scale: 1.5,
      anchor: new window.google.maps.Point(12, 22),
    };
  }, []);

  // 5. Render markers helper
  const renderMarkers = useCallback((clusterer) => {
    return validHotels.map((hotel) => {
      const isSelected = selectedHotel?.hotelId === hotel.hotelId;
      const markerIcon = getMarkerIcon();

      if (markerIcon && isSelected) {
        markerIcon.fillColor = "#8b0000"; // darken marker color when selected
      }

      return (
        <Marker
          key={hotel.hotelId}
          position={{ lat: Number(hotel.latitude), lng: Number(hotel.longitude) }}
          clusterer={clusterer}
          onClick={() => setSelectedHotel(hotel)}
          icon={markerIcon || undefined}
          animation={window.google ? window.google.maps.Animation.DROP : undefined}
        />
      );
    });
  }, [validHotels, selectedHotel, getMarkerIcon]);

  // Render fallbacks for invalid coords, load error, or script loading state
  if (validHotels.length === 0) {
    return (
      <div className="hotel-map-no-coords-container">
        <p>No hotel locations available.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="hotel-map-error-container">
        <p>Failed to load the map. Please try again later.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="hotel-map-loader-container">
        <div className="hotel-map-loader-spinner" />
        <p>Loading interactive map...</p>
      </div>
    );
  }

  return (
    <div className="hotel-interactive-map-container" style={{ width: "100%", height: "100%" }}>
      <GoogleMap
        mapContainerClassName="hotel-google-map"
        mapContainerStyle={{ width: "100%", height: "100%" }}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {validHotels.length > 20 ? (
          <MarkerClusterer>
            {(clusterer) => (
              <>
                {renderMarkers(clusterer)}
              </>
            )}
          </MarkerClusterer>
        ) : (
          renderMarkers(null)
        )}

        {selectedHotel && (
          <InfoWindow
            position={{
              lat: Number(selectedHotel.latitude),
              lng: Number(selectedHotel.longitude),
            }}
            onCloseClick={() => setSelectedHotel(null)}
          >
            <div className="hotel-map-info-window">
              {selectedHotel.image && (
                <img
                  src={selectedHotel.image}
                  alt={selectedHotel.name}
                  className="hotel-map-info-image"
                />
              )}
              <div className="hotel-map-info-content">
                <h4 className="hotel-map-info-title">{selectedHotel.name}</h4>
                <p className="hotel-map-info-address">{selectedHotel.address}</p>
                <div className="hotel-map-info-meta">
                  <span className="hotel-map-info-rating">
                    ★ {Number(selectedHotel.rating || 0).toFixed(1)}
                  </span>
                  <span className="hotel-map-info-price">
                    {formatCurrency(selectedHotel.price || selectedHotel.offers?.[0]?.price || 0)}/night
                  </span>
                </div>
                <button
                  type="button"
                  className="hotel-map-info-button"
                  onClick={() => onSelectHotel(selectedHotel)}
                >
                  View Details
                </button>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}

