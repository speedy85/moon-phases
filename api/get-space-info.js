export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const NASA_KEY = "8BGxyyHgdKJcxBxXt6UfxKeXr1BgBtYAH12BJhUq"; // Zmień na swój klucz z api.nasa.gov dla większych limitów
    const today = new Date().toISOString().split('T')[0];

    try {
        // 1. Pobieranie Zdjęcia Dnia (APOD)
        const apodRes = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`);
        const apodData = await apodRes.json();

        // 2. Pobieranie Asteroid (NeoWs) z zabezpieczeniem
        let nearestAsteroid = null;
        try {
            const neoRes = await fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${NASA_KEY}`);
            const neoData = await neoRes.json();
            
            const asteroids = (neoData.near_earth_objects && neoData.near_earth_objects[today]) || [];
            
            if (asteroids.length > 0) {
                const closest = asteroids.reduce((prev, curr) => {
                    const distPrev = parseFloat(prev.close_approach_data[0].miss_distance.kilometers);
                    const distCurr = parseFloat(curr.close_approach_data[0].miss_distance.kilometers);
                    return distPrev < distCurr ? prev : curr;
                });

                nearestAsteroid = {
                    name: closest.name,
                    distance: Math.round(parseFloat(closest.close_approach_data[0].miss_distance.kilometers)).toLocaleString() + " km",
                    time: closest.close_approach_data[0].close_approach_time_full ? 
                          closest.close_approach_data[0].close_approach_time_full.split(" ")[1] : "Brak danych",
                    isDangerous: closest.is_potentially_hazardous_asteroid
                };
            }
        } catch (e) { console.error("NeoWs Error:", e); }

        // 3. Pobieranie liczby ludzi (ZMIANA NA HTTPS)
        let spaceStats = { number: 0, people: [] };
        try {
            const astrosRes = await fetch('https://api.open-notify.org/astros.json', { cache: 'no-store' });
            if (astrosRes.ok) spaceStats = await astrosRes.json();
        } catch (e) { console.error("Astros Error:", e); }

        // Finalna odpowiedź
        res.status(200).json({
            peopleInSpace: spaceStats.number || 0,
            astrosNames: spaceStats.people.map(p => p.name).join(", ") || "Brak danych",
            apod: {
                title: apodData.title || "Kosmiczne zdjęcie",
                url: apodData.url || "",
                explanation: apodData.explanation || ""
            },
            nearestAsteroid: nearestAsteroid
        });

    } catch (error) {
        console.error("Global Handler Error:", error.message);
        res.status(500).json({ error: "Błąd serwera: " + error.message });
    }
}