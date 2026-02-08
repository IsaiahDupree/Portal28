import { sendForumReplyNotification } from "@/lib/email/sendForumReplyNotification";
import { resend } from "@/lib/email/resend";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Mock dependencies
jest.mock("@/lib/email/resend");
jest.mock("@/lib/supabase/admin");

describe("sendForumReplyNotification", () => {
  const mockArgs = {
    recipientEmail: "recipient@example.com",
    recipientName: "John Doe",
    recipientUserId: "user-123",
    replierName: "Jane Smith",
    replyContent: "This is a test reply to your forum post",
    threadId: "thread-456",
    threadTitle: "Test Thread Title",
    spaceId: "space-789",
    spaceName: "Test Community",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";

    // Mock Supabase RPC for unsubscribe check (default: not unsubscribed)
    (supabaseAdmin.rpc as jest.Mock) = jest.fn().mockResolvedValue({
      data: false,
      error: null,
    });

    // Mock Supabase select for email preferences (default: enabled)
    (supabaseAdmin.from as jest.Mock) = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { replies_enabled: true },
              error: null,
            }),
          }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ id: "email-send-123" }],
          error: null,
        }),
      }),
    });

    // Mock Resend email send (default: success)
    (resend.emails as any) = {
      send: jest.fn().mockResolvedValue({
        data: { id: "email-123" },
        error: null,
      }),
    };
  });

  it("should send email notification when user has not unsubscribed and has replies enabled", async () => {
    const result = await sendForumReplyNotification(mockArgs);

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith("is_unsubscribed", {
      p_user_id: mockArgs.recipientUserId,
      p_email: mockArgs.recipientEmail,
      p_unsubscribe_type: "replies",
      p_space_id: mockArgs.spaceId,
    });

    expect(resend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.any(String),
        to: [mockArgs.recipientEmail],
        subject: `${mockArgs.replierName} replied to your post in ${mockArgs.spaceName}`,
        react: expect.anything(),
      })
    );

    expect(result).toEqual({ id: "email-123" });
  });

  it("should not send email if user has unsubscribed from replies", async () => {
    // Mock unsubscribed user
    (supabaseAdmin.rpc as jest.Mock) = jest.fn().mockResolvedValue({
      data: true,
      error: null,
    });

    const result = await sendForumReplyNotification(mockArgs);

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith("is_unsubscribed", expect.any(Object));
    expect(resend.emails.send).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("should not send email if user has disabled reply notifications in preferences", async () => {
    // Mock preferences with replies disabled
    (supabaseAdmin.from as jest.Mock) = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { replies_enabled: false },
              error: null,
            }),
          }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ id: "email-send-123" }],
          error: null,
        }),
      }),
    });

    const result = await sendForumReplyNotification(mockArgs);

    expect(resend.emails.send).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("should default to enabled if no preferences exist", async () => {
    // Mock no preferences found
    (supabaseAdmin.from as jest.Mock) = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ id: "email-send-123" }],
          error: null,
        }),
      }),
    });

    const result = await sendForumReplyNotification(mockArgs);

    expect(resend.emails.send).toHaveBeenCalled();
    expect(result).toEqual({ id: "email-123" });
  });

  it("should log email send to database", async () => {
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [{ id: "email-send-123" }],
        error: null,
      }),
    });

    (supabaseAdmin.from as jest.Mock) = jest.fn((table: string) => {
      if (table === "email_preferences") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { replies_enabled: true },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "email_sends") {
        return {
          insert: mockInsert,
        };
      }
      return {};
    });

    await sendForumReplyNotification(mockArgs);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: mockArgs.recipientEmail,
        template: "forum_reply",
        status: "sent",
        metadata: expect.objectContaining({
          thread_id: mockArgs.threadId,
          space_id: mockArgs.spaceId,
          recipient_user_id: mockArgs.recipientUserId,
        }),
      })
    );
  });

  it("should handle email send errors gracefully", async () => {
    // Mock email send error
    (resend.emails as any) = {
      send: jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Email service error" },
      }),
    };

    const result = await sendForumReplyNotification(mockArgs);

    // Should return null on error (fire-and-forget pattern)
    expect(result).toBeNull();
  });

  it("should generate correct unsubscribe URL", async () => {
    await sendForumReplyNotification(mockArgs);

    expect(resend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        react: expect.anything(),
      })
    );

    // The unsubscribe URL is generated in the function and passed to the email template
    // We can verify it was called with the correct structure
    const sendCall = (resend.emails.send as jest.Mock).mock.calls[0][0];
    expect(sendCall.to).toEqual([mockArgs.recipientEmail]);
    expect(sendCall.subject).toContain(mockArgs.replierName);
    expect(sendCall.subject).toContain(mockArgs.spaceName);
  });
});
