// Portal28 Email Tagging System
// Tags are attached to every email send for attribution tracking

export interface EmailTags {
  p28_send_id: string;        // UUID of the email_sends row
  p28_contact_id?: string;    // Contact ID
  p28_program_id?: string;    // Email program ID
  p28_version_id?: string;    // Email version ID
  p28_run_id?: string;        // Email run ID
  p28_step_key?: string;      // Step identifier (e.g., "day_1_nudge")
  p28_campaign?: string;      // Campaign name (for attribution)
  p28_type?: string;          // Type: transactional, marketing, automation
}

export function buildEmailTags(options: {
  sendId: string;
  contactId?: string;
  programId?: string;
  versionId?: string;
  runId?: string;
  stepKey?: string;
  campaign?: string;
  type?: "transactional" | "marketing" | "automation";
}): EmailTags {
  return {
    p28_send_id: options.sendId,
    p28_contact_id: options.contactId,
    p28_program_id: options.programId,
    p28_version_id: options.versionId,
    p28_run_id: options.runId,
    p28_step_key: options.stepKey,
    p28_campaign: options.campaign,
    p28_type: options.type
  };
}

export function tagsToResendFormat(tags: EmailTags): Array<{ name: string; value: string }> {
  return Object.entries(tags)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([name, value]) => ({ name, value: String(value) }));
}

export function parseTagsFromResend(
  tags: Array<{ name: string; value: string }> | undefined
): Partial<EmailTags> {
  if (!tags) return {};
  
  const result: Partial<EmailTags> = {};
  for (const tag of tags) {
    if (tag.name.startsWith("p28_")) {
      (result as Record<string, string>)[tag.name] = tag.value;
    }
  }
  return result;
}

// Build UTM parameters for email CTAs
export function buildEmailUtmParams(options: {
  sendId: string;
  programId?: string;
  stepKey?: string;
  campaign?: string;
}): URLSearchParams {
  const params = new URLSearchParams();
  
  params.set("utm_source", "portal28");
  params.set("utm_medium", "email");
  
  if (options.campaign) {
    params.set("utm_campaign", options.campaign);
  }
  
  if (options.stepKey) {
    params.set("utm_content", options.stepKey);
  }
  
  // First-party attribution ID
  params.set("eid", options.sendId);
  
  return params;
}

// Append UTM params to a URL
export function appendUtmToUrl(
  url: string,
  options: {
    sendId: string;
    programId?: string;
    stepKey?: string;
    campaign?: string;
  }
): string {
  try {
    const urlObj = new URL(url);
    const utmParams = buildEmailUtmParams(options);
    
    // Append each UTM param
    utmParams.forEach((value, key) => {
      urlObj.searchParams.set(key, value);
    });
    
    return urlObj.toString();
  } catch {
    // If URL parsing fails, return original
    return url;
  }
}

// Process HTML content to add UTM params to all links
export function addUtmToEmailHtml(
  html: string,
  options: {
    sendId: string;
    programId?: string;
    stepKey?: string;
    campaign?: string;
  }
): string {
  // Simple regex to find href attributes
  const hrefRegex = /href=["']([^"']+)["']/gi;
  
  return html.replace(hrefRegex, (match, url) => {
    // Skip mailto, tel, and anchor links
    if (url.startsWith("mailto:") || url.startsWith("tel:") || url.startsWith("#")) {
      return match;
    }
    
    // Skip unsubscribe placeholders
    if (url.includes("RESEND_UNSUBSCRIBE") || url.includes("unsubscribe")) {
      return match;
    }
    
    const trackedUrl = appendUtmToUrl(url, options);
    return `href="${trackedUrl}"`;
  });
}
