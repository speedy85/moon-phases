export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const NASA_KEY = "DEMO_KEY"; // Docelowo zmień na swój klucz z api.nasa.gov

    try {
        // 1. Pobieranie Zdjęcia Dnia (APOD)
        const apodRes = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`);
        const apodData = await apodRes.json();

        // 2. Pobieranie Asteroid (NeoWs) na dziś
        const today = new Date().toISOString().split('T')[0];
        const neoRes = await fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${NASA_KEY}`);
        const neoData = await neoRes.json();

        // Logika szukania najbliższej asteroidy
        const asteroids = neoData.near_earth_objects[today] || [];
        const closest = asteroids.reduce((prev, curr) => {
            return (parseFloat(prev.close_approach_data[0].miss_distance.kilometers) < 
                    parseFloat(curr.close_approach_data[0].miss_distance.kilometers)) ? prev : curr;
        }, asteroids[0]);

        // 3. Pobieranie liczby ludzi w kosmosie
        const astrosRes = await fetch('http://api.open-notify.org/astros.json');
        const astrosData = await astrosRes.json();

        // Wysyłamy gotowy pakiet danych
        res.status(200).json({
            peopleInSpace: astrosData.number,
            astrosNames: astrosData.people.map(p => p.name).join(", "),
            apod: {
                title: apodData.title,
                url: apodData.url,
                explanation: apodData.explanation
            },
            nearestAsteroid: closest ? {
                name: closest.name,
                distance: Math.round(parseFloat(closest.close_approach_data[0].miss_distance.kilometers)).toLocaleString() + " km",
                time: closest.close_approach_data[0].close_approach_time_full.split(" ")[1],
                isDangerous: closest.is_potentially_hazardous_asteroid
            } : null
        });

    } catch (error) {
        res.status(500).json({ error: "Błąd podczas pobierania Space Info" });
    }
}