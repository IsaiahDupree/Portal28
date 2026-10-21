const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const SITE_URL = configuredSiteUrl
  ? new URL(configuredSiteUrl).origin
  : "https://www.portal28.academy";
