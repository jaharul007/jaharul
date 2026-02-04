<!doctype html> 
<html lang="hi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0" />
  <title>JAHARUL GAME</title>
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body { 
      margin: 0; 
      padding: 0; 
      background: #0d0f12; 
      font-family: sans-serif;
      overflow-x: hidden;
    }

    .container {
      position: relative;
      width: 100%;
      max-width: 500px;
      margin: 0 auto;
      padding-bottom: 60px; 
    }

    /* बैलेंस का स्थान - इसे अपनी इमेज के टेक्स्ट के ऊपर सेट किया गया है */
    .balance-container {
      position: absolute;
      top: 13.5%; 
      left: 12%;
      color: #f1c75b; 
      font-weight: bold;
      font-size: 18px;
      z-index: 20;
    }

    .bg-img { width: 100%; display: block; user-select: none; }

    .click-zone {
      position: absolute;
      cursor: pointer;
      z-index: 10;
    }

    /* Buttons */
    .withdraw-btn { top: 3.5%; right: 23%; width: 19%; height: 5.5%; }
    .deposit-btn { top: 3.5%; right: 3%; width: 19%; height: 5.5%; }
    .wingo-btn { top: 35.8%; left: 3%; width: 46%; height: 12.5%; }
    .aviator-btn { top: 48.8%; left: 3%; width: 31%; height: 15.5%; }

    /* Nav (50px Slim) */
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 500px;
      height: 50px; 
      background: #1a1d22;
      display: flex;
      justify-content: space-around;
      align-items: center;
      border-top: 1px solid #333;
      z-index: 1000;
    }

    .nav-item { text-align: center; color: #8e949f; font-size: 10px; flex: 1; cursor: pointer; }
    .nav-item.active { color: #f1c75b; }
    .nav-icon { font-size: 18px; display: block; margin-bottom: 2px; }

    .get-500 {
      position: absolute;
      top: -20px; width: 55px; height: 55px;
      background: linear-gradient(180deg, #f1c75b, #d4a017);
      border-radius: 50%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: #3d2b00; font-weight: bold; border: 3px solid #1a1d22;
    }
  </style>
</head>
<body>

  <div class="container">
    <img src="https://i.imgur.com/chb68bf.png" class="bg-img">

    <div class="balance-container">
      ₹ <span id="user-balance"></span> </div>

    <div class="click-zone withdraw-btn" onclick="goTo('withdraw.html')"></div>
    <div class="click-zone deposit-btn" onclick="goTo('deposit.html')"></div>
    <div class="click-zone wingo-btn" onclick="goTo('wingo_game.html')"></div>
    <div class="click-zone aviator-btn" onclick="goTo('aviator_game.html')"></div>
  </div>

  <div class="bottom-nav">
    <div class="nav-item active" onclick="goTo('index.html')"><span class="nav-icon">🏠</span>Home</div>
    <div class="nav-item" onclick="goTo('activity.html')"><span class="nav-icon">🎁</span>Activity</div>
    <div class="nav-item" style="position: relative;">
      <div class="get-500" onclick="goTo('bonus.html')">
        <span style="font-size: 9px;">Get</span><span style="font-size: 12px;">500</span>
      </div>
    </div>
    <div class="nav-item" onclick="goTo('promotion.html')"><span class="nav-icon">📢</span>Promotion</div>
    <div class="nav-item" onclick="goTo('account.html')"><span class="nav-icon">👤</span>Account</div>
  </div>

  <script>
    async function fetchUserBalance() {
      try {
        // URL se phone number nikalna (Jo register page ne bheja tha)
        const params = new URLSearchParams(window.location.search);
        const phone = params.get('phone');

        if (!phone) {
          console.error("Phone number missing in URL");
          return;
        }

        // MongoDB API ko call karna phone number ke saath
        const response = await fetch(`/api/user/balance?phone=${phone}`); 
        const data = await response.json();

        if (data && data.success) {
          document.getElementById('user-balance').innerText = data.balance.toFixed(2);
        }
      } catch (error) {
        console.error("Balance sync error.");
      }
    }

    window.onload = () => {
      fetchUserBalance();
      // Har 5 second mein balance update hoga (Real-time feel ke liye)
      setInterval(fetchUserBalance, 5000); 
    };

    function goTo(page) {
      const params = new URLSearchParams(window.location.search);
      const phone = params.get('phone');
      // Har page par phone number sath jayega taaki balance dikhta rahe
      window.location.href = page + (phone ? `?phone=${phone}` : "");
    }
</script>

</body>
</html>