export default async function handler(req, res) {
    // Używamy trim(), aby wyeliminować niewidoczne spacje/entery
    const APP_ID = "27685de2-620d-4c30-894a-d118792447e4".trim();
    const APP_SECRET = "12e081084bdf8470ac719d3c004ad298d54ef92edbfa0be9aab2783401a57bb1cbbeb817fd32e5c841619574bb55c61e5be151ef8131f70dbfe3998f1dca1c836de8f04a56ef1121baccec50a3223c567521a2793e90f0e0c1d90c2350ec52c01349cbf37d9e55b5f307c1f976853d2d".trim();
    
    // Tworzymy ciąg "ID:SECRET"
    const credentials = `${APP_ID}:${APP_SECRET}`;
    const authHeader = Buffer.from(credentials).toString('base64');

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0]; 

    const lat = 52.2297;
    const lon = 21.0122;

    try {
        // 1. DANE POZYCJI
        const params = new URLSearchParams({
            latitude: lat.toString(),
            longitude: lon.toString(),
            elevation: "1",
            from_date: dateStr,
            to_date: dateStr,
            time: timeStr,
            bodies: "moon"
        });

        const posRes = await fetch(`https://api.astronomyapi.com/api/v2/astronomy/data/position?${params.toString()}`, {
            headers: { 
                "Authorization": `Basic ${authHeader}` 
            }
        });

        if (!posRes.ok) {
            const errorText = await posRes.text();
            // Logujemy dla Ciebie w Vercel co dokładnie poszło nie tak
            console.error("Szczegóły błędu 403:", errorText);
            throw new Error(`Status ${posRes.status}: ${errorText}`);
        }
        
        const posData = await posRes.json();

        // 2. OBRAZ
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

        const imgData = await imgRes.json();

        return res.status(200).json({
            image: imgData.data.imageUrl,
            details: posData.data.table.rows[0].cells[0]
        });

    } catch (error) {
        return res.status(500).json({ 
            error: true,
            message: error.message 
        });
    }
}