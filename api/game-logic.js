// api/game-logic.js - Frontend Logic for Vercel + MongoDB

let currentMode = 60; // Default 1 min

/**
 * 1. Database se History Fetch karna (GET Request)
 */
async function fetchFromDB() {
    try {
        // 1. Balance Fetch (MongoDB se)
        const userRes = await fetch('/api/user').catch(() => null); 
        if(userRes && userRes.ok) {
            const userData = await userRes.json();
            if(userData && userData.balance !== undefined) {
                document.getElementById('balDisplay').innerText = Number(userData.balance).toFixed(2);
            }
        }

        // 2. Game History Fetch (Teri api/history.js se)
        const histRes = await fetch(`/api/history?mode=${currentMode}`);
        if (!histRes.ok) throw new Error("History fetch failed");
        
        const histData = await histRes.json();
        
        if(histData && Array.isArray(histData)) {
            // Table update karein (Main HTML ke renderHistory function ko call karega)
            if (typeof renderHistory === "function") {
                renderHistory(histData);
            }
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

/**
 * 2. Naya Result MongoDB mein Save karna (POST Request)
 * Ye function timer ke 1 second bachte hi trigger hota hai
 */
async function saveGameResult(periodId, mode) {
    // 0-9 ke beech random winning number
    const winningNumber = Math.floor(Math.random() * 10);
    
    const payload = {
        p: periodId,
        n: winningNumber,
        mode: mode
    };

    try {
        const response = await fetch('/api/history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const savedData = await response.json();
            console.log("Result Saved to MongoDB:", savedData);
            return savedData;
        }
    } catch (error) {
        console.error("Save to MongoDB Failed:", error);
    }
}

/**
 * 3. Betting logic (Optional - Popup ke liye)
 */
function placeBet(type, amount) {
    // Yahan bet save karne ka logic aayega (api/bet.js banani padegi)
    console.log(`Bet placed on ${type} with amount ₹${amount}`);
}

// Global initialization ki tayyari
window.saveGameResult = saveGameResult;
window.fetchFromDB = fetchFromDB;
