import { cookies } from "next/headers";

export function getAttribCookie() {
  const c = cookies().get("p28_attrib")?.value;
  if (!c) return null;
  try {
    return JSON.parse(c);
  } catch {
    return null;
  }
}
