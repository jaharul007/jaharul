// ================================================================
//  myhistory.js  —  My History Tab (Photo-style Cards)
//
//  Kya karta hai:
//  1. "My history" click → game history HIDE, ye cards UPAR dikhte hain
//  2. Photo jaisi card design: Color box + Period + Succeed/Failed
//  3. 24 hours se purani bets automatic filter/delete ho jaati hain
//  4. /api/bet se data fetch karta hai (auth.js ke saath compatible)
// ================================================================

// ── 1. CSS INJECT ────────────────────────────────────────────
(function () {
    const s = document.createElement('style');
    s.textContent = `

/* My History tab content bilkul game history ki jagah aaye */
#myHistory {
    padding: 0;
    background: transparent;
}

/* Wrapper — game history jaise hi spacing */
.mh-wrap {
    padding: 10px 15px 20px 15px;
}

/* ── Single Card ── */
.mh-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #0b1730;
    border-radius: 14px;
    padding: 13px 14px;
    margin-bottom: -3px;
    border: 1px solid #1c3260;
    position: relative;
    overflow: hidden;
    animation: mhSlide 0.2s ease both;
}
@keyframes mhSlide {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
}

/* Left color strip */
.mh-card::before {
display: none;
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 4px;
    border-radius: 14px 0 0 14px;
}
.mh-card.c-won::before     { background: #10b981; }
.mh-card.c-lost::before    { background: #ef4444; }
.mh-card.c-pending::before { background: #f59e0b; }

/* ── Left Color Box ── */
.mh-box {
    width: 55px;
    height: 50px;
    border-radius: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 800;
    color: #fff;
    flex-shrink: 0;
    text-shadow: 0 1px 4px rgba(0,0,0,0.4);
}
.bg-green  { background: linear-gradient(135deg, #15803d, #22c55e); }
.bg-red    { background: linear-gradient(135deg, #b91c1c, #f87171); }
.bg-violet { background: linear-gradient(135deg, #6d28d9, #a855f7); }
.bg-big    { background: linear-gradient(135deg, #b45309, #fbbf24); }
.bg-small  { background: linear-gradient(135deg, #1d4ed8, #60a5fa); }
.bg-num    { background: linear-gradient(135deg, #0e7490, #22d3ee); }
.mh-box-num { font-size: 24px; font-weight: 900; line-height: 1; }

/* ── Middle Info ── */
.mh-info { flex: 1; min-width: 0; }
.mh-period {
    font-size: 14.5px;
    font-weight: 700;
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mh-period-arrow { color: #10b981; font-size: 10px; margin-left: 5px; }
.mh-time { font-size: 12px; color: #475569; margin-top: 3px; }
.mh-betinfo { font-size: 12px; color: #475569; margin-top: 3px; }
.mh-betinfo b { color: #94a3b8; }

/* ── Right Status ── */
.mh-right { flex-shrink: 0; text-align: right; }
.mh-badge {
    display: inline-block;
    padding: 5px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 800;
    border: 1.5px solid;
}
.mh-badge.won     { color: #10b981; border-color: #10b981; background: rgba(16,185,129,0.1); }
.mh-badge.lost    { color: #ef4444; border-color: #ef4444; background: rgba(239,68,68,0.1);  }
.mh-badge.pending { color: #f59e0b; border-color: #f59e0b; background: rgba(245,158,11,0.1); }
.mh-amount { font-size: 14px; font-weight: 800; margin-top: 5px; }
.mh-amount.won     { color: #10b981; }
.mh-amount.lost    { color: #ef4444; }
.mh-amount.pending { color: #f59e0b; }

/* ── Empty State ── */
.mh-empty {
    text-align: center;
    padding: 50px 20px;
    color: #334155;
    font-size: 15px;
    font-weight: 600;
}
.mh-empty-icon { font-size: 46px; display: block; margin-bottom: 12px; }

/* ── Pagination ── */
.mh-pag {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    background: #051130;
    border: 1.5px solid #2b3d63;
    border-radius: 10px;
    padding: 10px 15px;
    margin-top: 10px;
}
.mh-pbtn {
    width: 35px; height: 35px;
    border-radius: 8px; border: none;
    font-size: 20px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
}
.mh-pbtn.prev { background: #1a2a4d !important; color: #5d75a5; }
.mh-pbtn.next { background: #00ffc3 !important; color: #000; }
.mh-pbtn:disabled { opacity: 0.3; cursor: not-allowed; }
.mh-pinfo { color: #5d75a5; font-weight: bold; font-size: 16px; }

    `;
    document.head.appendChild(s);
})();

// ── 2. CONSTANTS & STATE ─────────────────────────────────────
const MH_TTL   = 24 * 60 * 60 * 1000;   // 24 hours in ms
const MH_LIMIT = 10;                      // Cards per page
let _mhPage    = 1;
let _mhTotal   = 0;

// ── 3. HELPER: Color box info ─────────────────────────────────
function _mhBoxInfo(betOn) {
    const b = String(betOn || '').toLowerCase();
    if (b === 'green')  return { cls: 'bg-green',  html: 'Green' };
    if (b === 'red')    return { cls: 'bg-red',    html: 'Red' };
    if (b === 'violet') return { cls: 'bg-violet', html: 'Violet' };
    if (b === 'big')    return { cls: 'bg-big',    html: 'Big' };
    if (b === 'small')  return { cls: 'bg-small',  html: 'Small' };
    // Number 0-9
    return { cls: 'bg-num', html: `<span class="mh-box-num">${betOn}</span>` };
}

// ── 4. HELPER: Format timestamp ───────────────────────────────
function _mhFmt(ts) {
    if (!ts) return '';
    try {
        const d = new Date(ts);
        const p = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    } catch(e) { return ''; }
}

// ── 5. HELPER: 24hr filter ───────────────────────────────────
// 24 ghante se purani bets ko filter karo — automatically hatao
function _mhFilterOld(bets) {
    const now = Date.now();
    return bets.filter(b => {
        const ts = b.createdAt
            ? new Date(b.createdAt).getTime()
            : (b.updatedAt ? new Date(b.updatedAt).getTime() : now);
        return (now - ts) < MH_TTL;
    });
}

// ── 6. RENDER CARDS ──────────────────────────────────────────
function _mhRender(bets, total) {
    const container = document.getElementById('myHistoryCards');
    if (!container) return;
    container.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'mh-wrap';

    if (!bets || bets.length === 0) {
        wrap.innerHTML = `
            <div class="mh-empty">
                <span class="mh-empty-icon">📋</span>
                Koi bet nahi mili
            </div>`;
        container.appendChild(wrap);
        return;
    }

    // Cards
    bets.forEach((bet, i) => {
        const betOn  = String(bet.betOn || bet.bet_on || '');
        const period = String(bet.period || '');
        const amount = parseFloat(bet.amount || 0);
        const status = String(bet.status || 'pending');
        const winAmt = parseFloat(bet.winAmount || bet.win_amount || 0);
        const ts     = _mhFmt(bet.createdAt || bet.updatedAt);
        const box    = _mhBoxInfo(betOn);

        let badgeTxt, amtTxt, cls;
        if (status === 'won') {
            badgeTxt = 'Succeed';
            amtTxt   = `+₹${winAmt.toFixed(2)}`;
            cls      = 'won';
        } else if (status === 'lost') {
            badgeTxt = 'Failed';
            amtTxt   = `-₹${amount.toFixed(2)}`;
            cls      = 'lost';
        } else {
            badgeTxt = 'Pending';
            amtTxt   = `₹${amount.toFixed(2)}`;
            cls      = 'pending';
        }

        const card = document.createElement('div');
        card.className = `mh-card c-${cls}`;
        card.style.animationDelay = `${i * 0.04}s`;
        card.innerHTML = `
            <div class="mh-box ${box.cls}">${box.html}</div>
            <div class="mh-info">
                <div class="mh-period">
                    ${period}
                    <span class="mh-period-arrow">▼</span>
                </div>
                <div class="mh-time">${ts}</div>
                <div class="mh-betinfo">Bet: <b>${betOn}</b> &nbsp;|&nbsp; ₹${amount.toFixed(2)}</div>
            </div>
            <div class="mh-right">
                <div class="mh-badge ${cls}">${badgeTxt}</div>
                <div class="mh-amount ${cls}">${amtTxt}</div>
            </div>
        `;
        wrap.appendChild(card);
    });

    // Pagination
    const totalPages = Math.max(1, Math.ceil(total / MH_LIMIT));
    const pag = document.createElement('div');
    pag.className = 'mh-pag';
    pag.innerHTML = `
        <button class="mh-pbtn prev" onclick="mhChangePage(-1)" ${_mhPage <= 1 ? 'disabled' : ''}>&#8249;</button>
        <span class="mh-pinfo">${_mhPage}/${totalPages}</span>
        <button class="mh-pbtn next" onclick="mhChangePage(1)" ${_mhPage >= totalPages ? 'disabled' : ''}>&#8250;</button>
    `;
    wrap.appendChild(pag);
    container.appendChild(wrap);
}

// ── 7. PAGE CHANGE ───────────────────────────────────────────
function mhChangePage(dir) {
    const totalPages = Math.max(1, Math.ceil(_mhTotal / MH_LIMIT));
    _mhPage = Math.max(1, Math.min(totalPages, _mhPage + dir));
    loadMyHistory();
}

// ── 8. MAIN FUNCTION (overrides old loadMyHistory) ───────────
async function loadMyHistory() {
    // Phone number lo
    const phone = (typeof globalPhone !== 'undefined' && globalPhone)
        ? globalPhone
        : (typeof getCurrentUserPhone === 'function' ? getCurrentUserPhone() : null);

    // Loading state
    const container = document.getElementById('myHistoryCards');
    if (container) {
        container.innerHTML = `
            <div class="mh-wrap">
                <div class="mh-empty">
                    <span class="mh-empty-icon" style="font-size:36px">⏳</span>
                    Loading...
                </div>
            </div>`;
    }

    if (!phone) {
        if (container) container.innerHTML = `
            <div class="mh-wrap">
                <div class="mh-empty">
                    <span class="mh-empty-icon">🔒</span>
                    Login karo pehle
                </div>
            </div>`;
        return;
    }

    try {
        const mode = (typeof currentMode !== 'undefined') ? currentMode : 60;

        // API call — auth.js ke /api/bet endpoint ko use karta hai
        const res  = await fetch(
            `/api/bet?phone=${encodeURIComponent(phone)}&mode=${mode}&page=${_mhPage}&limit=${MH_LIMIT}`
        );
        const data = await res.json();

        if (data.success && Array.isArray(data.bets) && data.bets.length > 0) {
            // ── 24hr se purani entries automatically filter karo ──
            const freshBets = _mhFilterOld(data.bets);
            _mhTotal = data.total || freshBets.length;
            _mhRender(freshBets, _mhTotal);
        } else {
            _mhTotal = 0;
            _mhRender([], 0);
        }
    } catch (e) {
        console.error('loadMyHistory error:', e);
        if (container) container.innerHTML = `
            <div class="mh-wrap">
                <div class="mh-empty">
                    <span class="mh-empty-icon">⚠️</span>
                    Load nahi hua, retry karo
                </div>
            </div>`;
    }
}
