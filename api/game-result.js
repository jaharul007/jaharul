// api/game-result.js (Frontend Version)

async function saveGameResult(period, mode) {
    console.log("Saving result for Period:", period);
    try {
        const response = await fetch('/api/save-result', { // यहाँ आपका असली Backend API URL आएगा
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                period: period,
                mode: mode
            })
        });

        const data = await response.json();
        if (data.success) {
            console.log("Success: Result saved to MongoDB", data.data);
        } else {
            console.error("Server Error:", data.error);
        }
    } catch (error) {
        console.error("Network Error: Could not connect to API", error);
    }
}
