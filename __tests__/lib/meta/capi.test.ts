import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

describe("Meta CAPI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "test-pixel-123";
    process.env.META_CAPI_ACCESS_TOKEN = "test-access-token";
    process.env.META_API_VERSION = "v20.0";
  });

  describe("sendCapiPurchase", () => {
    it("should send purchase event with correct payload", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ events_received: 1 }),
      });

      const { sendCapiPurchase } = await import("@/lib/meta/capi");
      await sendCapiPurchase({
        event_id: "evt-123",
        value: 29.99,
        currency: "usd",
        email: "test@example.com",
        content_ids: ["course-1"],
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("graph.facebook.com"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("Purchase"),
        })
      );
    });

    it("should not send if pixel ID is missing", async () => {
      delete process.env.NEXT_PUBLIC_META_PIXEL_ID;

      const { sendCapiPurchase } = await import("@/lib/meta/capi");
      await sendCapiPurchase({
        event_id: "evt-123",
        value: 29.99,
        currency: "usd",
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should hash email before sending", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ events_received: 1 }),
      });

      const { sendCapiPurchase } = await import("@/lib/meta/capi");
      await sendCapiPurchase({
        event_id: "evt-123",
        value: 29.99,
        currency: "usd",
        email: "Test@Example.com",
      });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      
      // Email should be hashed (SHA256 of lowercase email)
      expect(body.data[0].user_data.em).toBeDefined();
      expect(body.data[0].user_data.em[0]).not.toBe("Test@Example.com");
      expect(body.data[0].user_data.em[0]).toHaveLength(64); // SHA256 hex length
    });
  });
});
