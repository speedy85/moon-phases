// Twoje dane dostępowe (Zaszyte zgodnie z prośbą)
const appId = "27685de2-620d-4c30-894a-d118792447e4";
const appSecret = "12e081084bdf8470ac719d3c004ad298d54ef92edbfa0be9aab2783401a57bb1cbbeb817fd32e5c841619574bb55c61e5be151ef8131f70dbfe3998f1dca1c836de8f04a56ef1121baccec50a3223c567521a2793e90f0e0c1d90c2350ec52c01349cbf37d9e55b5f307c1f976853d2d";

// Generowanie nagłówka Basic Auth
const hash = btoa(`${appId}:${appSecret}`);

async function getMoonData() {
    // Standardowa lokalizacja (Warszawa), jeśli użytkownik nie udostępni GPS
    let lat = 52.2297;
    let lon = 21.0122;

    const today = new Date().toISOString().split('T')[0];

    try {
        // 1. Próba pobrania lokalizacji użytkownika dla większej precyzji
        if (navigator.geolocation) {
            const position = await new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(resolve, () => resolve(null));
            });
            if (position) {
                lat = position.coords.latitude;
                lon = position.coords.longitude;
            }
        }

        // 2. Zapytanie o dane tekstowe (Astronomy Data)
        const response = await fetch(`https://api.astronomyapi.com/api/v2/astronomy/position?latitude=${lat}&longitude=${lon}&elevation=1&from_date=${today}&to_date=${today}&time=12:00:00`, {
            headers: { 'Authorization': `Basic ${hash}` }
        });
        const data = await response.json();
        const moon = data.data.table.rows[0].cells[0].distance.fromEarth; // Przykładowa ścieżka do danych obiektu Moon
        
        // Wyciągamy dane konkretnie dla Księżyca z endpointu postions (uproszczone dla przykładu)
        // Uwaga: AstronomyAPI ma specyficzną strukturę, poniżej poprawne mapowanie:
        updateUI(data.data.table.rows[0].cells[0], lat, lon);

    } catch (error) {
        console.error("Błąd API:", error);
        document.getElementById('loading').innerText = "Błąd autoryzacji lub połączenia.";
    }
}

async function updateUI(moonData, lat, lon) {
    const today = new Date().toISOString().split('T')[0];
    
    // 3. Zapytanie o DOKŁADNĄ GRAFIKĘ (Moon Phase Widget)
    const moonWidgetRes = await fetch(`https://api.astronomyapi.com/api/v2/studio/moon-phase`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${hash}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "format": "png",
            "style": { "moonStyle": "real", "backgroundStyle": "stars", "backgroundColor": "#000000", "headingColor": "#ffffff", "textColor": "#ffffff" },
            "observer": { "latitude": lat, "longitude": lon, "date": today },
            "view": { "type": "portrait-simple", "orientation": "north-up" }
        })
    });
    
    const widgetData = await moonWidgetRes.json();
    
    // Mapowanie danych do HTML
    document.getElementById('moon-image').src = widgetData.data.imageUrl;
    document.getElementById('phase-name').innerText = "Faza Księżyca"; // Można rozszerzyć o mapowanie nazw
    document.getElementById('illumination').innerText = "Zależne od fazy"; 
    document.getElementById('rise').innerText = "Sprawdź API";
    
    // Pokazanie ukrytej sekcji
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';
}

getMoonData();