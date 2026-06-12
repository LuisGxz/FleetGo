const EARTH_RADIUS_KM = 6371;
const AVG_SPEED_KMH = 25; // urban van average — mirrors GeoMath on the server

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** "2.4 km · 9 min" style label for the detail map badge. */
export function distanceEtaLabel(lat1: number, lng1: number, lat2: number, lng2: number): string {
  const km = haversineKm(lat1, lng1, lat2, lng2);
  const minutes = Math.max(1, Math.round((km / AVG_SPEED_KMH) * 60));
  return `${km.toFixed(1)} km · ${minutes} min`;
}
