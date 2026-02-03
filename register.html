<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wingo Register</title>
    <style>
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f4f4f4; }
        .box { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); width: 300px; }
        input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; }
        button { width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
        .msg { color: red; text-align: center; margin-top: 10px; font-size: 14px; }
    </style>
</head>
<body>

<div class="box">
    <h2 style="text-align: center;">Register</h2>
    <input type="text" id="phone" placeholder="Phone Number">
    <input type="password" id="password" placeholder="Password">
    <input type="text" id="inviteCode" placeholder="Invite Code (1234)">
    <button onclick="submitRegister()">Register</button>
    <div id="message" class="msg"></div>
</div>

<script>
    async function submitRegister() {
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;
        const inviteCode = document.getElementById('inviteCode').value;
        const messageDiv = document.getElementById('message');

        if (!phone || !password) {
            messageDiv.innerText = "Phone aur Password bharein!";
            return;
        }

        try {
            // Tumhare /api/register route ko call kar raha hai
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password, inviteCode })
            });

            const data = await response.json();

            if (data.success) {
                alert("Registration Successful!");
                // MongoDB mein data save hone ke baad Index page par redirect
                // Phone number ko URL mein bhej rahe hain balance fetch karne ke liye
                window.location.href = `index.html?phone=${phone}`;
            } else {
                messageDiv.innerText = data.message;
            }
        } catch (error) {
            messageDiv.innerText = "Error: Server connect nahi ho raha!";
        }
    }
</script>

</body>
</html>
