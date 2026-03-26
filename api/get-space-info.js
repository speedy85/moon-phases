export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const NASA_KEY = "8BGxyyHgdKJcxBxXt6UfxKeXr1BgBtYAH12BJhUq";
    const today = new Date().toISOString().split('T')[0];

    try {
        // 1. APOD
        let apodData = { title: "Kosmos", url: "", explanation: "", media_type: "image" };
        const apodRes = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`);
        if (apodRes.ok) {
            const data = await apodRes.json();
            apodData = { title: data.title, url: data.url, explanation: data.explanation, media_type: data.media_type };
        }

        // 2. NEO - Asteroidy (Poprawiony czas)
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

                // Szukamy czasu w kilku miejscach
                let timeStr = "Brak danych";
                const cad = closest.close_approach_data[0];
                if (cad.close_approach_date_full) {
                    timeStr = cad.close_approach_date_full.split(" ")[1];
                } else {
                    // Jeśli brak pełnej daty, formatujemy z samej godziny (często dostępna w innym polu)
                    timeStr = new Date(cad.epoch_date_close_approach).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
                }

                nearestAsteroid = {
                    name: closest.name.replace(/[()]/g, ''),
                    distance: Math.round(parseFloat(cad.miss_distance.kilometers)).toLocaleString() + " km",
                    time: timeStr,
                    isDangerous: closest.is_potentially_hazardous_asteroid
                };
            }
        } catch (e) { console.error("NEO Error:", e.message); }

        // 3. Ludzie (Maksymalnie uproszczone rozpoznawanie stacji)
        let spaceInfo = { total: 0, iss: 0, tiangong: 0, others: 0 };
        try {
            const astrosRes = await fetch('https://ll.thespacedevs.com/2.2.0/astronaut/?in_space=true&limit=30');
            if (astrosRes.ok) {
                const data = await astrosRes.json();
                spaceInfo.total = data.count || 0;

                if (data.results) {
                    data.results.forEach(astro => {
                        // Sprawdzamy pole spacestation bezpośrednio w obiekcie astronauty
                        const stationName = astro.spacestation ? astro.spacestation.name.toLowerCase() : "";
                        
                        if (stationName.includes("international space station") || stationName.includes("iss")) {
                            spaceInfo.iss++;
                        } else if (stationName.includes("tiangong") || stationName.includes("chinese space station")) {
                            spaceInfo.tiangong++;
                        } else {
                            // Jeśli jest w kosmosie, ale nie przypisany do stacji (np. leci w kapsule)
                            spaceInfo.others++;
                        }
                    });
                }
            }
        } catch (e) { 
            console.error("SpaceDevs Error:", e.message);
        }

        res.status(200).json({
            peopleInSpace: spaceInfo.total,
            details: { iss: spaceInfo.iss, tiangong: spaceInfo.tiangong, others: spaceInfo.others },
            apod: apodData,
            nearestAsteroid: nearestAsteroid
        });

    } catch (error) {
        res.status(500).json({ error: "Błąd serwera" });
    }
}