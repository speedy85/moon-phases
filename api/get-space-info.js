export default async function handler(req, res) {
    // Nagłówki CORS i bezpieczeństwa
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // Twój klucz NASA
    const NASA_KEY = "8BGxyyHgdKJcxBxXt6UfxKeXr1BgBtYAH12"; 
    const today = new Date().toISOString().split('T')[0];

    try {
        // --- 1. POBIERANIE ZDJĘCIA DNIA (APOD) ---
        let apodData = { title: "Kosmos", url: "", explanation: "" };
        try {
            const apodRes = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`);
            if (apodRes.ok) apodData = await apodRes.json();
        } catch (e) { console.error("APOD Error:", e); }

        // --- 2. POBIERANIE ASTEROID (NeoWs) ---
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
                    name: closest.name.replace('(', '').replace(')', ''),
                    distance: Math.round(parseFloat(closest.close_approach_data[0].miss_distance.kilometers)).toLocaleString() + " km",
                    time: closest.close_approach_data[0].close_approach_time_full ? 
                          closest.close_approach_data[0].close_approach_time_full.split(" ")[1] : "Brak danych",
                    isDangerous: closest.is_potentially_hazardous_asteroid
                };
            }
        } catch (e) { console.error("Asteroids Error:", e); }

        // --- 3. POBIERANIE LUDZI W KOSMOSIE (ISS vs Tiangong) ---
        let spaceInfo = { total: 0, iss: 0, tiangong: 0, others: 0 };
        try {
            // Używamy stabilnego API The Space Devs
            const astrosRes = await fetch('https://ll.thespacedevs.com/2.2.0/astronaut/?in_space=true&limit=30');
            if (astrosRes.ok) {
                const data = await astrosRes.json();
                spaceInfo.total = data.count;

                data.results.forEach(astro => {
                    // Sprawdzamy lokalizację ostatniego lotu astronauty
                    const flights = astro.flights || [];
                    const lastFlight = flights[flights.length - 1];
                    const location = (lastFlight && lastFlight.location) ? lastFlight.location.toLowerCase() : "";
                    
                    if (location.includes("international space station") || location.includes("iss")) {
                        spaceInfo.iss++;
                    } else if (location.includes("tiangong") || location.includes("chinese space station") || location.includes("tss")) {
                        spaceInfo.tiangong++;
                    } else {
                        spaceInfo.others++;
                    }
                });
            }
        } catch (e) { 
            console.error("SpaceDevs Error:", e);
            spaceInfo.total = "brak danych"; 
        }

        // --- FINALNA ODPOWIEDŹ JSON ---
        res.status(200).json({
            peopleInSpace: spaceInfo.total,
            details: {
                iss: spaceInfo.iss,
                tiangong: spaceInfo.tiangong,
                others: spaceInfo.others
            },
            apod: {
                title: apodData.title,
                url: apodData.url,
                explanation: apodData.explanation
            },
            nearestAsteroid: nearestAsteroid
        });

    } catch (error) {
        console.error("Global Handler Error:", error);
        res.status(500).json({ error: "Wystąpił błąd serwera." });
    }
}