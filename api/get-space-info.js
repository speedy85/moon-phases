export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const NASA_KEY = "8BGxyyHgdKJcxBxXt6UfxKeXr1BgBtYAH12BJhUq"; 
    const today = new Date().toISOString().split('T')[0];

    try {
        // 1. APOD
        let apodData = { title: "Kosmos", url: "", explanation: "", media_type: "image" };
        try {
            const apodRes = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`);
            if (apodRes.ok) apodData = await apodRes.json();
        } catch (e) {}

        // 2. NEO
        let nearestAsteroid = null;
        try {
            const neoRes = await fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${NASA_KEY}`);
            const neoData = await neoRes.json();
            const asteroids = (neoData.near_earth_objects && neoData.near_earth_objects[today]) || [];
            if (asteroids.length > 0) {
                const closest = asteroids.reduce((prev, curr) => {
                    const dP = parseFloat(prev.close_approach_data[0].miss_distance.kilometers);
                    const dC = parseFloat(curr.close_approach_data[0].miss_distance.kilometers);
                    return dP < dC ? prev : curr;
                });
                nearestAsteroid = {
                    name: closest.name.replace(/[()]/g, ''),
                    distance: Math.round(parseFloat(closest.close_approach_data[0].miss_distance.kilometers)).toLocaleString() + " km",
                    time: closest.close_approach_data[0].close_approach_date_full ? closest.close_approach_data[0].close_approach_date_full.split(" ")[1] : "--:--",
                    isDangerous: closest.is_potentially_hazardous_asteroid
                };
            }
        } catch (e) {}

        // 3. LUDZIE - Czysta logika bez fallbacku
        let spaceInfo = { total: 0, iss: 0, tiangong: 0, names: { iss: [], tiangong: [], others: [] } };
        
        const astrosRes = await fetch('http://api.open-notify.org/astros.json');
        
        if (!astrosRes.ok) throw new Error("Problem z API OpenNotify");
        
        const data = await astrosRes.json();
        
        if (data && data.people) {
            spaceInfo.total = data.number;
            data.people.forEach(p => {
                const craft = p.craft.toUpperCase();
                if (craft.includes('ISS')) {
                    spaceInfo.iss++;
                    spaceInfo.names.iss.push(p.name);
                } else if (craft.includes('TIANGONG') || craft.includes('CSS') || craft.includes('SHENZHOU')) {
                    spaceInfo.tiangong++;
                    spaceInfo.names.tiangong.push(p.name);
                } else {
                    spaceInfo.names.others.push(p.name);
                }
            });
        }

        res.status(200).json({
            peopleInSpace: spaceInfo.total,
            details: { iss: spaceInfo.iss, tiangong: spaceInfo.tiangong },
            names: spaceInfo.names,
            apod: apodData,
            nearestAsteroid: nearestAsteroid
        });

    } catch (error) {
        console.error("Handler Error:", error.message);
        // Zwracamy błąd, aby front-end wiedział, że coś jest nie tak
        res.status(500).json({ error: "Błąd pobierania danych z orbity" });
    }
}