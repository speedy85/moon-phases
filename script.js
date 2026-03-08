const APP_ID = "27685de2-620d-4c30-894a-d118792447e4";
const APP_SECRET = "12e081084bdf8470ac719d3c004ad298d54ef92edbfa0be9aab2783401a57bb1cbbeb817fd32e5c841619574bb55c61e5be151ef8131f70dbfe3998f1dca1c836de8f04a56ef1121baccec50a3223c567521a2793e90f0e0c1d90c2350ec52c01349cbf37d9e55b5f307c1f976853d2d";

const authHeader = btoa(`${APP_ID}:${APP_SECRET}`);
// Proxy rozwiązujące problem CORS
const PROXY = "https://corsproxy.io/?"; 

async function fetchMoon() {
    const dateStr = new Date().toISOString().split('T')[0];
    const lat = 52.2297;
    const lon = 21.0122;

    try {
        // 1. GENEROWANIE OBRAZU (przez proxy)
        const imgUrl = "https://api.astronomyapi.com/api/v2/studio/moon-phase";
        const imgResponse = await fetch(PROXY + encodeURIComponent(imgUrl), {
            method: "POST",
            headers: { 
                "Authorization": `Basic ${authHeader}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "format": "png",
                "style": {
                    "moonStyle": "real",
                    "backgroundStyle": "stars",
                    "backgroundColor": "#000000",
                    "headingColor": "#ffffff",
                    "textColor": "#ffffff"
                },
                "observer": { "latitude": lat, "longitude": lon, "date": dateStr },
                "view": { "type": "portrait-simple", "orientation": "north-up" }
            })
        });

        if (!imgResponse.ok) throw new Error('Błąd obrazu (CORS/Auth)');
        const imgData = await imgResponse.json();

        // 2. DANE POZYCJI (przez proxy)
        const posUrl = `https://api.astronomyapi.com/api/v2/astronomy/data/position?latitude=${lat}&longitude=${lon}&elevation=1&from_date=${dateStr}&to_date=${dateStr}&time=20:00:00&bodies=moon`;
        const posResponse = await fetch(PROXY + encodeURIComponent(posUrl), {
            headers: { "Authorization": `Basic ${authHeader}` }
        });

        if (!posResponse.ok) throw new Error('Błąd danych astronomicznych');
        const posData = await posResponse.json();
        
        // Wyciąganie danych z tabeli
        const moon = posData.data.table.rows[0].cells[0];

        // AKTUALIZACJA UI
        document.getElementById('moon-image').src = imgData.data.imageUrl;
        document.getElementById('date').innerText = dateStr;
        document.getElementById('dist').innerText = Math.round(parseFloat(moon.distance.fromEarth.km)).toLocaleString();
        document.getElementById('az').innerText = moon.position.horizontal.azimuth.degrees + "°";
        document.getElementById('alt').innerText = moon.position.horizontal.altitude.degrees + "°";
        document.getElementById('ra').innerText = moon.position.equatorial.rightAscension.string;
        document.getElementById('dec').innerText = moon.position.equatorial.declination.degrees + "°";

        document.getElementById('loader').style.display = 'none';
        document.getElementById('app').style.display = 'block';

    } catch (err) {
        document.getElementById('loader').innerHTML = `Błąd: ${err.message}<br><small>Spróbuj odświeżyć stronę za chwilę.</small>`;
        console.error(err);
    }
}

fetchMoon();