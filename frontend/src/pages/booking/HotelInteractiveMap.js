/* eslint-disable */
import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from "@react-google-maps/api";
import "../../STYLES/HotelInteractiveMap.css";

const formatCurrency = (amount) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number(amount) || 0))}`;

export default function HotelInteractiveMap({ hotels = [], onSelectHotel }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [map, setMap] = useState(null);

  // 1. Filter out hotels with invalid or zero coordinates
  const validHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      const lat = Number(hotel.latitude);
      const lng = Number(hotel.longitude);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });
  }, [hotels]);

  const locationGroups = useMemo(() => {
    const groups = new Map();

    validHotels.forEach((hotel) => {
      const position = {
        lat: Number(hotel.latitude),
        lng: Number(hotel.longitude),
      };
      const key = `${position.lat.toFixed(5)},${position.lng.toFixed(5)}`;
      const group = groups.get(key) || { key, position, hotels: [] };
      group.hotels.push(hotel);
      groups.set(key, group);
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      hotels: group.hotels.sort((left, right) => Number(left.price || 0) - Number(right.price || 0)),
    }));
  }, [validHotels]);

  // Load the Google Maps JavaScript API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyDzC0NF0i5wRGpc-hYPBeS-SOOFVTK7ADg",
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

  // Price pins keep the map scannable without count-based cluster bubbles.
  const getPriceMarkerIcon = useCallback((amount, isSelected) => {
    if (!window.google) return null;
    const label = formatCurrency(amount);
    const width = Math.max(70, Math.ceil(label.length * 7.2) + 22);
    const background = isSelected ? "#ff0000" : "#ffffff";
    const foreground = isSelected ? "#ffffff" : "#172033";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="34" viewBox="0 0 ${width} 34"><rect x="1" y="1" width="${width - 2}" height="30" rx="15" fill="${background}" stroke="#ff0000" stroke-width="2"/><text x="${width / 2}" y="21" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="${foreground}">${label}</text></svg>`;

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(width, 34),
      anchor: new window.google.maps.Point(width / 2, 17),
    };
  }, []);

  const renderMarkers = useCallback(() => {
    return locationGroups.map((location) => {
      const lowestPriceHotel = location.hotels[0];
      const isSelected = selectedLocation?.key === location.key;
      return (
        <Marker
          key={location.key}
          position={location.position}
          title={`From ${formatCurrency(lowestPriceHotel.price)} - ${lowestPriceHotel.name}`}
          onClick={() => setSelectedLocation(location)}
          icon={getPriceMarkerIcon(lowestPriceHotel.price, isSelected) || undefined}
          zIndex={isSelected ? 1000 : undefined}
        />
      );
    });
  }, [locationGroups, selectedLocation, getPriceMarkerIcon]);

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
        {renderMarkers()}

        {selectedLocation && (
          <InfoWindow
            position={selectedLocation.position}
            onCloseClick={() => setSelectedLocation(null)}
            options={
              typeof window !== "undefined" && window.google?.maps
                ? {
                    maxWidth: 290,
                    pixelOffset: new window.google.maps.Size(0, -10),
                  }
                : { maxWidth: 290 }
            }
          >
            <div className="hotel-map-location-preview">
              <div className="hotel-map-location-heading">
                <div>
                  <span className="hotel-map-location-eyebrow">Starting from</span>
                  <strong>{formatCurrency(selectedLocation.hotels[0].price)}<small>/night</small></strong>
                </div>
                <span className="hotel-map-location-count">
                  {selectedLocation.hotels.length} {selectedLocation.hotels.length === 1 ? "stay" : "stays"}
                </span>
              </div>
              <div className="hotel-map-location-list">
                {selectedLocation.hotels.slice(0, 4).map((hotel) => (
                  <button
                    type="button"
                    className="hotel-map-location-hotel"
                    key={hotel.id || hotel.hotelId || hotel.name}
                    onClick={() => onSelectHotel(hotel)}
                    aria-label={`View ${hotel.name}`}
                  >
                    {hotel.image ? (
                      <img src={hotel.image} alt="" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
                    ) : (
                      <span className="hotel-map-location-image-placeholder" />
                    )}
                    <span className="hotel-map-location-hotel-name">{hotel.name}</span>
                    <strong>{formatCurrency(hotel.price)}</strong>
                  </button>
                ))}
              </div>
              {selectedLocation.hotels.length > 4 && (
                <p className="hotel-map-location-more">
                  Showing the 4 lowest-priced stays. Compare the full list beside the map.
                </p>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}

