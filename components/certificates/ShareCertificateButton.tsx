"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

interface ShareCertificateButtonProps {
  certificateNumber: string;
  courseTitle: string;
  verificationToken: string;
}

export function ShareCertificateButton({
  certificateNumber,
  courseTitle,
  verificationToken,
}: ShareCertificateButtonProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://portal28.academy";
  const verificationUrl = `${siteUrl}/verify-certificate/${verificationToken}`;

  const shareText = `I just completed "${courseTitle}" on Portal28 Academy! View my certificate: ${verificationUrl}`;

  const handleShare = (platform: "linkedin" | "twitter" | "facebook" | "copy") => {
    let url = "";

    switch (platform) {
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verificationUrl)}`;
        break;
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
        break;
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(verificationUrl)}`;
        break;
      case "copy":
        navigator.clipboard.writeText(verificationUrl);
        alert("Certificate link copied to clipboard!");
        setShowShareMenu(false);
        return;
    }

    if (url) {
      window.open(url, "_blank", "width=600,height=400");
      setShowShareMenu(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowShareMenu(!showShareMenu)}
        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share
      </button>

      {showShareMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowShareMenu(false)}
          />

          {/* Share menu */}
          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1" role="menu">
              <button
                onClick={() => handleShare("linkedin")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                Share on LinkedIn
              </button>
              <button
                onClick={() => handleShare("twitter")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                Share on Twitter
              </button>
              <button
                onClick={() => handleShare("facebook")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                Share on Facebook
              </button>
              <button
                onClick={() => handleShare("copy")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                Copy Link
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
