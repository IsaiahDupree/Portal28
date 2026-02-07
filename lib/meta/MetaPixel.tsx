"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { hasConsent } from "@/lib/cookies/consent";

export function MetaPixel() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  useEffect(() => {
    // Check if user has consented to marketing cookies
    const checkConsent = () => {
      setShouldLoad(hasConsent("marketing"));
    };

    // Check consent on mount
    checkConsent();

    // Listen for consent changes
    window.addEventListener("consentChanged", checkConsent);

    return () => {
      window.removeEventListener("consentChanged", checkConsent);
    };
  }, []);

  if (!pixelId || pixelId.trim() === "") return null;
  if (!shouldLoad) return null; // Don't load until consent given

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
