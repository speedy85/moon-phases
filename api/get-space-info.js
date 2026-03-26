export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const NASA_KEY = "8BGxyyHgdKJcxBxXt6UfxKeXr1BgBtYAH12";
    
    // Bezpieczniejsza data (często NASA potrzebuje daty wczorajszej, jeśli dzisiejszej jeszcze nie ma)
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    try {
        // 1. APOD - Zdjęcie dnia
        let apodData = { title: "Kosmos", url: "", explanation: "" };
        const apodRes = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`);
        if (apodRes.ok) {
            apodData = await apodRes.json();
        }

        // 2. NEO - Asteroidy
        let nearestAsteroid = null;
        try {
            const neoRes = await fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${NASA_KEY}`);
            const neoData = await neoRes.json();
            
            // NASA czasem grupuje dane pod kluczem daty, sprawdzamy czy istnieje
            const asteroids = (neoData.near_earth_objects && neoData.near_earth_objects[today]) || [];

            if (asteroids.length > 0) {
                const closest = asteroids.reduce((prev, curr) => {
                    const distPrev = parseFloat(prev.close_approach_data[0].miss_distance.kilometers);
                    const distCurr = parseFloat(curr.close_approach_data[0].miss_distance.kilometers);
                    return distPrev < distCurr ? prev : curr;
                });

                nearestAsteroid = {
                    name: closest.name.replace(/[()]/g, ''),
                    distance: Math.round(parseFloat(closest.close_approach_data[0].miss_distance.kilometers)).toLocaleString() + " km",
                    time: closest.close_approach_data[0].close_approach_time_full ? 
                          closest.close_approach_data[0].close_approach_time_full.split(" ")[1] : "Brak danych",
                    isDangerous: closest.is_potentially_hazardous_asteroid
                };
            }
        } catch (e) { console.error("NEO Error:", e.message); }

        // 3. Ludzie w kosmosie - Nowa metoda sprawdzania stacji
        let spaceInfo = { total: 0, iss: 0, tiangong: 0, others: 0 };
        try {
            const astrosRes = await fetch('https://ll.thespacedevs.com/2.2.0/astronaut/?in_space=true&limit=30');
            if (astrosRes.ok) {
                const data = await astrosRes.json();
                spaceInfo.total = data.count || 0;

                if (data.results) {
                    data.results.forEach(astro => {
                        // Szukamy nazwy stacji w dowolnym miejscu opisu lokalizacji lub lotu
                        const bio = JSON.stringify(astro).toLowerCase();
                        
                        if (bio.includes("international space station") || bio.includes("iss")) {
                            spaceInfo.iss++;
                        } else if (bio.includes("tiangong") || bio.includes("chinese space station") || bio.includes("tss")) {
                            spaceInfo.tiangong++;
                        } else {
                            spaceInfo.others++;
                        }
                    });
                }
            }
        } catch (e) { 
            console.error("SpaceDevs Error:", e.message);
            spaceInfo.total = "brak danych"; 
        }

        // Finalna odpowiedź
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
        console.error("Global Error:", error);
        res.status(500).json({ error: "Błąd serwera", details: error.message });
    }
}