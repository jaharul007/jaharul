<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BDG GAME - Register</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(180deg, #2d2d2d 0%, #1a1a1a 100%);
            min-height: 100vh;
            color: #fff;
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 15px 20px;
            background: #3a3a3a;
        }
        .back-btn { background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; }
        .logo { color: #f4c542; font-size: 24px; font-weight: bold; letter-spacing: 2px; }
        .lang { display: flex; align-items: center; gap: 5px; color: #f4c542; }
        .container { padding: 40px 20px; max-width: 600px; margin: auto; }
        h1 { text-align: center; color: #f4c542; margin-bottom: 30px; }
        .form-group { margin-bottom: 25px; }
        .form-label { margin-bottom: 10px; }
        .phone-input-group { display: flex; gap: 10px; }
        .country-code {
            background: #3a3a3a; border: none; color: #fff;
            padding: 15px; border-radius: 8px; width: 120px;
        }
        input {
            width: 100%; background: #3a3a3a; border: none;
            color: #fff; padding: 15px; border-radius: 8px;
        }
        .password-field { position: relative; }
        .toggle-password {
            position: absolute; right: 15px; top: 50%;
            transform: translateY(-50%); background: none;
            border: none; color: #999; cursor: pointer;
        }
        .checkbox-group { display: flex; gap: 10px; margin: 30px 0; }
        .register-btn {
            width: 100%; background: linear-gradient(90deg, #f4c542, #e0a830);
            border: none; color: #2d2d2d; padding: 18px;
            border-radius: 30px; font-size: 18px; font-weight: bold; cursor: pointer;
        }
        .register-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .login-btn {
            width: 100%; background: transparent; border: 2px solid #f4c542;
            color: #f4c542; padding: 16px; border-radius: 30px; margin-top: 15px; cursor: pointer;
        }
        .error-message { background: #ff4444; padding: 12px; border-radius: 8px; display: none; margin-bottom: 15px; }
        .success-message { background: #44ff44; color: #000; padding: 12px; border-radius: 8px; display: none; margin-bottom: 15px; }
        .loading { display: none; text-align: center; color: #f4c542; margin-bottom: 10px; }
    </style>
</head>
<body>

<div class="header">
    <button class="back-btn" onclick="window.history.back()">←</button>
    <div class="logo">BDG GAME</div>
    <div class="lang">EN</div>
</div>

<div class="container">
    <h1>Register your phone</h1>

    <div class="error-message" id="errorMessage"></div>
    <div class="success-message" id="successMessage"></div>
    <div class="loading" id="loading">Processing... Please wait.</div>

    <form id="registerForm">
        <div class="form-group">
            <div class="form-label">Phone number</div>
            <div class="phone-input-group">
                <select class="country-code" id="countryCode">
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                </select>
                <input type="tel" id="phoneNumber" placeholder="Enter phone number" required>
            </div>
        </div>

        <div class="form-group">
            <div class="form-label">Set password</div>
            <div class="password-field">
                <input type="password" id="password" placeholder="Enter password" required>
                <button type="button" class="toggle-password" onclick="togglePassword('password')">👁️</button>
            </div>
        </div>

        <div class="form-group">
            <div class="form-label">Confirm password</div>
            <div class="password-field">
                <input type="password" id="confirmPassword" placeholder="Confirm password" required>
                <button type="button" class="toggle-password" onclick="togglePassword('confirmPassword')">👁️</button>
            </div>
        </div>

        <div class="form-group">
            <div class="form-label">Invite code</div>
            <input type="text" id="inviteCode" placeholder="Enter invite code">
        </div>

        <div class="checkbox-group">
            <input type="checkbox" id="agreeTerms" required>
            <label>I agree privacy policy</label>
        </div>

        <button type="submit" class="register-btn" id="registerBtn">Register</button>
    </form>

    <button class="login-btn" onclick="window.location.href='login.html'">Login</button>
</div>

<script>
    function togglePassword(id) {
        const f = document.getElementById(id);
        f.type = f.type === 'password' ? 'text' : 'password';
    }

    function showError(msg) {
        const el = document.getElementById('errorMessage');
        el.innerText = msg;
        el.style.display = 'block';
        document.getElementById('successMessage').style.display = 'none';
    }

    function showSuccess(msg) {
        const el = document.getElementById('successMessage');
        el.innerText = msg;
        el.style.display = 'block';
        document.getElementById('errorMessage').style.display = 'none';
    }

    document.getElementById("registerForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        // मैसेज रीसेट करें
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('successMessage').style.display = 'none';

        const phone = document.getElementById("countryCode").value + document.getElementById("phoneNumber").value;
        const password = document.getElementById("password").value;
        const confirm = document.getElementById("confirmPassword").value;
        const invite = document.getElementById("inviteCode").value;

        if (password !== confirm) {
            showError("Password does not match");
            return;
        }

        // लोडिंग शुरू करें और बटन डिसेबल करें
        document.getElementById("loading").style.display = "block";
        document.getElementById("registerBtn").disabled = true;

        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phoneNumber: phone,
                    password: password,
                    inviteCode: invite
                })
            });

            const data = await res.json();

            // Vercel/Backend रिस्पॉन्स चेक करें
            if (res.ok) {
                showSuccess(data.message || "Registration Successful!");
                setTimeout(() => {
                    window.location.href = "wingo_game.html";
                }, 1500);
            } else {
                // बैकएंड से आए एरर (जैसे User already exists) को दिखाएं
                showError(data.error || data.message || "Registration Failed");
                document.getElementById("registerBtn").disabled = false;
            }

        } catch (err) {
            console.error("Fetch Error:", err);
            showError("Server Error: Please try again later.");
            document.getElementById("registerBtn").disabled = false;
        } finally {
            document.getElementById("loading").style.display = "none";
        }
    });
</script>

</body>
</html>
