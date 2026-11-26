import React, { useEffect, useState } from 'react';
import FlightRadar from './FlightRadar';

/**
 * FlightLoadingScreen - Pick&Book Full-Screen Flight Search Loading Screen
 * Locks document scrolling, suppresses header/footer via CSS classes,
 * and renders the flight radar animation with top status, central map, and bottom route pill.
 */
export default function FlightLoadingScreen({
  fromCode = '',
  toCode = '',
  fromCity = '',
  toCity = '',
  source = '',
  dest = '',
  sourceCity = '',
  destinationCity = '',
  done = false,
  onDone = null,
  customMessage = ''
}) {
  // Extract IATA codes and cities without hardcoded fallbacks
  const resolvedFromCode = fromCode || (typeof source === 'string' && source.match(/\(([A-Z]{3})\)/i)?.[1]) || (/^[A-Z]{3}$/i.test(source) ? source.toUpperCase() : '');
  const resolvedToCode = toCode || (typeof dest === 'string' && dest.match(/\(([A-Z]{3})\)/i)?.[1]) || (/^[A-Z]{3}$/i.test(dest) ? dest.toUpperCase() : '');
  const resolvedFromCity = fromCity || sourceCity || (source && typeof source === 'string' && source.includes('(') ? source.replace(/\s*\([A-Za-z]{3}\).*/, '').trim() : '');
  const resolvedToCity = toCity || destinationCity || (dest && typeof dest === 'string' && dest.includes('(') ? dest.replace(/\s*\([A-Za-z]{3}\).*/, '').trim() : '');

  // Lock scrolling & suppress navigation header/footer while loading
  useEffect(() => {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;

    htmlEl.classList.add('flight-loader-fullscreen-active');
    bodyEl.classList.add('flight-loader-fullscreen-active');

    return () => {
      htmlEl.classList.remove('flight-loader-fullscreen-active');
      bodyEl.classList.remove('flight-loader-fullscreen-active');
    };
  }, []);

  return (
    <div
      className="flight-loader-fullscreen-wrapper"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 999999,
        overflow: 'hidden',
        backgroundColor: '#fff1f0',
        margin: 0,
        padding: 0
      }}
    >
      <FlightRadar
        fromCode={resolvedFromCode}
        toCode={resolvedToCode}
        fromCity={resolvedFromCity}
        toCity={resolvedToCity}
        source={resolvedFromCode}
        dest={resolvedToCode}
        sourceCity={resolvedFromCity}
        destinationCity={resolvedToCity}
        done={done}
        onDone={onDone}
        customMessage={customMessage}
      />
    </div>
  );
}
