// यह फंक्शन HTML के टाइमर द्वारा कॉल किया जाएगा
async function saveGameResult(period, mode) {
    try {
        const response = await fetch('/api/save-result', { // सुनिश्चित करें कि यह URL सही है
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ period: period, mode: mode })
        });

        const data = await response.json();
        if (data.success) {
            console.log("Result Saved:", data.data);
        } else {
            console.error("Save failed:", data.error);
        }
    } catch (error) {
        console.error("Network Error:", error);
    }
}
