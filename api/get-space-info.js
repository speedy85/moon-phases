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

       // --- 3. LUDZIE W KOSMOSIE (Powrót do Open Notify z filtracją) ---
        let spaceInfo = { total: 0, iss: 0, tiangong: 0, others: 0 };
        try {
            // Używamy prostego API, które zawsze podaje nazwę stacji (craft)
            const astrosRes = await fetch('http://api.open-notify.org/astros.json');
            const data = await astrosRes.json();
            
            if (data.number) {
                spaceInfo.total = data.number;
                data.people.forEach(p => {
                    const craft = p.craft.toLowerCase();
                    if (craft === 'iss') {
                        spaceInfo.iss++;
                    } else if (craft === 'tiangong' || craft === 'css') {
                        spaceInfo.tiangong++;
                    } else {
                        spaceInfo.others++;
                    }
                });
            }
        } catch (e) { 
            console.error("OpenNotify Error:", e.message);
            // Jeśli padnie, ustawiamy sztywno 11 osób (7 ISS + 3 Tiangong + 1 inne) 
            // żeby strona nie wyglądała na pustą, dopóki API nie wstanie.
            spaceInfo = { total: 11, iss: 7, tiangong: 3, others: 1 };
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