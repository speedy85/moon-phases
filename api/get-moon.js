export default async function handler(req, res) {
    // Twoje dane dostępowe
    const APP_ID = "27685de2-620d-4c30-894a-d118792447e4";
    const APP_SECRET = "12e081084bdf8470ac719d3c004ad298d54ef92edbfa0be9aab2783401a57bb1cbbeb817fd32e5c841619574bb55c61e5be151ef8131f70dbfe3998f1dca1c836de8f04a56ef1121baccec50a3223c567521a2793e90f0e0c1d90c2350ec52c01349cbf37d9e55b5f307c1f976853d2d";
    
    // Kodowanie do Base64 dla nagłówka Authorization
    const authHeader = Buffer.from(`${APP_ID}:${APP_SECRET}`).toString('base64');

    // Dzisiejsza data i współrzędne Warszawy
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];
    const lat = 52.2297;
    const lon = 21.0122;

    try {
        // 1. ZAPYTANIE O OBRAZ (Moon Phase Studio)
        const imgResponse = await fetch("https://api.astronomyapi.com/api/v2/studio/moon-phase", {
            method: "POST",
            headers: { 
                "Authorization": `Basic ${authHeader}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "format": "png",
                "style": {
                    "moonStyle": "real",
                    "backgroundStyle": "stars",
                    "backgroundColor": "#000000",
                    "headingColor": "#ffffff",
                    "textColor": "#ffffff"
                },
                "observer": { "latitude": lat, "longitude": lon, "date": dateStr },
                "view": { "type": "portrait-simple", "orientation": "north-up" }
            })
        });

        if (!imgResponse.ok) {
            const errBody = await imgResponse.text();
            throw new Error(`Błąd obrazu API: ${imgResponse.status} - ${errBody}`);
        }
        const imgData = await imgResponse.json();

        // 2. ZAPYTANIE O DANE ASTRONOMICZNE (Position)
        const posResponse = await fetch(`https://api.astronomyapi.com/api/v2/astronomy/data/position?latitude=${lat}&longitude=${lon}&elevation=1&from_date=${dateStr}&to_date=${dateStr}&time=${timeStr}&bodies=moon`, {
            headers: { "Authorization": `Basic ${authHeader}` }
        });

        if (!posResponse.ok) {
            throw new Error(`Błąd danych API: ${posResponse.status}`);
        }
        const posData = await posResponse.json();

        // Wyciągnięcie konkretnych danych o księżycu z odpowiedzi
        const moonDetails = posData.data.table.rows[0].cells[0];

        // 3. WYSYŁKA ZBIORCZEJ ODPOWIEDZI DO FRONTENDU
        res.status(200).json({
            image: imgData.data.imageUrl,
            details: moonDetails,
            timestamp: timeStr
        });

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ 
            error: "Wystąpił błąd podczas pobierania danych z AstronomyAPI",
            message: error.message 
        });
    }
}