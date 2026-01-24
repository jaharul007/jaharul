// यह फंक्शन नया रिजल्ट सेव करने के लिए Backend (save-result.js) को कॉल करता है
async function saveGameResult(period, mode) {
    console.log("Saving result for:", period);
    try {
        const response = await fetch('/api/save-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ period: period, mode: mode })
        });

        const data = await response.json();
        if (data.success) {
            console.log("Result Saved Successfully:", data.data);
        }
    } catch (error) {
        console.error("Error saving result:", error);
    }
}

// यह फंक्शन डेटाबेस से हिस्ट्री लाने के लिए Backend (history.js) को कॉल करता है
async function loadGameHistory(mode) {
    try {
        const response = await fetch(`/api/history?mode=${mode}`);
        const data = await response.json();
        return data; // यह MongoDB से मिले 10 रिजल्ट्स का एरे है
    } catch (error) {
        console.error("Error loading history:", error);
        return [];
    }
}
