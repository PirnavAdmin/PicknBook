import React, { useEffect, useRef, useState, useMemo } from 'react';
import precomputedMapData from '../data/precomputedWorldMap.json';
import { resolveLocation } from '../utils/flightAirports';
import '../STYLES/FlightRadar.css';

/**
 * Project [lon, lat] coordinates into 1000x500 Equirectangular space
 * Formula: d3.geoEquirectangular().scale(1000 / (2 * Math.PI)).translate([500, 250])
 */
function projectPoint([lon, lat]) {
  const x = (lon + 180) * (1000 / 360);
  const y = (90 - lat) * (500 / 180);
  return [x, y];
}

/**
 * Check if two axis-aligned 2D bounding boxes overlap
 */
function boxesOverlap(b1, b2, pad = 2) {
  return !(
    b1.x + b1.w + pad < b2.x ||
    b2.x + b2.w + pad < b1.x ||
    b1.y + b1.h + pad < b2.y ||
    b2.y + b2.h + pad < b1.y
  );
}

/**
 * Cubic ease-in-out function for smooth camera transition
 */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function FlightRadar({
  source = 'HYD',
  dest = 'LHR',
  progress = 0,
  done = false,
  onDone
}) {
  const containerRef = useRef(null);
  const mapSvgRef = useRef(null);
  const planeRef = useRef(null);
  const progressBarRef = useRef(null);

  // Normalise airport / city locations
  const srcLoc = useMemo(() => resolveLocation(source, 'HYD'), [source]);
  const destLoc = useMemo(() => resolveLocation(dest, 'LHR'), [dest]);

  // Projected 2D coordinates on 1000x500 equirectangular map
  const [x0, y0] = useMemo(() => projectPoint(srcLoc.coords), [srcLoc]);
  const [x2, y2] = useMemo(() => projectPoint(destLoc.coords), [destLoc]);

  const isDomestic = useMemo(() => {
    return Boolean(srcLoc.country && destLoc.country && srcLoc.country === destLoc.country);
  }, [srcLoc, destLoc]);

  // State state features if domestic flight
  const [stateFeatures, setStateFeatures] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [highlightDestCountry, setHighlightDestCountry] = useState(false);

  // Destination country from precomputed map
  const destCountry = useMemo(() => {
    if (!destLoc) return null;
    return (
      precomputedMapData.countries.find(
        (c) => c.iso2 && c.iso2.toUpperCase() === destLoc.country.toUpperCase()
      ) ||
      precomputedMapData.countries.find(
        (c) => c.name.toLowerCase() === (destLoc.countryName || '').toLowerCase()
      ) ||
      null
    );
  }, [destLoc]);

  // Domestic initial country bounds
  const initialCountry = useMemo(() => {
    if (!isDomestic) return null;
    return destCountry;
  }, [isDomestic, destCountry]);

  // Calculate Bezier Curve and sample 400 steps
  const { routePathD, samples } = useMemo(() => {
    const D = Math.hypot(x2 - x0, y2 - y0);
    const Mx = (x0 + x2) / 2;
    const My = (y0 + y2) / 2;

    const lift = 0.28 * D;
    const dx = x2 - x0;
    const dy = y2 - y0;
    const nx = -dy / (D || 1);
    const ny = dx / (D || 1);

    // Ensure control point lifts upwards (towards North / smaller Y)
    let cx = Mx + nx * lift;
    let cy = My + ny * lift;
    if (cy > My) {
      cx = Mx - nx * lift;
      cy = My - ny * lift;
    }

    const pathD = `M ${x0.toFixed(1)} ${y0.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;

    // Sample 400 steps along curve
    const STEPS = 400;
    const pts = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const invT = 1 - t;

      const px = invT * invT * x0 + 2 * invT * t * cx + t * t * x2;
      const py = invT * invT * y0 + 2 * invT * t * cy + t * t * y2;

      // Derivative for heading
      const tx = 2 * invT * (cx - x0) + 2 * t * (x2 - cx);
      const ty = 2 * invT * (cy - y0) + 2 * t * (y2 - cy);
      let heading = Math.atan2(ty, tx) * (180 / Math.PI);

      pts.push({ x: px, y: py, heading });
    }

    // Unwrap heading angle to avoid 360-degree spin
    for (let i = 1; i < pts.length; i++) {
      let diff = pts[i].heading - pts[i - 1].heading;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      pts[i].heading = pts[i - 1].heading + diff;
    }

    return { routePathD: pathD, samples: pts };
  }, [x0, y0, x2, y2]);

  // Initial and Final Camera ViewBoxes
  const { initialViewBox, targetViewBox } = useMemo(() => {
    // Default world view
    const defaultVb = { x: 0, y: 20, w: 1000, h: 440 };

    if (!isDomestic) {
      // International flight:
      // Initial: full world view
      // Final: zoom into destination country clamp(min(.6*vw/bboxW, .6*vh/bboxH), 2.2, 7)
      let tgtVb = defaultVb;
      if (destCountry) {
        const bboxW = Math.max(30, destCountry.width);
        const bboxH = Math.max(30, destCountry.height);
        const z = Math.max(2.2, Math.min(7, Math.min((0.6 * 1000) / bboxW, (0.6 * 440) / bboxH)));

        const targetW = 1000 / z;
        const targetH = 440 / z;
        const targetX = Math.max(0, Math.min(1000 - targetW, destCountry.centroid[0] - targetW / 2));
        const targetY = Math.max(20, Math.min(460 - targetH, destCountry.centroid[1] - targetH / 2));

        tgtVb = { x: targetX, y: targetY, w: targetW, h: targetH };
      }
      return { initialViewBox: defaultVb, targetViewBox: tgtVb };
    } else {
      // Domestic flight:
      // Initial: country fitted to 80% of free area
      let initVb = defaultVb;
      if (initialCountry) {
        const padRatio = 0.8;
        const cW = Math.max(30, initialCountry.width);
        const cH = Math.max(30, initialCountry.height);
        const z = Math.min((padRatio * 1000) / cW, (padRatio * 440) / cH);

        const initW = 1000 / z;
        const initH = 440 / z;
        const initX = Math.max(0, Math.min(1000 - initW, initialCountry.centroid[0] - initW / 2));
        const initY = Math.max(20, Math.min(460 - initH, initialCountry.centroid[1] - initH / 2));

        initVb = { x: initX, y: initY, w: initW, h: initH };
      }

      // Final: 2.4x on destination city (max 14)
      const currentZ = 1000 / initVb.w;
      const finalZ = Math.min(14, currentZ * 2.4);
      const finalW = 1000 / finalZ;
      const finalH = 440 / finalZ;
      const finalX = Math.max(0, Math.min(1000 - finalW, x2 - finalW / 2));
      const finalY = Math.max(20, Math.min(460 - finalH, y2 - finalH / 2));

      return {
        initialViewBox: initVb,
        targetViewBox: { x: finalX, y: finalY, w: finalW, h: finalH }
      };
    }
  }, [isDomestic, destCountry, initialCountry, x2, y2]);

  // Load domestic states GeoJSON before animation starts
  useEffect(() => {
    if (!isDomestic || !destLoc.country) return;
    const countryIso = destLoc.country.toUpperCase();
    const statesUrl = `/geo/states/${countryIso}.json`;

    let active = true;
    fetch(statesUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (data.features && Array.isArray(data.features)) {
          // Project state boundaries using same equirectangular formula
          const projectedStates = data.features.map((feat, idx) => {
            const name = feat.properties?.name || `State ${idx + 1}`;
            const coords = feat.geometry?.coordinates;
            let pathStr = '';

            const convertRing = (ring) => {
              return ring
                .map(([lon, lat], i) => {
                  const [px, py] = projectPoint([lon, lat]);
                  return `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
                })
                .join(' ') + ' Z';
            };

            if (feat.geometry?.type === 'Polygon' && coords) {
              pathStr = coords.map(convertRing).join(' ');
            } else if (feat.geometry?.type === 'MultiPolygon' && coords) {
              pathStr = coords.map((poly) => poly.map(convertRing).join(' ')).join(' ');
            }

            return {
              id: `state-${idx}`,
              name,
              d: pathStr
            };
          });
          setStateFeatures(projectedStates);
        }
      })
      .catch(() => {
        // Fallback silently if state geo file not present
      });

    return () => {
      active = false;
    };
  }, [isDomestic, destLoc]);

  // Labels collision detection calculation
  // Country names: #3d2f33, 600, white halo, clamp(6.5px, 0.95*sqrt(area), 13px).
  // Filter by bounding box collision against: top block, bottom chip, source/dest pins (68x66px each), and other labels.
  // Larger countries win. Omit countries too small for their label.
  const placedLabels = useMemo(() => {
    const labels = [];
    const occupiedBoxes = [];

    // 1. Reserved boxes
    // Top block (centered, 14px from top)
    occupiedBoxes.push({ x: 260, y: 14, w: 480, h: 90 });
    // Bottom chip (centered, 18px from bottom)
    occupiedBoxes.push({ x: 330, y: 375, w: 340, h: 50 });
    // Source pin (68x66px each)
    occupiedBoxes.push({ x: x0 - 34, y: y0 - 36, w: 68, h: 66 });
    // Dest pin (68x66px each)
    occupiedBoxes.push({ x: x2 - 34, y: y2 - 36, w: 68, h: 66 });

    // Larger countries win -> Sort by area descending
    const sortedCountries = [...precomputedMapData.countries].sort(
      (a, b) => (b.area || 0) - (a.area || 0)
    );

    for (const c of sortedCountries) {
      const name = c.name;
      const chars = name.length;
      if (!chars || !c.centroid || c.width <= 0 || c.height <= 0) continue;

      // Formula: clamp(6.5px, 0.95*sqrt(area), 13px)
      const rawFont = 0.95 * Math.sqrt(c.area || 0);
      const fontPx = Math.max(6.5, Math.min(13, rawFont));

      const labelW = chars * fontPx * 0.58;
      const labelH = fontPx * 1.2;

      // Omit countries too small for their label
      if (labelW > c.width * 0.88 || labelH > c.height * 0.88) {
        continue;
      }

      const lx = c.centroid[0] - labelW / 2;
      const ly = c.centroid[1] - labelH / 2;

      // Check bounds inside map viewBox (0..1000, 20..460)
      if (lx < 8 || lx + labelW > 992 || ly < 24 || ly + labelH > 456) {
        continue;
      }

      const candidateBox = { x: lx, y: ly, w: labelW, h: labelH };
      const hasCollision = occupiedBoxes.some((b) => boxesOverlap(candidateBox, b, 3));

      if (!hasCollision) {
        occupiedBoxes.push(candidateBox);
        labels.push({
          id: c.id,
          name: c.name,
          x: c.centroid[0],
          y: c.centroid[1],
          fontSize: Math.round(fontPx * 10) / 10
        });
      }
    }

    return labels;
  }, [x0, y0, x2, y2]);

  // Flight Physics & Animation Loop (driven via refs, zero React setState in RAF)
  const animRefs = useRef({
    p: 0,
    v: 0,
    lastTime: null,
    lastChange: performance.now(),
    lastProgress: progress,
    isDone: done,
    zoomStarted: false,
    zoomDone: false,
    zoomStartTime: null
  });

  // Keep progress and done updated in ref without re-triggering the RAF loop
  useEffect(() => {
    if (progress !== animRefs.current.lastProgress) {
      animRefs.current.lastProgress = progress;
      animRefs.current.lastChange = performance.now();
    }
    animRefs.current.isDone = done;
  }, [progress, done]);

  useEffect(() => {
    // Fade in on first frame
    const fadeTimer = requestAnimationFrame(() => {
      setIsLoaded(true);
    });

    let rafId;
    const runId = Math.random();
    animRefs.current.runId = runId;

    // Set initial viewBox on SVG
    if (mapSvgRef.current) {
      mapSvgRef.current.setAttribute(
        'viewBox',
        `${initialViewBox.x} ${initialViewBox.y} ${initialViewBox.w} ${initialViewBox.h}`
      );
    }

    const STEPS = 400;

    const tick = (now) => {
      if (animRefs.current.runId !== runId) return;

      const refs = animRefs.current;
      if (!refs.lastTime) refs.lastTime = now;
      const elapsed = (now - refs.lastTime) / 1000;
      refs.lastTime = now;

      // dt = clamp(elapsed, 0, .05)
      const dt = Math.max(0, Math.min(elapsed, 0.05));

      // ── FLIGHT PHYSICS FORMULA SPECIFIED IN PROMPT ──
      // target = done ? 1 : min(.97, progress + .05*(1 - exp(-(now - lastChange)/1500)))
      // vt = done ? max(.05, (1-p)*1.6) : max(.012, (target-p)*1.2); if (!done && p >= .97) vt = 0
      // vt = min(vt, .5); v += (vt - v)*(1 - exp(-dt/.4)); p = min(1, p + v*dt)

      const normalisedProgress = typeof refs.lastProgress === 'number'
        ? (refs.lastProgress > 1 ? refs.lastProgress / 100 : refs.lastProgress)
        : 0;

      const target = refs.isDone
        ? 1.0
        : Math.min(0.97, normalisedProgress + 0.05 * (1 - Math.exp(-(now - refs.lastChange) / 1500)));

      let vt = refs.isDone
        ? Math.max(0.05, (1.0 - refs.p) * 1.6)
        : Math.max(0.012, (target - refs.p) * 1.2);

      if (!refs.isDone && refs.p >= 0.97) {
        vt = 0;
      }

      vt = Math.min(vt, 0.5);
      refs.v += (vt - refs.v) * (1 - Math.exp(-dt / 0.4));
      refs.p = Math.min(1.0, refs.p + refs.v * dt);

      // Update Plane DOM through ref
      if (planeRef.current && samples.length > 0) {
        const idx = Math.min(STEPS, Math.floor(refs.p * STEPS));
        const sample = samples[idx] || samples[samples.length - 1];
        planeRef.current.setAttribute(
          'transform',
          `translate(${sample.x.toFixed(2)}, ${sample.y.toFixed(2)}) rotate(${sample.heading.toFixed(2)})`
        );
      }

      // Update Progress Bar through ref
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${refs.p.toFixed(4)})`;
      }

      // ── CAMERA ZOOM TRANSITION ON ARRIVAL ──
      if (refs.p >= 1.0 && !refs.zoomDone) {
        if (!refs.zoomStarted) {
          refs.zoomStarted = true;
          refs.zoomStartTime = now;
          setIsZooming(true);
          setHighlightDestCountry(true);
        }

        const zoomElapsed = (now - refs.zoomStartTime) / 1000;
        const zoomDuration = 1.5; // Exactly 1.5s ease-in-out
        const t = Math.min(1.0, zoomElapsed / zoomDuration);
        const ease = easeInOutCubic(t);

        // Interpolate camera viewBox
        const curX = initialViewBox.x + (targetViewBox.x - initialViewBox.x) * ease;
        const curY = initialViewBox.y + (targetViewBox.y - initialViewBox.y) * ease;
        const curW = initialViewBox.w + (targetViewBox.w - initialViewBox.w) * ease;
        const curH = initialViewBox.h + (targetViewBox.h - initialViewBox.h) * ease;

        if (mapSvgRef.current) {
          mapSvgRef.current.setAttribute(
            'viewBox',
            `${curX.toFixed(2)} ${curY.toFixed(2)} ${curW.toFixed(2)} ${curH.toFixed(2)}`
          );
        }

        if (t >= 1.0) {
          refs.zoomDone = true;
          setIsZooming(false);
          if (typeof onDone === 'function') {
            onDone();
          }
          return; // Animation sequence complete
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(fadeTimer);
      cancelAnimationFrame(rafId);
      animRefs.current.runId = null;
    };
  }, [initialViewBox, targetViewBox, samples, onDone]);

  return (
    <div
      ref={containerRef}
      className={`flight-radar-screen ${isLoaded ? 'is-loaded' : ''}`}
      role="region"
      aria-label="Flight radar search loading screen"
    >
      {/* ── TOP BLOCK (Transparent, Centred, 14px from Top) ── */}
      <div className="fr-top-block">
        <div className="fr-radar-pill">
          ● LIVE AIRLINE FARE RADAR
        </div>
        <h1 className="fr-title">Finding your perfect flight</h1>
        <p className="fr-subtitle">Searching available routes and fares…</p>
        <div className="fr-progress-track">
          <div ref={progressBarRef} className="fr-progress-fill" />
        </div>
      </div>

      {/* ── MAP SVG (Equirectangular Projection 1000x500) ── */}
      <svg
        ref={mapSvgRef}
        className="flight-radar-svg"
        viewBox="0 20 1000 440"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ocean Background */}
        <rect x="0" y="0" width="1000" height="500" fill={precomputedMapData.seaColor || '#fff1f0'} />

        {/* Countries Layer */}
        <g id="countries-layer">
          {precomputedMapData.countries.map((c) => {
            const isTarget = highlightDestCountry && destCountry && c.id === destCountry.id;
            return (
              <path
                key={c.id}
                d={c.d}
                fill={c.color}
                stroke={isTarget ? '#e5322d' : precomputedMapData.borderColor || '#d9a9a6'}
                strokeWidth={isTarget ? 1.8 : 0.7}
                className={`fr-country ${isTarget ? 'fr-country--target' : ''}`}
              />
            );
          })}
        </g>

        {/* State Borders Layer (for Domestic Flights) */}
        {isDomestic && stateFeatures.length > 0 && (
          <g id="states-layer">
            {stateFeatures.map((s) => (
              <path key={s.id} d={s.d} className="fr-state-border" />
            ))}
          </g>
        )}

        {/* Country Name Labels Layer (fades during zoom) */}
        <g id="labels-layer" className={`fr-labels-layer ${isZooming ? 'is-fading' : ''}`}>
          {placedLabels.map((lbl) => (
            <text
              key={lbl.id}
              x={lbl.x}
              y={lbl.y}
              fontSize={lbl.fontSize}
              className="fr-map-label"
            >
              {lbl.name}
            </text>
          ))}
        </g>

        {/* ── FX LAYER: Route Curve, Pins, Radar, and Airplane ── */}
        <g id="fx">
          {/* Curved Flight Route */}
          <path d={routePathD} className="fr-route-path" />

          {/* ── Origin Pin (Navy #1b2a4e, 26px high, tip at (0, 0)) ── */}
          <g id="source-pin-group" transform={`translate(${x0.toFixed(1)}, ${y0.toFixed(1)})`}>
            {/* Location Pin Icon (Tip at (0, 0)) */}
            <g transform="translate(0, 0)">
              <path
                d="M 0 0 C -4 -6, -9 -13, -9 -18 C -9 -23, -5 -26, 0 -26 C 5 -26, 9 -23, 9 -18 C 9 -13, 4 -6, 0 0 Z"
                fill="#1b2a4e"
                stroke="#ffffff"
                strokeWidth="1.2"
              />
              <circle cx="0" cy="-18" r="3.2" fill="#ffffff" />
            </g>

            {/* Airport Code Below Pin */}
            <text x="0" y="11" className="fr-pin-code">
              {srcLoc.code}
            </text>
          </g>

          {/* ── Destination Radar & Pin (Red #e5322d, 26px high, tip at (0, 0)) ── */}
          <g id="dest-pin-group" transform={`translate(${x2.toFixed(1)}, ${y2.toFixed(1)})`}>
            {/* Dual Concentric Radar Pulse Rings (r 40, 4.8s cycle, 2nd ring delayed 2.4s) */}
            <circle cx="0" cy="0" r="0" fill="none" stroke="#e5322d" strokeWidth="0.8" className="fr-dest-radar-ring-1">
              <animate attributeName="r" from="0" to="40" dur="4.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.95; 0.5; 0" dur="4.8s" repeatCount="indefinite" />
              <animate attributeName="stroke-width" values="1.2; 0.7; 0.38" dur="4.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="0" r="0" fill="none" stroke="#e5322d" strokeWidth="0.8" className="fr-dest-radar-ring-2">
              <animate attributeName="r" from="0" to="40" begin="2.4s" dur="4.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.95; 0.5; 0" begin="2.4s" dur="4.8s" repeatCount="indefinite" />
              <animate attributeName="stroke-width" values="1.2; 0.7; 0.38" begin="2.4s" dur="4.8s" repeatCount="indefinite" />
            </circle>

            {/* Location Pin Icon (Tip at (0, 0)) */}
            <g transform="translate(0, 0)">
              <path
                d="M 0 0 C -4 -6, -9 -13, -9 -18 C -9 -23, -5 -26, 0 -26 C 5 -26, 9 -23, 9 -18 C 9 -13, 4 -6, 0 0 Z"
                fill="#e5322d"
                stroke="#ffffff"
                strokeWidth="1.2"
              />
              <circle cx="0" cy="-18" r="3.2" fill="#ffffff" />
            </g>

            {/* Airport Code Below Pin */}
            <text x="0" y="11" className="fr-pin-code">
              {destLoc.code}
            </text>
          </g>

          {/* ── REALISTIC TOP-VIEW AIRLINER (46px long) ── */}
          <g ref={planeRef} className="fr-plane-group" transform={`translate(${x0}, ${y0})`}>
            {/* Dark Offset Shadow Shape */}
            <g transform="translate(2.5, 3.5)" opacity="0.22">
              {/* Silhouette Wings */}
              <path d="M 4, -4.5 L -8, -21 L -12, -20.5 L -4, -4.5 Z" fill="#0f172a" />
              <path d="M 4, 4.5 L -8, 21 L -12, 20.5 L -4, 4.5 Z" fill="#0f172a" />
              {/* Silhouette Stabilizers */}
              <path d="M -16, -2.5 L -22.5, -9 L -24, -8.5 L -20, -2 Z" fill="#0f172a" />
              <path d="M -16, 2.5 L -22.5, 9 L -24, 8.5 L -20, 2 Z" fill="#0f172a" />
              {/* Silhouette Fuselage */}
              <path
                d="M 23, 0 C 23, 3.2 20, 4.6 13, 4.6 L -18, 4.2 C -21, 4.0 -23.5, 2.2 -24, 0 C -23.5, -2.2 -21, -4.0 -18, -4.2 L 13, -4.6 C 20, -4.6 23, -3.2 23, 0 Z"
                fill="#0f172a"
              />
            </g>

            {/* Main Swept Wings */}
            <path
              d="M 4, -4.5 L -8, -21 L -12, -20.5 L -4, -4.5 Z"
              fill="#f8fafc"
              stroke="#94a3b8"
              strokeWidth="0.75"
            />
            <path
              d="M 4, 4.5 L -8, 21 L -12, 20.5 L -4, 4.5 Z"
              fill="#f8fafc"
              stroke="#94a3b8"
              strokeWidth="0.75"
            />

            {/* 2 Jet Engines Under Wings */}
            <rect x="-3" y="-12.5" width="9" height="3.2" rx="1.6" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.6" />
            <rect x="-4.2" y="-11.8" width="1.6" height="1.8" rx="0.5" fill="#334155" />
            <rect x="-3" y="9.3" width="9" height="3.2" rx="1.6" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.6" />
            <rect x="-4.2" y="10" width="1.6" height="1.8" rx="0.5" fill="#334155" />

            {/* Horizontal Stabilizers at Tail */}
            <path
              d="M -16, -2.5 L -22.5, -9 L -24, -8.5 L -20, -2 Z"
              fill="#f1f5f9"
              stroke="#94a3b8"
              strokeWidth="0.65"
            />
            <path
              d="M -16, 2.5 L -22.5, 9 L -24, 8.5 L -20, 2 Z"
              fill="#f1f5f9"
              stroke="#94a3b8"
              strokeWidth="0.65"
            />

            {/* Aerodynamic White Fuselage */}
            <path
              d="M 23, 0 C 23, 3.2 20, 4.6 13, 4.6 L -18, 4.2 C -21, 4.0 -23.5, 2.2 -24, 0 C -23.5, -2.2 -21, -4.0 -18, -4.2 L 13, -4.6 C 20, -4.6 23, -3.2 23, 0 Z"
              fill="#ffffff"
              stroke="#64748b"
              strokeWidth="0.8"
            />

            {/* Red Cheat-Lines */}
            <path d="M 17, -4.5 L -18, -4.1 L -18, -3.4 L 17, -3.8 Z" fill="#e5322d" />
            <path d="M 17, 4.5 L -18, 4.1 L -18, 3.4 L 17, 3.8 Z" fill="#e5322d" />

            {/* Dark Cockpit Windows */}
            <path
              d="M 19, -2.4 C 20.3, -1.2 20.3, 1.2 19, 2.4 L 17.2, 2.7 C 17.9, 1.2 17.9, -1.2 17.2, -2.7 Z"
              fill="#0f172a"
            />

            {/* Red Tail Fin (Vertical Stabilizer) */}
            <path d="M -15.5, 0 L -23.8, -1.2 L -23.8, 1.2 Z" fill="#e5322d" />
          </g>
        </g>
      </svg>

      {/* ── BOTTOM CENTRE: Route Chip (HYD Hyderabad ✈ LHR London) ── */}
      <div className="fr-route-chip">
        <span>
          <strong className="fr-route-code">{srcLoc.code}</strong> {srcLoc.city}
        </span>
        <span className="fr-route-plane-icon">✈</span>
        <span>
          <strong className="fr-route-code">{destLoc.code}</strong> {destLoc.city}
        </span>
      </div>

      {/* ── BOTTOM RIGHT: Logo Watermark (Height 44px, White Glow) ── */}
      <img
        src="/pickandbook-logo.png"
        alt="Pick&Book Logo Watermark"
        className="fr-logo-watermark"
      />
    </div>
  );
}
