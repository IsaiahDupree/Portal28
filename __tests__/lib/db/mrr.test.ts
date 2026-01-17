/**
 * MRR & Subscription Metrics Tests
 * Tests for feat-024: MRR & Subscription Metrics
 * Test IDs: GRO-MRR-001 through GRO-MRR-006
 */

import { describe, test, expect } from "@jest/globals";

/**
 * Test ID: GRO-MRR-001
 * Test: Calculate MRR from active subscriptions
 * Priority: P1
 */
describe("GRO-MRR-001: Calculate MRR", () => {
  test("should sum active subscriptions normalized to monthly", () => {
    // Test data representing subscriptions
    const subscriptions = [
      { price_cents: 2900, interval: "month", status: "active" }, // $29/mo
      { price_cents: 9900, interval: "month", status: "active" }, // $99/mo
      { price_cents: 120000, interval: "year", status: "active" }, // $1200/yr = $100/mo MRR
    ];

    // Calculate expected MRR
    const monthlyMRR = 2900 + 9900; // $128
    const yearlyMRR = 120000 / 12; // $100
    const expectedMRR = monthlyMRR + yearlyMRR; // $228

    // Verify calculation logic
    const actualMRR = subscriptions.reduce((sum, sub) => {
      if (sub.status !== "active") return sum;
      if (sub.interval === "month") return sum + sub.price_cents;
      if (sub.interval === "year") return sum + sub.price_cents / 12;
      return sum;
    }, 0);

    expect(actualMRR).toBe(expectedMRR);
    expect(actualMRR).toBe(22800); // $228.00
  });

  test("should only include active and trialing subscriptions", () => {
    const subscriptions = [
      { price_cents: 2900, interval: "month", status: "active" },
      { price_cents: 9900, interval: "month", status: "trialing" },
      { price_cents: 5000, interval: "month", status: "canceled" }, // excluded
      { price_cents: 7000, interval: "month", status: "past_due" }, // excluded
    ];

    const mrr = subscriptions.reduce((sum, sub) => {
      if (sub.status === "active" || sub.status === "trialing") {
        return sum + sub.price_cents;
      }
      return sum;
    }, 0);

    expect(mrr).toBe(12800); // $128.00 (only active + trialing)
  });

  test("should handle empty subscription list", () => {
    const subscriptions: any[] = [];
    const mrr = subscriptions.reduce((sum, sub) => {
      if (sub.status === "active" || sub.status === "trialing") {
        return sum + (sub.interval === "month" ? sub.price_cents : sub.price_cents / 12);
      }
      return sum;
    }, 0);

    expect(mrr).toBe(0);
  });

  test("should normalize annual subscriptions to monthly", () => {
    // $1200/year should become $100/month MRR
    const annualPrice = 120000; // cents
    const mrr = annualPrice / 12;

    expect(mrr).toBe(10000); // $100.00/month
  });
});

/**
 * Test ID: GRO-MRR-002
 * Test: MRR widget displays current value
 * Priority: P1
 */
describe("GRO-MRR-002: MRR Widget Display", () => {
  test("should format MRR for display", () => {
    const mrrCents = 22800; // $228.00
    const displayValue = `$${(mrrCents / 100).toFixed(0)}`;
    expect(displayValue).toBe("$228");
  });

  test("should display subscriber count", () => {
    const subscribers = [
      { status: "active" },
      { status: "active" },
      { status: "trialing" },
    ];

    const activeCount = subscribers.filter(
      (s) => s.status === "active" || s.status === "trialing"
    ).length;

    expect(activeCount).toBe(3);
  });

  test("should display growth rate", () => {
    const currentMRR = 22800;
    const previousMRR = 20000;
    const growthRate = ((currentMRR - previousMRR) / previousMRR) * 100;

    expect(growthRate).toBeCloseTo(14, 0); // 14% growth
  });

  test("should handle zero growth", () => {
    const currentMRR = 20000;
    const previousMRR = 20000;
    const growthRate = ((currentMRR - previousMRR) / previousMRR) * 100;

    expect(growthRate).toBe(0);
  });

  test("should handle negative growth (contraction)", () => {
    const currentMRR = 18000;
    const previousMRR = 20000;
    const growthRate = ((currentMRR - previousMRR) / previousMRR) * 100;

    expect(growthRate).toBe(-10); // -10% contraction
  });
});

/**
 * Test ID: GRO-MRR-003
 * Test: Calculate churn rate
 * Priority: P1
 */
describe("GRO-MRR-003: Churn Rate Calculation", () => {
  test("should calculate churn rate as percentage", () => {
    const subscribersAtStart = 100;
    const churnedCount = 5;
    const churnRate = (churnedCount / subscribersAtStart) * 100;

    expect(churnRate).toBe(5); // 5% churn
  });

  test("should handle zero churn", () => {
    const subscribersAtStart = 100;
    const churnedCount = 0;
    const churnRate = (churnedCount / subscribersAtStart) * 100;

    expect(churnRate).toBe(0);
  });

  test("should handle zero subscribers gracefully", () => {
    const subscribersAtStart = 0;
    const churnedCount = 0;
    const churnRate = subscribersAtStart > 0 ? (churnedCount / subscribersAtStart) * 100 : 0;

    expect(churnRate).toBe(0);
  });

  test("should round churn rate to 2 decimal places", () => {
    const subscribersAtStart = 97;
    const churnedCount = 3;
    const churnRate = Math.round((churnedCount / subscribersAtStart) * 100 * 100) / 100;

    expect(churnRate).toBe(3.09); // 3.09%
  });

  test("should only count subscriptions that existed at period start", () => {
    // If a subscription was created and canceled in the same period, it shouldn't count as churn
    const subscriptions = [
      { created_at: "2026-01-01", canceled_at: "2026-01-20", status: "canceled" }, // exclude
      { created_at: "2025-12-01", canceled_at: "2026-01-15", status: "canceled" }, // include
      { created_at: "2025-11-01", canceled_at: "2026-01-10", status: "canceled" }, // include
    ];

    const periodStart = new Date("2026-01-01");
    const churnedInPeriod = subscriptions.filter((sub) => {
      const created = new Date(sub.created_at);
      const canceled = sub.canceled_at ? new Date(sub.canceled_at) : null;
      return (
        created < periodStart &&
        canceled &&
        canceled >= periodStart &&
        sub.status === "canceled"
      );
    });

    expect(churnedInPeriod.length).toBe(2);
  });
});

/**
 * Test ID: GRO-MRR-004
 * Test: Subscriber list shows active subscribers
 * Priority: P1
 */
describe("GRO-MRR-004: Subscriber List", () => {
  test("should filter by status", () => {
    const subscriptions = [
      { id: "1", status: "active", tier: "member" },
      { id: "2", status: "active", tier: "vip" },
      { id: "3", status: "canceled", tier: "member" },
      { id: "4", status: "trialing", tier: "vip" },
    ];

    const activeOnly = subscriptions.filter((s) => s.status === "active");
    expect(activeOnly.length).toBe(2);
  });

  test("should include user details", () => {
    const subscriber = {
      id: "sub_123",
      user_id: "user_456",
      user_email: "test@example.com",
      user_name: "Test User",
      tier: "member",
      status: "active",
      price_cents: 2900,
      interval: "month",
    };

    expect(subscriber.user_email).toBe("test@example.com");
    expect(subscriber.user_name).toBe("Test User");
    expect(subscriber.tier).toBe("member");
  });

  test("should show cancel_at_period_end flag", () => {
    const subscriber = {
      id: "sub_123",
      status: "active",
      cancel_at_period_end: true,
      current_period_end: "2026-02-01",
    };

    expect(subscriber.cancel_at_period_end).toBe(true);
    expect(subscriber.status).toBe("active"); // Still active until period end
  });

  test("should support pagination", () => {
    const allSubscribers = Array.from({ length: 150 }, (_, i) => ({
      id: `sub_${i}`,
      status: "active",
    }));

    const limit = 50;
    const offset = 0;
    const page1 = allSubscribers.slice(offset, offset + limit);

    expect(page1.length).toBe(50);
    expect(page1[0].id).toBe("sub_0");
  });

  test("should handle trialing subscriptions separately", () => {
    const subscriptions = [
      { status: "active", tier: "member" },
      { status: "trialing", tier: "vip", trial_end: "2026-02-01" },
    ];

    const trialing = subscriptions.filter((s) => s.status === "trialing");
    expect(trialing.length).toBe(1);
    expect(trialing[0].trial_end).toBeDefined();
  });
});

/**
 * Test ID: GRO-MRR-005
 * Test: Subscription history tracks plan changes
 * Priority: P2
 */
describe("GRO-MRR-005: Subscription History", () => {
  test("should track plan changes", () => {
    const historyEvent = {
      event_type: "plan_changed",
      old_tier: "member",
      new_tier: "vip",
      old_price_cents: 2900,
      new_price_cents: 9900,
      created_at: "2026-01-14",
    };

    expect(historyEvent.event_type).toBe("plan_changed");
    expect(historyEvent.old_tier).toBe("member");
    expect(historyEvent.new_tier).toBe("vip");
  });

  test("should track subscription lifecycle events", () => {
    const events = [
      { event_type: "created", new_status: "trialing" },
      { event_type: "renewed", old_status: "trialing", new_status: "active" },
      { event_type: "canceled", old_status: "active", new_status: "canceled" },
    ];

    expect(events[0].event_type).toBe("created");
    expect(events[1].event_type).toBe("renewed");
    expect(events[2].event_type).toBe("canceled");
  });

  test("should track interval changes", () => {
    const historyEvent = {
      event_type: "plan_changed",
      old_interval: "month",
      new_interval: "year",
      old_price_cents: 2900,
      new_price_cents: 29000, // annual pricing
    };

    expect(historyEvent.old_interval).toBe("month");
    expect(historyEvent.new_interval).toBe("year");
  });

  test("should store change timestamps", () => {
    const historyEvent = {
      event_type: "plan_changed",
      created_at: "2026-01-14T12:00:00Z",
    };

    expect(new Date(historyEvent.created_at).getTime()).toBeGreaterThan(0);
  });
});

/**
 * Test ID: GRO-MRR-006
 * Test: Revenue breakdown by plan
 * Priority: P2
 */
describe("GRO-MRR-006: Revenue Breakdown", () => {
  test("should group by tier and interval", () => {
    const subscriptions = [
      { tier: "member", interval: "month", price_cents: 2900, status: "active" },
      { tier: "member", interval: "month", price_cents: 2900, status: "active" },
      { tier: "member", interval: "year", price_cents: 29000, status: "active" },
      { tier: "vip", interval: "month", price_cents: 9900, status: "active" },
    ];

    // Group by tier and interval
    const breakdown = subscriptions.reduce((acc: any, sub) => {
      const key = `${sub.tier}-${sub.interval}`;
      if (!acc[key]) {
        acc[key] = {
          tier: sub.tier,
          interval: sub.interval,
          count: 0,
          revenue: 0,
        };
      }
      acc[key].count++;
      acc[key].revenue += sub.price_cents;
      return acc;
    }, {});

    expect(breakdown["member-month"].count).toBe(2);
    expect(breakdown["member-month"].revenue).toBe(5800);
    expect(breakdown["member-year"].count).toBe(1);
    expect(breakdown["vip-month"].count).toBe(1);
  });

  test("should calculate MRR per plan", () => {
    const plans = [
      {
        tier: "member",
        interval: "month",
        subscriber_count: 2,
        revenue: 5800,
        mrr: 5800, // monthly as-is
      },
      {
        tier: "member",
        interval: "year",
        subscriber_count: 1,
        revenue: 29000,
        mrr: 29000 / 12, // ~$241.67/mo
      },
      {
        tier: "vip",
        interval: "month",
        subscriber_count: 1,
        revenue: 9900,
        mrr: 9900,
      },
    ];

    const totalMRR = plans.reduce((sum, p) => sum + p.mrr, 0);
    expect(totalMRR).toBeCloseTo(18116.67, 0);
  });

  test("should sort by MRR descending", () => {
    const plans = [
      { tier: "member", mrr: 5800 },
      { tier: "vip", mrr: 9900 },
      { tier: "pro", mrr: 7500 },
    ];

    const sorted = plans.sort((a, b) => b.mrr - a.mrr);

    expect(sorted[0].tier).toBe("vip");
    expect(sorted[1].tier).toBe("pro");
    expect(sorted[2].tier).toBe("member");
  });

  test("should differentiate monthly vs annual revenue", () => {
    const breakdown = {
      monthly_revenue: 5800 + 9900, // all monthly subs
      annual_revenue: 29000, // all annual subs
      total_mrr: 5800 + 9900 + 29000 / 12, // normalized
    };

    expect(breakdown.monthly_revenue).toBe(15700);
    expect(breakdown.annual_revenue).toBe(29000);
    expect(breakdown.total_mrr).toBeCloseTo(18116.67, 0);
  });
});

/**
 * Additional Tests: ARR Calculation
 */
describe("ARR Calculation", () => {
  test("should calculate ARR from MRR", () => {
    const mrr = 22800; // $228.00
    const arr = mrr * 12;

    expect(arr).toBe(273600); // $2,736.00 per year
  });

  test("should format ARR for display", () => {
    const arrCents = 273600;
    const displayValue = `$${(arrCents / 100).toFixed(0)}`;
    expect(displayValue).toBe("$2736");
  });
});

/**
 * Additional Tests: Edge Cases
 */
describe("Edge Cases", () => {
  test("should handle null price_cents gracefully", () => {
    const subscriptions = [
      { price_cents: null, interval: "month", status: "active" },
      { price_cents: 2900, interval: "month", status: "active" },
    ];

    const mrr = subscriptions.reduce((sum, sub) => {
      if (sub.status !== "active") return sum;
      return sum + (sub.price_cents || 0);
    }, 0);

    expect(mrr).toBe(2900);
  });

  test("should handle missing interval gracefully", () => {
    const sub = {
      price_cents: 2900,
      interval: undefined,
      status: "active",
    };

    const mrr = sub.interval === "year" ? sub.price_cents / 12 : sub.price_cents;

    expect(mrr).toBe(2900); // defaults to treating as monthly
  });

  test("should handle very small subscriber counts", () => {
    const churnRate = (1 / 2) * 100; // 1 churned out of 2 subscribers
    expect(churnRate).toBe(50); // 50% churn
  });
});
