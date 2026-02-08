import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareCertificateButton } from "@/components/certificates/ShareCertificateButton";

// Mock window.open
global.open = jest.fn();

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

// Mock alert
global.alert = jest.fn();

describe("ShareCertificateButton", () => {
  const mockProps = {
    certificateNumber: "CERT-12345",
    courseTitle: "Introduction to JavaScript",
    verificationToken: "abc123token",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders share button", () => {
    render(<ShareCertificateButton {...mockProps} />);
    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
  });

  it("shows share menu when button is clicked", async () => {
    render(<ShareCertificateButton {...mockProps} />);

    const shareButton = screen.getByRole("button", { name: /share/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(screen.getByText("Share on LinkedIn")).toBeInTheDocument();
      expect(screen.getByText("Share on Twitter")).toBeInTheDocument();
      expect(screen.getByText("Share on Facebook")).toBeInTheDocument();
      expect(screen.getByText("Copy Link")).toBeInTheDocument();
    });
  });

  it("opens LinkedIn share window", async () => {
    render(<ShareCertificateButton {...mockProps} />);

    const shareButton = screen.getByRole("button", { name: /share/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      const linkedinButton = screen.getByText("Share on LinkedIn");
      fireEvent.click(linkedinButton);
    });

    expect(global.open).toHaveBeenCalledWith(
      expect.stringContaining("linkedin.com"),
      "_blank",
      "width=600,height=400"
    );
  });

  it("opens Twitter share window", async () => {
    render(<ShareCertificateButton {...mockProps} />);

    const shareButton = screen.getByRole("button", { name: /share/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      const twitterButton = screen.getByText("Share on Twitter");
      fireEvent.click(twitterButton);
    });

    expect(global.open).toHaveBeenCalledWith(
      expect.stringContaining("twitter.com/intent/tweet"),
      "_blank",
      "width=600,height=400"
    );
  });

  it("opens Facebook share window", async () => {
    render(<ShareCertificateButton {...mockProps} />);

    const shareButton = screen.getByRole("button", { name: /share/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      const facebookButton = screen.getByText("Share on Facebook");
      fireEvent.click(facebookButton);
    });

    expect(global.open).toHaveBeenCalledWith(
      expect.stringContaining("facebook.com/sharer"),
      "_blank",
      "width=600,height=400"
    );
  });

  it("copies link to clipboard", async () => {
    render(<ShareCertificateButton {...mockProps} />);

    const shareButton = screen.getByRole("button", { name: /share/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      const copyButton = screen.getByText("Copy Link");
      fireEvent.click(copyButton);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining(`/verify-certificate/${mockProps.verificationToken}`)
    );
    expect(global.alert).toHaveBeenCalledWith("Certificate link copied to clipboard!");
  });

  it("closes menu when backdrop is clicked", async () => {
    render(<ShareCertificateButton {...mockProps} />);

    const shareButton = screen.getByRole("button", { name: /share/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(screen.getByText("Share on LinkedIn")).toBeInTheDocument();
    });

    // Click backdrop
    const backdrop = document.querySelector(".fixed.inset-0");
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    await waitFor(() => {
      expect(screen.queryByText("Share on LinkedIn")).not.toBeInTheDocument();
    });
  });

  it("includes course title in share text", async () => {
    render(<ShareCertificateButton {...mockProps} />);

    const shareButton = screen.getByRole("button", { name: /share/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      const twitterButton = screen.getByText("Share on Twitter");
      fireEvent.click(twitterButton);
    });

    expect(global.open).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent(mockProps.courseTitle)),
      "_blank",
      "width=600,height=400"
    );
  });
});
