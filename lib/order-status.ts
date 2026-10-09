// Shared order-status definitions — single source of truth for admin and tracking.

export const ORDER_STATUSES = [
  "pending_payment",
  "confirmed",
  "shipped",
  "ready_for_pickup",
  "picked_up",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Statuses allowed for delivery couriers (LBC, Lalamove, ...).
export const NON_PICKUP_STATUSES = [
  "pending_payment",
  "confirmed",
  "shipped",
  "completed",
  "cancelled",
] as const;

// Statuses allowed for store pickup (no "shipped", no "completed").
export const PICKUP_STATUSES = [
  "pending_payment",
  "confirmed",
  "ready_for_pickup",
  "picked_up",
  "cancelled",
] as const;

export function getAllowedStatuses(courier?: string | null): readonly OrderStatus[] {
  return courier === "Pickup" ? PICKUP_STATUSES : NON_PICKUP_STATUSES;
}

export function isValidStatusForCourier(status: unknown, courier?: string | null): boolean {
  if (typeof status !== "string") return false;
  return (getAllowedStatuses(courier) as readonly string[]).includes(status);
}

export function normalizeStatus(status?: string): string {
  if (status === "pending_verification") return "pending_payment";
  return status ?? "";
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pending Payment",
  confirmed: "Confirmed",
  shipped: "Shipped",
  ready_for_pickup: "Ready for Pickup",
  picked_up: "Picked Up",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function getStatusLabel(status?: string): string {
  const label = STATUS_LABELS[normalizeStatus(status) as OrderStatus];
  if (label) return label;
  return (status ?? "").replace(/_/g, " ");
}

export function getTrackSteps(courier?: string | null): { status: OrderStatus; label: string }[] {
  const statuses: readonly OrderStatus[] =
    courier === "Pickup"
      ? ["pending_payment", "confirmed", "ready_for_pickup", "picked_up"]
      : ["pending_payment", "confirmed", "shipped", "completed"];
  return statuses.map((status) => ({ status, label: STATUS_LABELS[status] }));
}

export function getStatusStep(courier?: string | null, status?: string): number {
  const normalized = normalizeStatus(status);
  if (normalized === "cancelled" || !normalized) return 0;
  const steps = getTrackSteps(courier);
  const index = steps.findIndex((step) => step.status === normalized);
  return index === -1 ? 0 : index + 1;
}
