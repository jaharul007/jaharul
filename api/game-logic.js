// api/game-logic.js

/**
 * 1. Random Result Generator 
 * (Ye admin panel se bhi control ho sakta hai future mein)
 */
function generateResult() {
    return Math.floor(Math.random() * 10);
}

/**
 * 2. Result Save Function
 * Timer khatam hone par ye naya result banata hai
 */
async function saveGameResult(periodId, mode) {
    const winningNumber = generateResult();
    
    const newResult = {
        p: periodId,
        n: winningNumber,
        mode: mode,
        timestamp: new Date().getTime()
    };

    try {
        // LocalStorage mein save kar rahe hain taaki bina server ke bhi kaam kare
        let history = JSON.parse(localStorage.getItem(`history_${mode}`)) || [];
        
        // Naya result hamesha upar (Top) aayega
        history.unshift(newResult);
        
        // Max 50 results hi rakhenge
        if (history.length > 50) history.pop();
        
        localStorage.setItem(`history_${mode}`, JSON.stringify(history));
        return newResult;
    } catch (e) {
        console.error("Save Error:", e);
    }
}

/**
 * 3. Initial Dummy Data
 * Agar database khali hai, toh ye screenshot jaisa data generate karega
 */
function getInitialHistory(mode) {
    let history = JSON.parse(localStorage.getItem(`history_${mode}`)) || [];
    
    if (history.length === 0) {
        let now = new Date();
        let dateStr = now.getFullYear().toString() + 
                      (now.getMonth()+1).toString().padStart(2,'0') + 
                      now.getDate().toString().padStart(2,'0');
        
        // Screenshot jaisa fake data bhar rahe hain pehli baar ke liye
        for (let i = 0; i < 15; i++) {
            history.push({
                p: dateStr + "1000" + (10600 - i),
                n: [1, 5, 2, 8, 2, 7, 3, 9, 1, 1, 0, 4, 6][i % 13], // Screenshot pattern
                mode: mode
            });
        }
        localStorage.setItem(`history_${mode}`, JSON.stringify(history));
    }
    return history;
}

/**
 * 4. Fetch Interceptor
 * HTML jab bhi fetch() karega, ye use data pakda dega
 */
const originalFetch = window.fetch;
window.fetch = async function(url, options) {
    // History mangne par ye chalta hai
    if (url.includes('/api/history')) {
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const mode = urlParams.get('mode') || 60;
        const data = getInitialHistory(mode);
        
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // User balance mangne par
    if (url.includes('/api/user')) {
        return new Response(JSON.stringify({ balance: 2580.45 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return originalFetch(url, options);
};
