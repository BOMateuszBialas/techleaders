import {
  DEMO_TRAFFIC_LABEL,
  ORDER_STATUSES,
  previousPeriod,
  resolvePeriod,
  type LowStockProducts,
  type OrderSummary,
  type SalesSummary,
  type TopProducts,
  type TopProductAggregate,
  type TrafficSummary,
} from "@commerceos/core";

/** Shared Copilot test data: the E04 demo scenario in miniature (Pulse is a low-stock best seller). */
export const NOW = new Date("2026-10-17T10:00:00.000Z");
export const PERIOD = resolvePeriod("7d", NOW);
export const PREVIOUS = previousPeriod(PERIOD);

export const PULSE_ID = "0b5f2c1e-8d3a-4c6b-9e1f-2a7d4c8b6e01";
export const TITAN_ID = "1c6a3d2f-9e4b-4d7c-8f2a-3b8e5d9c7f12";
export const ECHO_ID = "2d7b4e3a-af5c-4e8d-9a3b-4c9f6eab8a23";

export function sales(overrides: Partial<SalesSummary> = {}, period = PERIOD): SalesSummary {
  return {
    period,
    currency: "PLN",
    definitionIds: ["paidOrders", "revenue", "aov"],
    paidOrders: 29,
    revenueMinor: 984_700,
    aovMinor: 33_955,
    otherCurrencyOrders: 0,
    ...overrides,
  };
}

export function orders(total = 31, period = PERIOD): OrderSummary {
  return {
    period,
    definitionIds: ["ordersPlaced"],
    total,
    byStatus: ORDER_STATUSES.map((status) => ({ status, count: status === "paid" ? total : 0 })),
  };
}

export const PULSE_ROW: TopProductAggregate = {
  productId: PULSE_ID,
  name: "Pulse Ultralight Mouse",
  units: 9,
  revenueMinor: 170_100,
};
export const ECHO_ROW: TopProductAggregate = {
  productId: ECHO_ID,
  name: "Echo Surround Headset",
  units: 5,
  revenueMinor: 149_500,
};

export function top(
  rows: TopProductAggregate[] = [PULSE_ROW, ECHO_ROW],
  period = PERIOD,
): TopProducts {
  return { period, currency: "PLN", definitionIds: ["topProducts"], limit: 5, rows };
}

export function lowStock(rows: LowStockProducts["rows"] = defaultLowStockRows()): LowStockProducts {
  return { definitionIds: ["lowStock"], threshold: 5, total: rows.length, rows };
}

export function defaultLowStockRows(): LowStockProducts["rows"] {
  return [
    { id: TITAN_ID, name: "Titan MMO Mouse", sku: "DEMO-MOU-003", stockQuantity: 0 },
    { id: PULSE_ID, name: "Pulse Ultralight Mouse", sku: "DEMO-MOU-002", stockQuantity: 3 },
  ];
}

export const DRIFT_ID = "3e8c5f4b-b06d-4f9e-8b4c-5d0a7fbc9b34";

/** Demo traffic in miniature: Drift is viewed a lot and rarely bought; Titan is out of stock. */
export function traffic(overrides: Partial<TrafficSummary> = {}): TrafficSummary {
  return {
    source: DEMO_TRAFFIC_LABEL,
    demo: true,
    period: PERIOD,
    days: { firstDay: "2026-10-11", lastDay: "2026-10-17" },
    definitionIds: ["sessionsDemo", "funnelDemo", "storeConversionDemo", "viewToPurchaseRateDemo"],
    productLimit: 5,
    sessions: {
      total: 1000,
      bySource: [
        { source: "direct", sessions: 300 },
        { source: "organic", sessions: 400 },
        { source: "social", sessions: 200 },
        { source: "email", sessions: 100 },
        { source: "paid", sessions: 0 },
      ],
    },
    funnel: {
      sessions: 1000,
      productViews: 800,
      addToCarts: 120,
      checkoutsStarted: 40,
      paidOrders: 29,
    },
    storeConversion: 0.029,
    viewToPurchaseRate: 0.05,
    products: [
      {
        productId: DRIFT_ID,
        name: "Drift Wireless Headset",
        views: 300,
        addToCarts: 30,
        unitsSold: 2,
        viewToPurchaseRate: 2 / 300,
      },
      {
        productId: PULSE_ID,
        name: "Pulse Ultralight Mouse",
        views: 150,
        addToCarts: 40,
        unitsSold: 9,
        viewToPurchaseRate: 0.06,
      },
      {
        productId: TITAN_ID,
        name: "Titan MMO Mouse",
        views: 90,
        addToCarts: 0,
        unitsSold: 0,
        viewToPurchaseRate: 0,
      },
      {
        productId: ECHO_ID,
        name: "Echo Surround Headset",
        views: 40,
        addToCarts: 8,
        unitsSold: 5,
        viewToPurchaseRate: 0.125,
      },
    ],
    productsWithoutViewData: 2,
    ...overrides,
  };
}

/** No demo traffic rows in the period at all. */
export function emptyTraffic(): TrafficSummary {
  return traffic({
    sessions: {
      total: 0,
      bySource: traffic().sessions.bySource.map((row) => ({ ...row, sessions: 0 })),
    },
    funnel: { sessions: 0, productViews: 0, addToCarts: 0, checkoutsStarted: 0, paidOrders: 0 },
    storeConversion: null,
    viewToPurchaseRate: null,
    products: [],
    productsWithoutViewData: 15,
  });
}
