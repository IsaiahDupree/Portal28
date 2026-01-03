import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

// Backwards compatibility - lazy getter
export const resend = {
  get emails() {
    return getResend().emails;
  },
  get contacts() {
    return getResend().contacts;
  },
  get audiences() {
    return getResend().audiences;
  }
};

export const RESEND_FROM = process.env.RESEND_FROM || "Portal28 Academy <hello@portal28.academy>";

export const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
