namespace FleetGo.Application.Common;

public static class GeoMath
{
    private const double EarthRadiusKm = 6371.0;

    /// <summary>Average urban delivery speed used for ETA estimates.</summary>
    public const double AvgSpeedKmh = 28.0;

    public static double HaversineKm(double lat1, double lng1, double lat2, double lng2)
    {
        var dLat = ToRad(lat2 - lat1);
        var dLng = ToRad(lng2 - lng1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                + Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2))
                * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return EarthRadiusKm * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    public static int EtaMinutes(double distanceKm) =>
        (int)Math.Ceiling(distanceKm / AvgSpeedKmh * 60);

    public static double HeadingDegrees(double lat1, double lng1, double lat2, double lng2)
    {
        var dLng = ToRad(lng2 - lng1);
        var y = Math.Sin(dLng) * Math.Cos(ToRad(lat2));
        var x = Math.Cos(ToRad(lat1)) * Math.Sin(ToRad(lat2))
                - Math.Sin(ToRad(lat1)) * Math.Cos(ToRad(lat2)) * Math.Cos(dLng);
        return (ToDeg(Math.Atan2(y, x)) + 360) % 360;
    }

    private static double ToRad(double deg) => deg * Math.PI / 180;
    private static double ToDeg(double rad) => rad * 180 / Math.PI;
}
