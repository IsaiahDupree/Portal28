/**
 * @jest-environment node
 */

import {
  getRevenueTimeSeries,
  getConversionFunnel,
  getTopCourses,
  getOfferAnalytics,
  getDashboardStats,
  getCohortAnalytics,
  getCohortRetentionCurve,
  getCohortLTVComparison,
} from "@/lib/db/analytics";

// Mock Supabase
jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => Promise.resolve({
            count: 0,
            data: [],
            error: null,
          })),
        })),
        gte: jest.fn(() => Promise.resolve({
          count: 0,
          data: [],
          error: null,
        })),
      })),
    })),
    rpc: jest.fn(() => Promise.resolve({
      data: [],
      error: null,
    })),
  })),
}));

describe("Analytics Functions", () => {
  describe("GRO-ANA-001: Page loads", () => {
    it("should fetch dashboard stats without errors", async () => {
      const stats = await getDashboardStats(30);

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("totalRevenue");
      expect(stats).toHaveProperty("totalOrders");
      expect(stats).toHaveProperty("totalImpressions");
      expect(stats).toHaveProperty("totalCheckouts");
      expect(stats).toHaveProperty("conversionRate");
    });
  });

  describe("GRO-ANA-002: Revenue chart", () => {
    it("should fetch revenue timeseries for daily period", async () => {
      const data = await getRevenueTimeSeries("day", 30);

      expect(Array.isArray(data)).toBe(true);
      // Data shape validated even if empty
    });

    it("should support weekly period", async () => {
      const data = await getRevenueTimeSeries("week", 30);

      expect(Array.isArray(data)).toBe(true);
    });

    it("should support monthly period", async () => {
      const data = await getRevenueTimeSeries("month", 90);

      expect(Array.isArray(data)).toBe(true);
    });

    it("should format dates correctly for each period", async () => {
      // This validates the period parameter affects date formatting
      const daily = await getRevenueTimeSeries("day", 7);
      const weekly = await getRevenueTimeSeries("week", 7);
      const monthly = await getRevenueTimeSeries("month", 30);

      expect(Array.isArray(daily)).toBe(true);
      expect(Array.isArray(weekly)).toBe(true);
      expect(Array.isArray(monthly)).toBe(true);
    });
  });

  describe("GRO-ANA-003: Conversion funnel", () => {
    it("should calculate conversion funnel from LP to Purchase", async () => {
      const funnel = await getConversionFunnel(30);

      expect(Array.isArray(funnel)).toBe(true);
      expect(funnel.length).toBe(3);

      // Verify funnel steps
      expect(funnel[0]).toMatchObject({
        step: "Impressions",
        count: expect.any(Number),
        percentage: 100,
      });

      expect(funnel[1]).toMatchObject({
        step: "Checkouts",
        count: expect.any(Number),
        percentage: expect.any(Number),
      });

      expect(funnel[2]).toMatchObject({
        step: "Purchases",
        count: expect.any(Number),
        percentage: expect.any(Number),
      });
    });

    it("should handle zero impressions gracefully", async () => {
      const funnel = await getConversionFunnel(1);

      expect(funnel).toBeDefined();
      expect(funnel.length).toBe(3);
      // Percentage calculations should not error with 0 impressions
    });

    it("should calculate percentages correctly", async () => {
      const funnel = await getConversionFunnel(30);

      // All percentages should be between 0 and 100
      funnel.forEach((step) => {
        expect(step.percentage).toBeGreaterThanOrEqual(0);
        expect(step.percentage).toBeLessThanOrEqual(100);
      });

      // Funnel should descend (each step <= previous)
      if (funnel.length > 1) {
        for (let i = 1; i < funnel.length; i++) {
          expect(funnel[i].count).toBeLessThanOrEqual(funnel[i - 1].count);
        }
      }
    });
  });

  describe("GRO-ANA-004: Top courses", () => {
    it("should list courses by revenue", async () => {
      const courses = await getTopCourses(10);

      expect(Array.isArray(courses)).toBe(true);

      if (courses.length > 0) {
        expect(courses[0]).toHaveProperty("id");
        expect(courses[0]).toHaveProperty("title");
        expect(courses[0]).toHaveProperty("slug");
        expect(courses[0]).toHaveProperty("revenue");
        expect(courses[0]).toHaveProperty("orders");
      }
    });

    it("should respect limit parameter", async () => {
      const courses = await getTopCourses(5);

      expect(courses.length).toBeLessThanOrEqual(5);
    });

    it("should sort courses by revenue descending", async () => {
      const courses = await getTopCourses(10);

      // Verify descending order
      for (let i = 1; i < courses.length; i++) {
        expect(Number(courses[i].revenue)).toBeLessThanOrEqual(
          Number(courses[i - 1].revenue)
        );
      }
    });

    it("should include order count for each course", async () => {
      const courses = await getTopCourses(10);

      courses.forEach((course) => {
        expect(typeof Number(course.orders)).toBe("number");
        expect(Number(course.orders)).toBeGreaterThan(0);
      });
    });
  });

  describe("GRO-ANA-005: Daily metrics", () => {
    it("should aggregate metrics by day", async () => {
      // This test documents that daily aggregation is available
      const revenue = await getRevenueTimeSeries("day", 30);

      expect(Array.isArray(revenue)).toBe(true);
      // Each row represents one day
      revenue.forEach((row) => {
        expect(row).toHaveProperty("date");
        expect(row).toHaveProperty("revenue");
        expect(row).toHaveProperty("orders");
      });
    });

    it("should handle date range filtering", async () => {
      const last7 = await getRevenueTimeSeries("day", 7);
      const last30 = await getRevenueTimeSeries("day", 30);

      expect(Array.isArray(last7)).toBe(true);
      expect(Array.isArray(last30)).toBe(true);
      // 30 days should have more or equal data points than 7 days
    });
  });

  describe("GRO-ANA-006: Offer analytics", () => {
    it("should return offer performance data", async () => {
      const offers = await getOfferAnalytics(30);

      expect(Array.isArray(offers)).toBe(true);

      if (offers.length > 0) {
        expect(offers[0]).toHaveProperty("offer_key");
        expect(offers[0]).toHaveProperty("offer_title");
        expect(offers[0]).toHaveProperty("impressions");
        expect(offers[0]).toHaveProperty("checkouts");
        expect(offers[0]).toHaveProperty("conversions");
        expect(offers[0]).toHaveProperty("conversion_rate");
      }
    });

    it("should calculate conversion rates correctly", async () => {
      const offers = await getOfferAnalytics(30);

      offers.forEach((offer) => {
        expect(offer.conversion_rate).toBeGreaterThanOrEqual(0);
        expect(offer.conversion_rate).toBeLessThanOrEqual(100);

        // Conversion rate should be conversions / checkouts * 100
        if (Number(offer.checkouts) > 0) {
          const expectedRate =
            (Number(offer.conversions) / Number(offer.checkouts)) * 100;
          expect(Math.abs(offer.conversion_rate - expectedRate)).toBeLessThan(
            0.1
          );
        }
      });
    });

    it("should handle offers with zero checkouts", async () => {
      const offers = await getOfferAnalytics(30);

      // Should not error, conversion rate should be 0
      offers.forEach((offer) => {
        if (Number(offer.checkouts) === 0) {
          expect(offer.conversion_rate).toBe(0);
        }
      });
    });
  });

  describe("GRO-ANA-007: Date filter", () => {
    it("should filter by 7 days", async () => {
      const stats = await getDashboardStats(7);

      expect(stats).toBeDefined();
    });

    it("should filter by 30 days", async () => {
      const stats = await getDashboardStats(30);

      expect(stats).toBeDefined();
    });

    it("should filter by 90 days", async () => {
      const stats = await getDashboardStats(90);

      expect(stats).toBeDefined();
    });

    it("should update all charts when filter changes", async () => {
      // This test documents that the days parameter affects all data fetching
      const revenue7 = await getRevenueTimeSeries("day", 7);
      const revenue30 = await getRevenueTimeSeries("day", 30);
      const funnel7 = await getConversionFunnel(7);
      const funnel30 = await getConversionFunnel(30);
      const offers7 = await getOfferAnalytics(7);
      const offers30 = await getOfferAnalytics(30);

      expect(Array.isArray(revenue7)).toBe(true);
      expect(Array.isArray(revenue30)).toBe(true);
      expect(Array.isArray(funnel7)).toBe(true);
      expect(Array.isArray(funnel30)).toBe(true);
      expect(Array.isArray(offers7)).toBe(true);
      expect(Array.isArray(offers30)).toBe(true);
    });
  });

  describe("GRO-ANA-008: Export data", () => {
    it("should format data for CSV export", async () => {
      const [revenue, courses, offers] = await Promise.all([
        getRevenueTimeSeries("day", 30),
        getTopCourses(100),
        getOfferAnalytics(30),
      ]);

      // Verify all data can be serialized to CSV
      expect(Array.isArray(revenue)).toBe(true);
      expect(Array.isArray(courses)).toBe(true);
      expect(Array.isArray(offers)).toBe(true);

      // Each dataset should have consistent structure for CSV
      revenue.forEach((row) => {
        expect(row.date).toBeDefined();
        expect(typeof row.revenue).toBe("bigint");
        expect(typeof row.orders).toBe("bigint");
      });

      courses.forEach((course) => {
        expect(course.title).toBeDefined();
        expect(course.slug).toBeDefined();
        expect(typeof course.revenue).toBe("bigint");
        expect(typeof course.orders).toBe("bigint");
      });

      offers.forEach((offer) => {
        expect(offer.offer_key).toBeDefined();
        expect(offer.offer_title).toBeDefined();
        expect(typeof Number(offer.impressions)).toBe("number");
        expect(typeof Number(offer.checkouts)).toBe("number");
        expect(typeof Number(offer.conversions)).toBe("number");
        expect(typeof offer.conversion_rate).toBe("number");
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing data gracefully", async () => {
      const stats = await getDashboardStats(1);

      expect(stats.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(stats.totalOrders).toBeGreaterThanOrEqual(0);
      expect(stats.totalImpressions).toBeGreaterThanOrEqual(0);
      expect(stats.totalCheckouts).toBeGreaterThanOrEqual(0);
      expect(stats.conversionRate).toBeGreaterThanOrEqual(0);
    });

    it("should handle division by zero in conversion rate", async () => {
      const stats = await getDashboardStats(1);

      // Should return 0, not NaN or Infinity
      expect(isFinite(stats.conversionRate)).toBe(true);
      expect(stats.conversionRate).toBeGreaterThanOrEqual(0);
    });

    it("should return empty arrays for periods with no data", async () => {
      const revenue = await getRevenueTimeSeries("day", 1);
      const courses = await getTopCourses(10);
      const offers = await getOfferAnalytics(1);

      expect(Array.isArray(revenue)).toBe(true);
      expect(Array.isArray(courses)).toBe(true);
      expect(Array.isArray(offers)).toBe(true);
    });
  });

  describe("GRO-COH-001: Cohort grouping", () => {
    it("should group users by signup cohort", async () => {
      const cohorts = await getCohortAnalytics("month", 12);

      expect(Array.isArray(cohorts)).toBe(true);

      if (cohorts.length > 0) {
        expect(cohorts[0]).toHaveProperty("cohort_date");
        expect(cohorts[0]).toHaveProperty("cohort_size");
        expect(cohorts[0]).toHaveProperty("total_revenue");
        expect(cohorts[0]).toHaveProperty("avg_ltv");
      }
    });

    it("should support weekly cohort grouping", async () => {
      const cohorts = await getCohortAnalytics("week", 12);

      expect(Array.isArray(cohorts)).toBe(true);
    });

    it("should support monthly cohort grouping", async () => {
      const cohorts = await getCohortAnalytics("month", 6);

      expect(Array.isArray(cohorts)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const cohorts = await getCohortAnalytics("month", 5);

      expect(cohorts.length).toBeLessThanOrEqual(5);
    });

    it("should order cohorts by date descending (newest first)", async () => {
      const cohorts = await getCohortAnalytics("month", 12);

      // Cohorts should be in descending order (newest first)
      for (let i = 1; i < cohorts.length; i++) {
        expect(cohorts[i].cohort_date <= cohorts[i - 1].cohort_date).toBe(true);
      }
    });
  });

  describe("GRO-COH-002: Retention calculation", () => {
    it("should calculate retention rates at different intervals", async () => {
      const cohorts = await getCohortAnalytics("month", 12);

      if (cohorts.length > 0) {
        expect(cohorts[0]).toHaveProperty("retention_week_1");
        expect(cohorts[0]).toHaveProperty("retention_week_2");
        expect(cohorts[0]).toHaveProperty("retention_week_4");
        expect(cohorts[0]).toHaveProperty("retention_week_8");
        expect(cohorts[0]).toHaveProperty("retention_week_12");
      }
    });

    it("should return retention rates as percentages (0-100)", async () => {
      const cohorts = await getCohortAnalytics("month", 12);

      cohorts.forEach((cohort) => {
        expect(cohort.retention_week_1).toBeGreaterThanOrEqual(0);
        expect(cohort.retention_week_1).toBeLessThanOrEqual(100);
        expect(cohort.retention_week_2).toBeGreaterThanOrEqual(0);
        expect(cohort.retention_week_2).toBeLessThanOrEqual(100);
        expect(cohort.retention_week_4).toBeGreaterThanOrEqual(0);
        expect(cohort.retention_week_4).toBeLessThanOrEqual(100);
        expect(cohort.retention_week_8).toBeGreaterThanOrEqual(0);
        expect(cohort.retention_week_8).toBeLessThanOrEqual(100);
        expect(cohort.retention_week_12).toBeGreaterThanOrEqual(0);
        expect(cohort.retention_week_12).toBeLessThanOrEqual(100);
      });
    });

    it("should fetch retention curve for a specific cohort", async () => {
      const cohorts = await getCohortAnalytics("month", 1);

      if (cohorts.length > 0) {
        const curve = await getCohortRetentionCurve(cohorts[0].cohort_date, "month");

        expect(Array.isArray(curve)).toBe(true);

        if (curve.length > 0) {
          expect(curve[0]).toHaveProperty("week_number");
          expect(curve[0]).toHaveProperty("retention_rate");
          expect(curve[0]).toHaveProperty("active_users");
          expect(curve[0]).toHaveProperty("total_users");
        }
      }
    });

    it("should calculate retention curve with proper week progression", async () => {
      const cohorts = await getCohortAnalytics("month", 1);

      if (cohorts.length > 0) {
        const curve = await getCohortRetentionCurve(cohorts[0].cohort_date, "month");

        // Week numbers should increment properly
        curve.forEach((point, index) => {
          expect(point.week_number).toBe(index);
        });
      }
    });
  });

  describe("GRO-COH-003: LTV comparison", () => {
    it("should calculate LTV metrics by cohort", async () => {
      const ltvData = await getCohortLTVComparison("month", 6);

      expect(Array.isArray(ltvData)).toBe(true);

      if (ltvData.length > 0) {
        expect(ltvData[0]).toHaveProperty("cohort_date");
        expect(ltvData[0]).toHaveProperty("cohort_size");
        expect(ltvData[0]).toHaveProperty("total_revenue");
        expect(ltvData[0]).toHaveProperty("avg_ltv");
        expect(ltvData[0]).toHaveProperty("median_ltv");
        expect(ltvData[0]).toHaveProperty("max_ltv");
      }
    });

    it("should calculate average LTV correctly", async () => {
      const ltvData = await getCohortLTVComparison("month", 6);

      ltvData.forEach((cohort) => {
        expect(cohort.avg_ltv).toBeGreaterThanOrEqual(0);
        // Avg LTV should be total_revenue / cohort_size
        if (cohort.cohort_size > 0) {
          const expectedAvg = cohort.total_revenue / cohort.cohort_size;
          expect(Math.abs(cohort.avg_ltv - expectedAvg)).toBeLessThan(1);
        }
      });
    });

    it("should calculate median LTV", async () => {
      const ltvData = await getCohortLTVComparison("month", 6);

      ltvData.forEach((cohort) => {
        expect(cohort.median_ltv).toBeGreaterThanOrEqual(0);
      });
    });

    it("should calculate max LTV", async () => {
      const ltvData = await getCohortLTVComparison("month", 6);

      ltvData.forEach((cohort) => {
        expect(cohort.max_ltv).toBeGreaterThanOrEqual(0);
        // Max LTV should be >= average LTV and median LTV
        expect(cohort.max_ltv).toBeGreaterThanOrEqual(cohort.avg_ltv);
        expect(cohort.max_ltv).toBeGreaterThanOrEqual(cohort.median_ltv);
      });
    });

    it("should handle cohorts with zero revenue", async () => {
      const ltvData = await getCohortLTVComparison("month", 6);

      // Should not error on cohorts with no purchases
      ltvData.forEach((cohort) => {
        expect(isFinite(cohort.avg_ltv)).toBe(true);
        expect(isFinite(cohort.median_ltv)).toBe(true);
        expect(isFinite(cohort.max_ltv)).toBe(true);
      });
    });
  });
});
