async function startRegistration() {
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPass').value.trim();
    const confirm = document.getElementById('regConfirm').value.trim();
    const inviteCode = document.getElementById('regInvite').value.trim();

    if(!phone || !password || !confirm) {
        alert("Please fill all fields!");
        return;
    }
    if(password !== confirm) {
        alert("Passwords do not match!");
        return;
    }

    try {
        // Vercel path automatically '/api/register' handle kar leta hai
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password, inviteCode })
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            localStorage.setItem('userPhone', phone);
            // Seedha Wingo Game par redirect
            window.location.href = 'wingo_game.html';
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Something went wrong. Check connection.");
    }
}
