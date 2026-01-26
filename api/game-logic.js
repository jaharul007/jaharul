// JAHARUL GAME - Frontend Logic (MongoDB & Vercel Compatible)

// 1. रिजल्ट्स रेंडर करने का फंक्शन (फ़ोटो के हिसाब से डिजाइन)
function renderHistory(history) {
    const list = document.getElementById('historyBody');
    if (!list) return;

    if (!Array.isArray(history) || history.length === 0) {
        list.innerHTML = '<tr><td colspan="4" style="color:#999; padding:20px;">No data found</td></tr>';
        return;
    }

    const rows = history.map(i => {
        const n = Number(i.n);
        // नंबर के हिसाब से कलर तय करना
        const numColor = (n === 0 || n === 5) ? '#9b51e0' : (n % 2 === 0 ? '#ff4d4d' : '#2ead6d');
        const bigSmall = (n >= 5) ? 'Big' : 'Small';
        
        // कलर डॉट्स (फ़ोटो के हिसाब से 0 और 5 पर डबल डॉट)
        let colorDots = `<span class="res-dot" style="background:${numColor}"></span>`;
        if (n === 0) colorDots += `<span class="res-dot" style="background:#ff4d4d"></span>`;
        if (n === 5) colorDots += `<span class="res-dot" style="background:#2ead6d"></span>`;

        return `
            <tr>
                <td class="td-period" style="font-size:11px; color:#999;">${i.p}</td>
                <td class="td-number" style="color:${numColor}; font-size:22px; font-weight:800;">${i.n}</td>
                <td class="td-bs" style="color:#e6e6e6;">${bigSmall}</td>
                <td style="display: flex; justify-content: center; align-items: center; padding-top:15px;">
                    ${colorDots}
                </td>
            </tr>
        `;
    }).join('');

    list.innerHTML = rows;

    // टॉप के छोटे डॉट्स अपडेट करना
    const miniDots = document.getElementById('miniDots');
    if (miniDots) {
        miniDots.innerHTML = history.slice(0, 5).map(i => {
            const col = (i.n === 0 || i.n === 5) ? '#9b51e0' : (i.n % 2 === 0 ? '#ff4d4d' : '#2ead6d');
            return `<span class="res-dot" style="background:${col}; width:12px; height:12px; border:1px solid #fff;"></span>`;
        }).join('');
    }
}

// 2. डेटाबेस से डेटा लाने का फंक्शन
async function fetchFromDB() {
    const mode = window.currentMode || 60; // Default 1m
    try {
        // वॉलेट बैलेंस लाना
        const userRes = await fetch('/api/user');
        if (userRes.ok) {
            const userData = await userRes.json();
            const balDisplay = document.getElementById('balDisplay');
            if (balDisplay) balDisplay.innerText = Number(userData.balance).toFixed(2);
        }

        // गेम हिस्ट्री लाना (MongoDB से)
        const histRes = await fetch(`/api/history?mode=${mode}`);
        if (histRes.ok) {
            const histData = await histRes.json();
            renderHistory(histData);
        }
    } catch (error) {
        console.error("Database Fetch Error:", error);
    }
}

// 3. नया रिजल्ट MongoDB में सेव करने का फंक्शन (Timer के अंत में)
async function saveGameResult(periodId, mode) {
    // रैंडम नंबर जेनरेट करना (या आपके सर्वर लॉजिक के हिसाब से)
    const winningNumber = Math.floor(Math.random() * 10);
    
    const resultData = {
        p: periodId,
        n: winningNumber,
        mode: Number(mode)
    };

    try {
        const response = await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resultData)
        });

        if (response.ok) {
            console.log("Result saved to MongoDB");
            // सेव होने के तुरंत बाद टेबल रिफ्रेश करें
            fetchFromDB();
            return await response.json();
        }
    } catch (error) {
        console.error("MongoDB Save Error:", error);
    }
}

// फंक्शन्स को ग्लोबली उपलब्ध कराना
window.fetchFromDB = fetchFromDB;
window.saveGameResult = saveGameResult;
