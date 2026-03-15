export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const API_KEY = "daf9b7cccf0247ebb7ade78e1f68c2be"; 
    const lat = "52.2297";
    const lon = "21.0122";

    try {
        // 1. Pobieramy dane aktualne
        const currentRes = await fetch(`https://api.ipgeolocation.io/astronomy?apiKey=${API_KEY}&lat=${lat}&long=${lon}`);
        const currentData = await currentRes.json();

        // 2. Obliczamy daty dla sekcji "Najbliższe fazy"
        // Sprawdzamy zakres od -7 do +30 dni, aby znaleźć 1 poprzednią i 3 następne fazy główne
        const upcomingPhases = [];
        const today = new Date();
        
        // Szukamy faz głównych (IPGeolocation podaje je w polu moon_phase)
        // Aby oszczędzić limity API, sprawdzamy co 1-2 dni lub pobieramy kalendarz jeśli API pozwala
        // Tutaj użyjemy uproszczonej logiki iteracji po dniach (uwaga na limity zapytań!)
        
        // Alternatywnie: IPGeolocation posiada dedykowany endpoint dla kalendarza, 
        // ale często jest płatny. Użyjemy więc matematycznego przybliżenia fazy 
        // opartego na moon_phase_lunation (wiek księżyca).

        const moonAge = currentData.moon_age; // Dzień cyklu (0-29.5)
        const cycle = 29.53;

        const findPhaseDate = (targetAge) => {
            let diff = targetAge - moonAge;
            if (diff < -7) diff += cycle; // Przesunięcie do przodu jeśli faza już była dawno
            const targetDate = new Date();
            targetDate.setDate(today.getDate() + diff);
            return {
                date: targetDate.toISOString().split('T')[0],
                daysDiff: Math.round(diff)
            };
        };

        const phasesToFind = [
            { name: "NEW_MOON", age: 0 },
            { name: "FIRST_QUARTER", age: 7.4 },
            { name: "FULL_MOON", age: 14.8 },
            { name: "LAST_QUARTER", age: 22.1 }
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
            image: `https://www.icalendar37.net/lunar/api/i.png?lang=pl&month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}&size=300&light=1&shade=1&text=0&LDZ=${new Date().getTime()}`,
            details: {
                phase: currentData.moon_phase,
                illumination: Math.round(currentData.moon_illumination) + "%",
                rise: currentData.moonrise,
                set: currentData.moonset,
                distance: Math.round(currentData.moon_distance).toLocaleString() + " km"
            },
            upcoming: calculatedPhases
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}