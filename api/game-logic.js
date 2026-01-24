// यह फंक्शन डेटाबेस में रिजल्ट भेजने के लिए है
async function saveGameResult(period, mode) {
    const randomNum = Math.floor(Math.random() * 10); // रैंडम नंबर
    
    try {
        await fetch('/api/save-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                p: period,
                n: randomNum,
                mode: mode
            })
        });
        console.log("Result Saved!");
    } catch (error) {
        console.error("Save error:", error);
    }
}
