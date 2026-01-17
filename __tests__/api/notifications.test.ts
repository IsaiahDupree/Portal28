import { NextRequest } from "next/server";
import { GET, POST, PATCH } from "@/app/api/notifications/route";
import { POST as MarkAllRead } from "@/app/api/notifications/mark-all-read/route";
import { GET as GetPreferences, PUT as UpdatePreferences } from "@/app/api/notifications/preferences/route";
import { supabaseServer } from "@/lib/supabase/server";

jest.mock("@/lib/supabase/server");

const mockSupabaseServer = supabaseServer as jest.MockedFunction<typeof supabaseServer>;

describe("/api/notifications", () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      insert: jest.fn(() => mockSupabase),
      update: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      order: jest.fn(() => mockSupabase),
      range: jest.fn(() => mockSupabase),
      single: jest.fn(() => mockSupabase),
    };

    mockSupabaseServer.mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/notifications", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const req = new NextRequest("http://localhost:2828/api/notifications");
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return notifications for authenticated user", async () => {
      const userId = "user-123";
      const mockNotifications = [
        {
          id: "notif-1",
          user_id: userId,
          type: "comment",
          title: "New comment",
          message: "Someone commented on your post",
          link: "/app/lesson/123",
          is_read: false,
          created_at: "2026-01-14T00:00:00Z",
          metadata: {},
        },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      mockSupabase.range.mockResolvedValue({
        data: mockNotifications,
        error: null,
      });

      mockSupabase.select.mockImplementation((fields: string) => {
        if (fields === "*") {
          return mockSupabase;
        }
        return {
          ...mockSupabase,
          head: true,
        };
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "notifications") {
          return mockSupabase;
        }
        return mockSupabase;
      });

      // Mock count query
      const countQuery = {
        count: jest.fn().mockResolvedValue(1),
      };
      mockSupabase.eq.mockImplementation((field: string, value: any) => {
        if (field === "is_read") {
          return countQuery;
        }
        return mockSupabase;
      });

      const req = new NextRequest("http://localhost:2828/api/notifications");
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toHaveLength(1);
      expect(data.notifications[0].id).toBe("notif-1");
    });

    it("should filter unread notifications when unreadOnly=true", async () => {
      const userId = "user-123";

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      mockSupabase.range.mockResolvedValue({
        data: [],
        error: null,
      });

      const req = new NextRequest(
        "http://localhost:2828/api/notifications?unreadOnly=true"
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
      expect(mockSupabase.eq).toHaveBeenCalledWith("is_read", false);
    });
  });

  describe("POST /api/notifications", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const req = new NextRequest("http://localhost:2828/api/notifications", {
        method: "POST",
        body: JSON.stringify({
          type: "comment",
          title: "Test",
          message: "Test message",
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should create a notification", async () => {
      const userId = "user-123";
      const mockNotification = {
        id: "notif-1",
        user_id: userId,
        type: "comment",
        title: "Test",
        message: "Test message",
        link: null,
        is_read: false,
        created_at: "2026-01-14T00:00:00Z",
        metadata: {},
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: mockNotification,
        error: null,
      });

      const req = new NextRequest("http://localhost:2828/api/notifications", {
        method: "POST",
        body: JSON.stringify({
          type: "comment",
          title: "Test",
          message: "Test message",
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notification.id).toBe("notif-1");
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it("should return 400 if required fields are missing", async () => {
      const userId = "user-123";

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      const req = new NextRequest("http://localhost:2828/api/notifications", {
        method: "POST",
        body: JSON.stringify({
          type: "comment",
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });
  });

  describe("PATCH /api/notifications", () => {
    it("should mark a notification as read", async () => {
      const userId = "user-123";
      const notificationId = "notif-1";

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      mockSupabase.eq.mockResolvedValue({
        error: null,
      });

      const req = new NextRequest("http://localhost:2828/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({
          notificationId,
          isRead: true,
        }),
      });

      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalled();
    });
  });

  describe("POST /api/notifications/mark-all-read", () => {
    it("should mark all notifications as read", async () => {
      const userId = "user-123";

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      mockSupabase.eq.mockResolvedValue({
        error: null,
      });

      const req = new NextRequest(
        "http://localhost:2828/api/notifications/mark-all-read",
        { method: "POST" }
      );

      const response = await MarkAllRead(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("GET /api/notifications/preferences", () => {
    it("should return user preferences", async () => {
      const userId = "user-123";
      const mockPreferences = {
        id: "pref-1",
        user_id: userId,
        email_on_comment: true,
        email_on_reply: true,
        email_on_announcement: true,
        email_on_course_update: true,
        in_app_notifications: true,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: mockPreferences,
        error: null,
      });

      const req = new NextRequest(
        "http://localhost:2828/api/notifications/preferences"
      );

      const response = await GetPreferences(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences.id).toBe("pref-1");
    });

    it("should create default preferences if none exist", async () => {
      const userId = "user-123";

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      // First call returns no data (PGRST116 error)
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      });

      // Second call returns newly created preferences
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "pref-new",
          user_id: userId,
          email_on_comment: true,
          email_on_reply: true,
          email_on_announcement: true,
          email_on_course_update: true,
          in_app_notifications: true,
        },
        error: null,
      });

      const req = new NextRequest(
        "http://localhost:2828/api/notifications/preferences"
      );

      const response = await GetPreferences(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences.id).toBe("pref-new");
      expect(mockSupabase.insert).toHaveBeenCalled();
    });
  });

  describe("PUT /api/notifications/preferences", () => {
    it("should update user preferences", async () => {
      const userId = "user-123";

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: "pref-1",
          user_id: userId,
          email_on_comment: false,
          email_on_reply: true,
          email_on_announcement: true,
          email_on_course_update: true,
          in_app_notifications: true,
        },
        error: null,
      });

      const req = new NextRequest(
        "http://localhost:2828/api/notifications/preferences",
        {
          method: "PUT",
          body: JSON.stringify({
            email_on_comment: false,
          }),
        }
      );

      const response = await UpdatePreferences(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences.email_on_comment).toBe(false);
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it("should return 400 if no valid preferences provided", async () => {
      const userId = "user-123";

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      const req = new NextRequest(
        "http://localhost:2828/api/notifications/preferences",
        {
          method: "PUT",
          body: JSON.stringify({}),
        }
      );

      const response = await UpdatePreferences(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("No valid preferences");
    });
  });
});
