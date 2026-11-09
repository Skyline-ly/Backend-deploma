export const ORDER_STATUSES = [
  "Pending",
  "Paid",
  "Packing",
  "Out for Delivery",
  "Success",
  "In Transit",
  "Delivered",
  "Confirmed",
  "Processing",
  "Ready for Pickup",
  "Picked Up",
  "Completed",
  "Cancelled",
];

export const ORDER_STATUS_TRANSITIONS = {
  Pending: "Packing",
  Packing: "Out for Delivery",
  "Out for Delivery": "Success",
  Paid: "Packing",
  "In Transit": "Delivered",
  Delivered: "Success",
  Confirmed: "Processing",
  Processing: "Ready for Pickup",
  "Ready for Pickup": "Picked Up",
};

export const CUSTOMER_ORDER_PROGRESS = [
  "Pending",
  "Packing",
  "Out for Delivery",
  "Success",
];

export const ORDER_SALE_STATUSES = ORDER_STATUSES.filter(
  (status) => !["Pending", "Cancelled"].includes(status)
);
