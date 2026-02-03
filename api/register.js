// register.js - Frontend Logic
async function startRegistration() {
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPass').value.trim();
    const confirm = document.getElementById('regConfirm').value.trim();
    const inviteCode = document.getElementById('regInvite').value.trim();

    // Validation
    if(!phone || !password || !confirm) {
        alert("Please fill all fields!");
        return;
    }
    if(password !== confirm) {
        alert("Passwords do not match!");
        return;
    }

    try {
        // Aapke backend server ki API ko call karna
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                phone, 
                password, 
                inviteCode 
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message); // "Registration Successful" ya "Bonus Added"
            localStorage.setItem('token', data.token); // Security ke liye token
            localStorage.setItem('userPhone', phone); 
            window.location.href = 'wingo_game.html'; 
        } else {
            alert(data.message || "Registration Failed.");
        }
    } catch (error) {
        console.error("Server Error:", error);
        alert("Server se connection nahi ho pa raha hai.");
    }
}
