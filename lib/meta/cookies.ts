export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export function getFbpFbc() {
  return {
    fbp: getCookie("_fbp"),
    fbc: getCookie("_fbc"),
  };
}

export function getOrCreateAnonSessionId(): string {
  if (typeof window === "undefined") return "server";
  const key = "p28_anon_session_id";
  let value = window.localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    window.localStorage.setItem(key, value);
  }
  return value;
}
