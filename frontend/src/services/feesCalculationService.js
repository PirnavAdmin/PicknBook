/* eslint-disable */
/**
 * Deprecated.
 *
 * Bus pricing is now calculated by the backend pricing engine through
 * POST /api/busbookings/pricing-preview with selected seat codes.
 */

const deprecatedMessage =
  "feesCalculationService is deprecated. Use getBusPricingPreview from busBookingService.";

const feesCalculationService = {
  getPricingConfig: async () => {
    throw new Error(deprecatedMessage);
  },

  calculateFees: async () => {
    throw new Error(deprecatedMessage);
  },
};

export const calculateFees = async () => {
  throw new Error(deprecatedMessage);
};

export default feesCalculationService;
