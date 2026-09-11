import {
  createBusCoupon,
  deleteBusCoupon,
  listBusCoupons,
  updateBusCoupon,
} from "./busBookingService";

import {
  getConditions,
  createCondition,
  deleteCondition,
} from "./adminBusService";

const getBusCouponConditions = getConditions;
const createBusCouponCondition = createCondition;
const deleteBusCouponCondition = deleteCondition;

export {
  createBusCoupon,
  deleteBusCoupon,
  listBusCoupons,
  updateBusCoupon,
  getBusCouponConditions,
  createBusCouponCondition,
  deleteBusCouponCondition,
};
