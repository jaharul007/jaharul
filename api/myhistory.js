// ============================================================
//  myhistory.js — My History Section
//  Photo jaisi card design: betOn color box + period + status
//  Is file ko wingo_game_fixed.html ke </body> se pehle include karo
// ============================================================

// ── CSS inject karo ──────────────────────────────────────────
(function injectMyHistoryCSS() {
    const style = document.createElement('style');
    style.textContent = `

/* ── My History Container ── */
#myHistory {
    padding: 0 0 20px 0;
    background: transparent;
}

/* ── Single Bet Card (Photo jaisa) ── */
.mh-card {
    display: flex;
    align-items: center;
    gap: 14px;
    background: #0e1a35;
    border-radius: 14px;
    padding: 14px 14px;
    margin: 0 12px 10px 12px;
    border: 1px solid #1a2d55;
    position: relative;
    overflow: hidden;
}

/* Subtle left glow line */
.mh-card::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    border-radius: 14px 0 0 14px;
}
.mh-card.mh-won::before  { background: #10b981; }
.mh-card.mh-lost::before { background: #ef4444; }
.mh-card.mh-pending::before { background: #f59e0b; }

/* ── Left Color Box (Green/Red/Violet/Big/Small) ── */
.mh-color-box {
    width: 62px;
    height: 62px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 800;
    color: #fff;
    flex-shrink: 0;
    letter-spacing: 0.3px;
    text-shadow: 0 1px 3px rgba(0,0,0,0.4);
}
.mh-box-green  { background: linear-gradient(135deg, #16a34a, #22c55e); }
.mh-box-red    { background: linear-gradient(135deg, #dc2626, #ef4444); }
.mh-box-violet { background: linear-gradient(135deg, #7c3aed, #9b51e0); }
.mh-box-big    { background: linear-gradient(135deg, #d97706, #f59e0b); }
.mh-box-small  { background: linear-gradient(135deg, #2563eb, #3b82f6); }
.mh-box-number { background: linear-gradient(135deg, #0f766e, #14b8a6); }

/* ── Middle Info Section ── */
.mh-info {
    flex: 1;
    min-width: 0;
}
.mh-period {
    font-size: 15px;
    font-weight: 700;
    color: #e2e8f0;
    letter-spacing: 0.3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 6px;
}
.mh-period-arrow {
    color: #10b981;
    font-size: 11px;
}
.mh-datetime {
    font-size: 12px;
    color: #64748b;
    margin-top: 3px;
    font-weight: 500;
}
.mh-beton {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 4px;
    font-weight: 600;
}

/* ── Right Status Section ── */
.mh-right {
    text-align: right;
    flex-shrink: 0;
}
.mh-status-badge {
    display: inline-block;
    padding: 5px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.3px;
    border: 1.5px solid;
}
.mh-status-badge.won  {
    color: #10b981;
    border-color: #10b981;
    background: rgba(16,185,129,0.08);
}
.mh-status-badge.lost {
    color: #ef4444;
    border-color: #ef4444;
    background: rgba(239,68,68,0.08);
}
.mh-status-badge.pending {
    color: #f59e0b;
    border-color: #f59e0b;
    background: rgba(245,158,11,0.08);
}

.mh-amount {
    font-size: 14px;
    font-weight: 800;
    margin-top: 6px;
}
.mh-amount.won  { color: #10b981; }
.mh-amount.lost { color: #ef4444; }
.mh-amount.pending { color: #f59e0b; }

/* ── Empty / Loading State ── */
.mh-empty {
    text-align: center;
    padding: 50px 20px;
    color: #475569;
    font-size: 15px;
    font-weight: 600;
}
.mh-empty-icon {
    font-size: 48px;
    display: block;
    margin-bottom: 12px;
    opacity: 0.5;
}

/* ── Pagination Bar ── */
.mh-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin: 16px 12px 0 12px;
    background: #0e1a35;
    border-radius: 12px;
    padding: 12px;
    border: 1px solid #1a2d55;
}
.mh-page-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    background: #1e3a6e;
    color: #fff;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
}
.mh-page-btn:active { background: #2563eb; }
.mh-page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.mh-page-info {
    color: #e2e8f0;
    font-size: 15px;
    font-weight: 700;
    min-width: 50px;
    text-align: center;
}

/* ── Card Entry Animation ── */
@keyframes mhSlideIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
}
.mh-card {
    animation: mhSlideIn 0.25s ease both;
}

    `;
    document.head.appendChild(style);
})();

// ── State ────────────────────────────────────────────────────
let mhPage      = 1;
const MH_LIMIT  = 10;
let mhTotal     = 1;
let mhBets      = [];

// ── Color box helper ─────────────────────────────────────────
function getMhBoxClass(betOn) {
    const b = String(betOn).toLowerCase();
    if (b === 'green')  return 'mh-box-green';
    if (b === 'red')    return 'mh-box-red';
    if (b === 'violet') return 'mh-box-violet';
    if (b === 'big')    return 'mh-box-big';
    if (b === 'small')  return 'mh-box-small';
    return 'mh-box-number';  // 0-9
}

function getMhBoxLabel(betOn) {
    const b = String(betOn);
    // Single digit number → just show number
    if (/^\d$/.test(b)) return b;
    return b;
}

// ── Format datetime from period (YYYYMMDDxxxx) ───────────────
function formatPeriodDate(period) {
    try {
        const s = String(period);
        if (s.length < 8) return '';
        const yr = s.slice(0, 4);
        const mo = s.slice(4, 6);
        const dy = s.slice(6, 8);
        // Use createdAt from bet if available — fallback to period parse
        return `${yr}-${mo}-${dy}`;
    } catch(e) { return ''; }
}

// ── Render cards ─────────────────────────────────────────────
function renderMyHistoryCards(bets) {
    const container = document.getElementById('myHistory');
    if (!container) return;

    // Clear old content (keep pagination if exists)
    const oldList = container.querySelector('.mh-list');
    if (oldList) oldList.remove();
    const oldPage = container.querySelector('.mh-pagination');
    if (oldPage) oldPage.remove();

    if (!bets || bets.length === 0) {
        container.innerHTML = `
            <div class="mh-empty">
                <span class="mh-empty-icon">📋</span>
                No bets found
            </div>`;
        return;
    }

    const list = document.createElement('div');
    list.className = 'mh-list';

    bets.forEach((bet, i) => {
        const betOn   = bet.betOn || bet.bet_on || 'Unknown';
        const period  = bet.period || '';
        const amount  = parseFloat(bet.amount || 0);
        const status  = bet.status || 'pending';
        const winAmt  = parseFloat(bet.winAmount || bet.win_amount || 0);
        const dateStr = bet.createdAt
            ? new Date(bet.createdAt).toLocaleString('en-IN', { hour12: false })
            : formatPeriodDate(period);

        const boxClass = getMhBoxClass(betOn);
        const boxLabel = getMhBoxLabel(betOn);

        let statusText, amountText, badgeClass, cardClass;
        if (status === 'won') {
            statusText = 'Succeed';
            amountText = `+₹${winAmt.toFixed(2)}`;
            badgeClass = 'won';
            cardClass  = 'mh-won';
        } else if (status === 'lost') {
            statusText = 'Failed';
            amountText = `-₹${amount.toFixed(2)}`;
            badgeClass = 'lost';
            cardClass  = 'mh-lost';
        } else {
            statusText = 'Pending';
            amountText = `₹${amount.toFixed(2)}`;
            badgeClass = 'pending';
            cardClass  = 'mh-pending';
        }

        const card = document.createElement('div');
        card.className = `mh-card ${cardClass}`;
        card.style.animationDelay = `${i * 0.04}s`;

        card.innerHTML = `
            <div class="mh-color-box ${boxClass}">${boxLabel}</div>
            <div class="mh-info">
                <div class="mh-period">
                    ${period}
                    <span class="mh-period-arrow">▼</span>
                </div>
                <div class="mh-datetime">${dateStr}</div>
                <div class="mh-beton">Bet on: <strong style="color:#cbd5e1">${betOn}</strong> &nbsp;|&nbsp; ₹${amount.toFixed(2)}</div>
            </div>
            <div class="mh-right">
                <div class="mh-status-badge ${badgeClass}">${statusText}</div>
                <div class="mh-amount ${badgeClass}">${amountText}</div>
            </div>
        `;
        list.appendChild(card);
    });

    container.appendChild(list);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(mhTotal / MH_LIMIT));
    const pag = document.createElement('div');
    pag.className = 'mh-pagination';
    pag.innerHTML = `
        <button class="mh-page-btn" onclick="mhChangePage(-1)" ${mhPage <= 1 ? 'disabled' : ''}>&#8249;</button>
        <span class="mh-page-info">${mhPage}/${totalPages}</span>
        <button class="mh-page-btn" onclick="mhChangePage(1)" ${mhPage >= totalPages ? 'disabled' : ''}>&#8250;</button>
    `;
    container.appendChild(pag);
}

// ── Page change ───────────────────────────────────────────────
function mhChangePage(dir) {
    const totalPages = Math.max(1, Math.ceil(mhTotal / MH_LIMIT));
    mhPage = Math.max(1, Math.min(totalPages, mhPage + dir));
    loadMyHistory();
}

// ── Main load function (overrides the old one) ────────────────
async function loadMyHistory() {
    const phone = getCurrentUserPhone ? getCurrentUserPhone() : (globalPhone || null);
    if (!phone) {
        renderMyHistoryCards([]);
        return;
    }

    const container = document.getElementById('myHistory');
    if (container) {
        container.innerHTML = `<div class="mh-empty"><span class="mh-empty-icon" style="font-size:32px">⏳</span>Loading...</div>`;
    }

    try {
        // auth.js ke saath kaam karta hai — /api/bet endpoint use karo
        const mode = typeof currentMode !== 'undefined' ? currentMode : 60;
        const res  = await fetch(
            `/api/bet?phone=${encodeURIComponent(phone)}&mode=${mode}&page=${mhPage}&limit=${MH_LIMIT}`
        );
        const data = await res.json();

        if (data.success && data.bets && data.bets.length > 0) {
            mhBets  = data.bets;
            mhTotal = data.total || data.bets.length;
            renderMyHistoryCards(mhBets);
        } else {
            // Hide old table elements if they exist
            const tbl = document.getElementById('myHistoryTable');
            const emp = document.getElementById('myHistoryEmpty');
            if (tbl) tbl.style.display = 'none';
            if (emp) emp.style.display = 'none';
            renderMyHistoryCards([]);
        }
    } catch (e) {
        console.error('loadMyHistory error:', e);
        renderMyHistoryCards([]);
    }
}
