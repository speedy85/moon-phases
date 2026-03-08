export default async function handler(req, res) {
    const APP_ID = "27685de2-620d-4c30-894a-d118792447e4";
    const APP_SECRET = "12e081084bdf8470ac719d3c004ad298d54ef92edbfa0be9aab2783401a57bb1cbbeb817fd32e5c841619574bb55c61e5be151ef8131f70dbfe3998f1dca1c836de8f04a56ef1121baccec50a3223c567521a2793e90f0e0c1d90c2350ec52c01349cbf37d9e55b5f307c1f976853d2d";
    
    // Kluczowe: AstronomyAPI wymaga Base64 z ID:Secret
    const authHeader = Buffer.from(`${APP_ID}:${APP_SECRET}`).toString('base64');

    const now = new Date();
    // Format YYYY-MM-DD
    const dateStr = now.toISOString().split('T')[0];
    // Format HH:mm:ss (bez milisekund!)
    const timeStr = now.toTimeString().split(' ')[0]; 

    const lat = 52.2297;
    const lon = 21.0122;

    try {
        // 1. ZAPYTANIE O DANE (Position) - sprawdzamy to najpierw
        const posUrl = `https://api.astronomyapi.com/api/v2/astronomy/data/position?latitude=${lat}&longitude=${lon}&elevation=1&from_date=${dateStr}&to_date=${dateStr}&time=${timeStr}&bodies=moon`;
        
        const posRes = await fetch(posUrl, {
            headers: { "Authorization": `Basic ${authHeader}` }
        });

        if (!posRes.ok) {
            const errorText = await posRes.text();
            throw new Error(`AstronomyAPI Data Error: ${posRes.status} - ${errorText}`);
        }
        const posData = await posRes.json();

        // 2. ZAPYTANIE O OBRAZ
        const imgRes = await fetch("https://api.astronomyapi.com/api/v2/studio/moon-phase", {
            method: "POST",
            headers: { 
                "Authorization": `Basic ${authHeader}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                format: "png",
                style: {
                    moonStyle: "real",
                    backgroundStyle: "stars",
                    backgroundColor: "#000000",
                    headingColor: "#ffffff",
                    textColor: "#ffffff"
                },
                observer: { latitude: lat, longitude: lon, date: dateStr },
                view: { type: "portrait-simple", orientation: "north-up" }
            })
        });

        if (!imgRes.ok) {
            const errorText = await imgRes.text();
            throw new Error(`AstronomyAPI Image Error: ${imgRes.status} - ${errorText}`);
        }
        const imgData = await imgRes.json();

        // Jeśli wszystko OK, wyślij do przeglądarki
        return res.status(200).json({
            image: imgData.data.imageUrl,
            details: posData.data.table.rows[0].cells[0]
        });

    } catch (error) {
        console.error("LOG SERWERA:", error.message);
        return res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
}