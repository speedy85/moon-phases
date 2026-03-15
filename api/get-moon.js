export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const API_KEY = "daf9b7cccf0247ebb7ade78e1f68c2be"; 
    const lat = "52.2297";
    const lon = "21.0122";

    try {
        const url = `https://api.ipgeolocation.io/astronomy?apiKey=${API_KEY}&lat=${lat}&long=${lon}`;
        const response = await fetch(url);
        const currentData = await response.json();

        if (!response.ok) throw new Error(currentData.message || "Błąd API IPGeolocation");

        // Obliczanie faz na podstawie "wieku księżyca" lub przybliżonego cyklu
        // Jeśli API nie zwraca moon_age, używamy moon_illumination i trendu
        const today = new Date();
        const cycle = 29.53059;
        
        // Znana data nowiu (punkt odniesienia: 11 stycznia 2024)
        const baseNewMoon = new Date("2024-01-11T11:57:00Z");
        const diffMs = today - baseNewMoon;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        const currentAge = diffDays % cycle;

        const findPhaseDate = (targetAge) => {
            let diff = targetAge - currentAge;
            if (diff < -7) diff += cycle; 
            if (diff > 23) diff -= cycle;
            const targetDate = new Date();
            targetDate.setDate(today.getDate() + diff);
            return {
                date: targetDate.toLocaleDateString('pl-PL'),
                daysDiff: Math.round(diff)
            };
        };

        const phasesToFind = [
            { name: "NEW_MOON", age: 0 },
            { name: "FIRST_QUARTER", age: 7.38 },
            { name: "FULL_MOON", age: 14.76 },
            { name: "LAST_QUARTER", age: 22.14 }
        ];

        const calculatedPhases = phasesToFind.map(p => {
            const info = findPhaseDate(p.age);
            return {
                name: p.name,
                date: info.date,
                daysText: info.daysDiff === 0 ? "Dzisiaj" : 
                          info.daysDiff > 0 ? `Za ${info.daysDiff} dni` : 
                          `${Math.abs(info.daysDiff)} dni temu`,
                timestamp: info.daysDiff
            };
        }).sort((a, b) => a.timestamp - b.timestamp);

        res.status(200).json({
            image: `https://www.icalendar37.net/lunar/api/i.png?lang=pl&month=${today.getMonth() + 1}&year=${today.getFullYear()}&size=300&light=1&shade=1&text=0`,
            details: {
                phase: currentData.moon_phase || "UNKNOWN",
                illumination: Math.round(currentData.moon_illumination || 0) + "%",
                rise: currentData.moonrise || "--:--",
                set: currentData.moonset || "--:--",
                distance: Math.round(currentData.moon_distance || 0).toLocaleString() + " km"
            },
            upcoming: calculatedPhases
        });
    } catch (error) {
        console.error("Vercel Error:", error.message);
        res.status(500).json({ error: error.message });
    }
}