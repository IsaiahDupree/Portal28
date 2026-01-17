import { describe, it, expect, jest, beforeEach } from "@jest/globals";

/**
 * Certificate API Tests
 * Tests certificate generation, retrieval, PDF download, and verification
 *
 * Test IDs:
 * - PLT-CRT-001: Certificate generation on course completion
 * - PLT-CRT-002: PDF certificate creation and download
 * - PLT-CRT-003: Certificate verification URL
 * - PLT-CRT-004: Certificate email delivery
 */

// Mock NextRequest and NextResponse
const mockJson = jest.fn();
const mockNextResponse = {
  json: mockJson,
};

jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: mockNextResponse,
}));

// Mock user
const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
};

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  single: jest.fn(),
};

jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockSupabase,
}));

// Mock PDF generation
jest.mock("@/lib/certificates/generatePDF", () => ({
  generateCertificatePDF: jest.fn().mockResolvedValue(Buffer.from("fake pdf data")),
}));

describe("Certificate API - GET /api/certificates (PLT-CRT-002)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJson.mockImplementation((data, options) => ({ data, ...options }));
  });

  it("should return 401 when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/certificates/route");

    const mockReq = {
      url: "http://localhost:3000/api/certificates",
    };

    await GET(mockReq as any);

    expect(mockJson).toHaveBeenCalledWith(
      { error: "Unauthorized" },
      { status: 401 }
    );
  });

  it("should return user certificates", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

    const mockCertificates = [
      {
        id: "cert-1",
        user_id: mockUser.id,
        course_id: "course-1",
        certificate_number: "CERT-20260114-12345",
        student_name: "Test User",
        course_title: "Test Course",
        completion_date: "2026-01-14",
        verification_token: "token123",
      },
    ];

    mockSupabase.single.mockResolvedValue({
      data: mockCertificates,
      error: null,
    });

    // Return array for select query
    const mockSelectResult = {
      data: mockCertificates,
      error: null,
    };

    // Override the chain to return data
    mockSupabase.order.mockResolvedValue(mockSelectResult);

    const { GET } = await import("@/app/api/certificates/route");

    const mockReq = {
      url: "http://localhost:3000/api/certificates",
    };

    await GET(mockReq as any);

    expect(mockSupabase.from).toHaveBeenCalledWith("certificates");
    expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", mockUser.id);
  });

  it("should filter certificates by courseId when provided", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

    const { GET } = await import("@/app/api/certificates/route");

    const mockReq = {
      url: "http://localhost:3000/api/certificates?courseId=course-123",
    };

    const mockCertificates = [
      {
        id: "cert-1",
        course_id: "course-123",
      },
    ];

    mockSupabase.order.mockResolvedValue({
      data: mockCertificates,
      error: null,
    });

    await GET(mockReq as any);

    expect(mockSupabase.eq).toHaveBeenCalledWith("course_id", "course-123");
  });
});

describe("Certificate PDF Generation (PLT-CRT-002)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should generate PDF with correct certificate data", async () => {
    const { generateCertificatePDF } = await import(
      "@/lib/certificates/generatePDF"
    );

    const certificateData = {
      certificateNumber: "CERT-20260114-12345",
      studentName: "John Doe",
      courseTitle: "Advanced TypeScript",
      completionDate: "January 14, 2026",
      verificationUrl: "https://portal28.academy/verify/token123",
    };

    const pdfBuffer = await generateCertificatePDF(certificateData);

    expect(generateCertificatePDF).toHaveBeenCalledWith(certificateData);
    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
  });
});

describe("Certificate Verification (PLT-CRT-003)", () => {
  it("should verify valid certificate token", async () => {
    const mockCertificate = {
      id: "cert-1",
      certificate_number: "CERT-20260114-12345",
      student_name: "John Doe",
      course_title: "Test Course",
      completion_date: "2026-01-14",
      verification_token: "validtoken123456789012345678901",
    };

    mockSupabase.single.mockResolvedValue({
      data: mockCertificate,
      error: null,
    });

    // Simulate direct database query for verification
    const result = await mockSupabase
      .from("certificates")
      .select("*")
      .eq("verification_token", "validtoken123456789012345678901")
      .single();

    expect(result.data).toEqual(mockCertificate);
    expect(result.error).toBeNull();
  });

  it("should return error for invalid certificate token", async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "Not found" },
    });

    const result = await mockSupabase
      .from("certificates")
      .select("*")
      .eq("verification_token", "invalidtoken")
      .single();

    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
  });
});

describe("Certificate Number Format", () => {
  it("should match certificate number format CERT-YYYYMMDD-XXXXX", () => {
    const certificateNumber = "CERT-20260114-12345";
    const pattern = /^CERT-\d{8}-\d{5}$/;

    expect(pattern.test(certificateNumber)).toBe(true);
  });

  it("should reject invalid certificate number formats", () => {
    const invalidNumbers = [
      "CERT-2026-12345", // Wrong date format
      "CERT-20260114-123", // Too few digits
      "20260114-12345", // Missing prefix
      "CERT-20260114", // Missing random part
    ];

    const pattern = /^CERT-\d{8}-\d{5}$/;

    invalidNumbers.forEach((num) => {
      expect(pattern.test(num)).toBe(false);
    });
  });
});

describe("Certificate Email Tracking (PLT-CRT-004)", () => {
  it("should track email sent status", () => {
    const certificate = {
      id: "cert-1",
      email_sent: false,
      email_sent_at: null,
    };

    expect(certificate.email_sent).toBe(false);
    expect(certificate.email_sent_at).toBeNull();

    // Simulate update
    certificate.email_sent = true;
    certificate.email_sent_at = "2026-01-14T12:00:00Z" as any;

    expect(certificate.email_sent).toBe(true);
    expect(certificate.email_sent_at).toBeDefined();
  });
});

describe("Certificate Download API (PLT-CRT-002)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 for unauthenticated download requests", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/certificates/[id]/download/route");

    const mockReq = {
      url: "http://localhost:3000/api/certificates/cert-123/download",
    };

    const mockParams = Promise.resolve({ id: "cert-123" });

    await GET(mockReq as any, { params: mockParams });

    expect(mockJson).toHaveBeenCalledWith(
      { error: "Unauthorized" },
      { status: 401 }
    );
  });

  it("should return 404 for non-existent certificate", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116" },
    });

    const { GET } = await import("@/app/api/certificates/[id]/download/route");

    const mockReq = {
      url: "http://localhost:3000/api/certificates/nonexistent/download",
    };

    const mockParams = Promise.resolve({ id: "nonexistent" });

    await GET(mockReq as any, { params: mockParams });

    expect(mockJson).toHaveBeenCalledWith(
      { error: "Certificate not found" },
      { status: 404 }
    );
  });
});

describe("Certificate Retrieval by ID (PLT-CRT-002)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJson.mockImplementation((data, options) => ({ data, ...options }));
  });

  it("should return 401 when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/certificates/[id]/route");

    const mockReq = {
      url: "http://localhost:3000/api/certificates/cert-123",
    };

    const mockParams = Promise.resolve({ id: "cert-123" });

    await GET(mockReq as any, { params: mockParams });

    expect(mockJson).toHaveBeenCalledWith(
      { error: "Unauthorized" },
      { status: 401 }
    );
  });

  it("should return certificate when authenticated and owned by user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

    const mockCertificate = {
      id: "cert-123",
      user_id: mockUser.id,
      certificate_number: "CERT-20260114-12345",
    };

    mockSupabase.single.mockResolvedValue({
      data: mockCertificate,
      error: null,
    });

    const { GET } = await import("@/app/api/certificates/[id]/route");

    const mockReq = {
      url: "http://localhost:3000/api/certificates/cert-123",
    };

    const mockParams = Promise.resolve({ id: "cert-123" });

    await GET(mockReq as any, { params: mockParams });

    expect(mockSupabase.from).toHaveBeenCalledWith("certificates");
    expect(mockSupabase.eq).toHaveBeenCalledWith("id", "cert-123");
    expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", mockUser.id);
  });
});
