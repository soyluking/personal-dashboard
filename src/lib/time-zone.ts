import { cookies } from "next/headers";
import { DEFAULT_TIME_ZONE, isValidTimeZone } from "./dates";

export const TIME_ZONE_COOKIE = "tz";

// Zona horaria del dispositivo, que TimeZoneSync guarda en una cookie.
export async function userTimeZone(): Promise<string> {
  const tz = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  return tz && isValidTimeZone(tz) ? tz : DEFAULT_TIME_ZONE;
}
