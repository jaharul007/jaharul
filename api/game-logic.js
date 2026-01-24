// game-logic.js - Created for your Wingo Game

// 1. डेटाबेस में नया रिजल्ट सेव करने के लिए (Timer खत्म होने पर इसे कॉल करें)
async function saveGameResult(period, mode) {
    console.log("Saving result for Period:", period, "Mode:", mode);
    try {
        const response = await fetch('/api/save-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                period: period,
                mode: mode
            })
        });

        const data = await response.json();
        if (data.success) {
            console.log("✅ Success! MongoDB updated:", data.data);
            // रिजल्ट सेव होने के बाद टेबल अपडेट करने के लिए fetchFromDB() को कॉल करें
            if (typeof fetchFromDB === "function") {
                fetchFromDB();
            }
        } else {
            console.error("❌ Server Error:", data.error);
        }
    } catch (error) {
        console.error("❌ Network Error:", error);
    }
}

// 2. डेटाबेस से पुरानी हिस्ट्री खींचने के लिए
async function loadGameHistoryFromDB(mode) {
    try {
        const response = await fetch(`/api/history?mode=${mode}`);
        if (!response.ok) throw new Error('API Response Error');
        
        const data = await response.json();
        return data; // यह MongoDB से मिली 10 रिजल्ट्स की लिस्ट है
    } catch (error) {
        console.error("❌ History Load Error:", error);
        return [];
    }
}

// 3. गेम के बैलेंस को अपडेट करने के लिए (अगर आपने API बनायी है)
async function updateUIBalance() {
    try {
        const res = await fetch('/api/user-balance'); // आपकी बैलेंस वाली API
        const data = await res.json();
        const balElement = document.getElementById('balance-amount');
        if(balElement && data.balance !== undefined) {
            balElement.innerText = "₹" + data.balance.toFixed(2);
        }
    } catch (e) {
        console.log("Balance display error");
    }
}
