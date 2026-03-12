export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // Wstaw swój klucz z ipgeolocation.io
    const API_KEY = "daf9b7cccf0247ebb7ade78e1f68c2be"; 

    // Współrzędne Warszawy: lat=52.2297, long=21.0122
    const lat = "52.2297";
    const lon = "21.0122";

    try {
        const url = `https://api.ipgeolocation.io/astronomy?apiKey=${API_KEY}&lat=${lat}&long=${lon}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || "Błąd API");

        res.status(200).json({
            image: `https://www.icalendar37.net/lunar/api/i.png?lang=pl&month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}&size=300&light=1&shade=1&text=0&LDZ=${new Date().getTime()}`,
            details: {
                phase: data.moon_phase,
                illumination: Math.round(data.moon_illumination) + "%",
                rise: data.moonrise,
                set: data.moonset,
                distance: Math.round(data.moon_distance).toLocaleString() + " km",
                azimuth: data.moon_azimuth ? Math.round(data.moon_azimuth) + "°" : "N/A"
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}