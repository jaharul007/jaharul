// Game Logic for Result Generation
window.saveGameResult = async function(periodId, mode) {
    console.log("Generating result for period: " + periodId);
    
    try {
        // Random number generate karna (0-9)
        const randomNumber = Math.floor(Math.random() * 10);
        
        // Backend API ko result bhejna taaki wo Database (MongoDB) mein save kar sake
        const response = await fetch('/api/save-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                period: periodId,
                number: randomNumber,
                mode: mode,
                time: new Date().toISOString()
            })
        });

        if (response.ok) {
            console.log("Result saved successfully");
        }
    } catch (error) {
        console.error("Error saving result:", error);
    }
};
