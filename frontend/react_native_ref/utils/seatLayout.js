import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://www.picknbook.in';

const getObjectValue = (value) =>
  value && typeof value === 'object' ? value : null;

import { fetchSeatLayoutByBusId, getSeatLayout } from '../services/busService';

export const getSeatLayoutApiUrl = (busId) => {
  // Provided for backward compatibility if needed, but the application
  // now calls POST /api/BusBookings/seat-layout instead.
  return `https://www.picknbook.in/api/BusBookings/${encodeURIComponent(String(busId))}/seats`;
};

export const normalizeSeatLayoutPayload = (payload) => {
  const root = getObjectValue(payload);

  if (!root) {
    return null;
  }

  return (
    getObjectValue(root.data) ||
    getObjectValue(root.result) ||
    getObjectValue(root.response) ||
    root
  );
};

export const fetchSeatLayout = async (busOrBusId) => {
  try {
    if (
      busOrBusId &&
      typeof busOrBusId === 'object' &&
      busOrBusId.traceId &&
      busOrBusId.resultIndex
    ) {
      const data = await getSeatLayout(busOrBusId);
      return normalizeSeatLayoutPayload(data);
    }

    const data = await fetchSeatLayoutByBusId(busOrBusId);
    return normalizeSeatLayoutPayload(data);
  } catch (error) {
    const message = error?.message || 'Seat layout unavailable.';
    throw new Error(message);
  }
};
