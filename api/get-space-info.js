export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // SPRAWDŹ TEN KLUCZ - musi być idealnie taki jak od NASA
    const NASA_KEY = "8BGxyyHgdKJcxBxXt6UfxKeXr1BgBtYAH12BJhUq"; 
    const today = new Date().toISOString().split('T')[0];

    try {
        // 1. APOD
        let apodData = { title: "Kosmos", url: "", explanation: "", media_type: "image" };
        try {
            const apodRes = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`);
            if (apodRes.ok) {
                const data = await apodRes.json();
                apodData = { title: data.title, url: data.url, explanation: data.explanation, media_type: data.media_type };
            }
        } catch (e) { console.error("APOD Error"); }

        // 2. NEO - Asteroidy
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

                const cad = closest.close_approach_data[0];
                let timeStr = cad.close_approach_date_full ? cad.close_approach_date_full.split(" ")[1] : 
                              new Date(cad.epoch_date_close_approach).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

                nearestAsteroid = {
                    name: closest.name.replace(/[()]/g, ''),
                    distance: Math.round(parseFloat(cad.miss_distance.kilometers)).toLocaleString() + " km",
                    time: timeStr,
                    isDangerous: closest.is_potentially_hazardous_asteroid
                };
            }
        } catch (e) { console.error("NEO Error"); }

        // 3. LUDZIE (Zmienione na HTTPS i poprawione filtrowanie)
        let spaceInfo = { total: 0, iss: 0, tiangong: 0, names: { iss: [], tiangong: [], others: [] } };
        try {
            // Zmieniono na HTTPS - Open Notify czasem wspiera oba, ale S jest bezpieczniejsze na Vercel
            const astrosRes = await fetch('https://api.open-notify.org/astros.json');
            const data = await astrosRes.json();
            
            if (data.people) {
                spaceInfo.total = data.number;
                data.people.forEach(p => {
                    const craft = p.craft.toUpperCase();
                    if (craft === 'ISS') {
                        spaceInfo.iss++;
                        spaceInfo.names.iss.push(p.name);
                    } else if (craft === 'TIANGONG' || craft === 'CSS') {
                        spaceInfo.tiangong++;
                        spaceInfo.names.tiangong.push(p.name);
                    } else {
                        spaceInfo.names.others.push(p.name);
                    }
                });
            }
        } catch (e) { 
            console.error("OpenNotify Error");
            // Dane zapasowe tylko jeśli API padnie
            spaceInfo = { 
                total: 10, 
                iss: 7, 
                tiangong: 3, 
                names: { iss: ["Ładowanie nazwisk..."], tiangong: ["Ładowanie nazwisk..."], others: [] } 
            };
        }

        res.status(200).json({
            peopleInSpace: spaceInfo.total,
            details: { iss: spaceInfo.iss, tiangong: spaceInfo.tiangong },
            names: spaceInfo.names,
            apod: apodData,
            nearestAsteroid: nearestAsteroid
        });

    } catch (error) {
        res.status(500).json({ error: "Błąd serwera" });
    }
}