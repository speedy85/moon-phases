export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // TUTAJ WKLEJ KLUCZ Z IPGEOLOCATION.IO
    const API_KEY = "daf9b7cccf0247ebb7ade78e1f68c2be"; 

    try {
        // Zapytanie o dane dla Warszawy
        const url = `https://api.ipgeolocation.io/astronomy?apiKey=${API_KEY}&location=Warsaw,PL`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || "Błąd API");

        // Dane z tego API są bardzo proste w obsłudze
        return res.status(200).json({
            image: `https://www.icalendar37.net/lunar/api/i.png?lang=pl&month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}&size=300&light=1&shade=1&text=0`, 
            details: {
                phase: data.moon_phase || "Brak danych",
                illumination: data.moon_illumination + "%",
                age: data.moon_age,
                rise: data.moonrise,
                set: data.moonset,
                dist: "Dane niedostępne w tym API"
            }
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}