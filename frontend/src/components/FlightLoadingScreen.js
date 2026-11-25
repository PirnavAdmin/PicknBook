import React, { useEffect, useState } from 'react';
import FlightRadar from './FlightRadar';

/**
 * FlightLoadingScreen - Pick&Book Full-Screen Flight Search Loading Screen
 * Locks document scrolling, suppresses header/footer via CSS classes,
 * and renders the full-screen world map flight radar animation.
 */
export default function FlightLoadingScreen({
  sourceCity = '',
  destinationCity = '',
  source = '',
  dest = '',
  progress = null,
  done = false,
  onDone = null,
  customMessage = ''
}) {
  const [internalProgress, setInternalProgress] = useState(10);

  const resolvedSource = source || sourceCity || 'HYD';
  const resolvedDest = dest || destinationCity || 'BOM';

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

  // Smooth simulated progress when progress is not externally provided
  useEffect(() => {
    if (progress !== null && progress !== undefined) return;

    const timer = setInterval(() => {
      setInternalProgress((prev) => {
        if (prev >= 96) return 96;
        const inc = Math.random() * 6 + 2;
        return Math.min(96, prev + inc);
      });
    }, 250);

    return () => clearInterval(timer);
  }, [progress]);

  const activeProgress = progress !== null && progress !== undefined ? progress : internalProgress;

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
        source={resolvedSource}
        dest={resolvedDest}
        sourceCity={sourceCity}
        destinationCity={destinationCity}
        progress={activeProgress}
        done={done}
        onDone={onDone}
        customMessage={customMessage}
      />
    </div>
  );
}
