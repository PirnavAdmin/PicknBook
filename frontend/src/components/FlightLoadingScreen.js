import React, { useEffect, useState } from 'react';
import FlightRadar from './FlightRadar';

/**
 * FlightLoadingScreen - Pick&Book Flight Search Loading Screen
 * Renders the pixel-perfect FlightRadar component with seamless fallback
 * support for automated progress and airport/city resolution.
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
  const [internalProgress, setInternalProgress] = useState(15);

  const resolvedSource = source || sourceCity || 'HYD';
  const resolvedDest = dest || destinationCity || 'LHR';

  // Smooth simulated progress when progress is not externally driven
  useEffect(() => {
    if (progress !== null && progress !== undefined) return;

    const timer = setInterval(() => {
      setInternalProgress((prev) => {
        if (prev >= 95) return 95;
        const inc = Math.random() * 8 + 3;
        return Math.min(95, prev + inc);
      });
    }, 280);

    return () => clearInterval(timer);
  }, [progress]);

  const activeProgress = progress !== null && progress !== undefined ? progress : internalProgress;

  return (
    <FlightRadar
      source={resolvedSource}
      dest={resolvedDest}
      progress={activeProgress}
      done={done}
      onDone={onDone}
    />
  );
}
