const isLocalFrontend = ["127.0.0.1", "localhost"].includes(window.location.hostname) && window.location.port !== "5000";
const API_BASE = isLocalFrontend ? "http://localhost:5000/api" : "/api";

const setSession = ({ token, user }) => {
    localStorage.setItem("amaToken", token);
    localStorage.setItem("amaSession", JSON.stringify(user));
};

const setMessage = (message, type = "") => {
    const messageEl = document.querySelector("[data-auth-message]");
    if (!messageEl) return;
    messageEl.textContent = message;
    messageEl.className = `auth-message ${type}`.trim();
};

const request = async (path, body) => {
    let response;

    try {
        response = await fetch(`${API_BASE}${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
    } catch (error) {
        throw new Error("Cannot reach the server. Start the backend on port 5000 and make sure MongoDB is connected.");
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
};

const loginForm = document.querySelector("[data-login-form]");
if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        setMessage("Checking account...");
        const submitButton = loginForm.querySelector("button[type='submit']");
        if (submitButton) submitButton.disabled = true;

        try {
            const data = await request("/auth/login", {
                email: loginForm.email.value,
                password: loginForm.password.value
            });

            setSession(data);
            setMessage("Login successful. Redirecting...", "success");
            window.location.href = data.user.role === "admin" ? "admin.html" : "index.html";
        } catch (error) {
            setMessage(error.message, "error");
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}

const signupForm = document.querySelector("[data-signup-form]");
if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        setMessage("Creating account...");

        try {
            await request("/auth/signup", {
                name: signupForm.name.value,
                email: signupForm.email.value,
                password: signupForm.password.value
            });

            setMessage("Account created. Redirecting to login...", "success");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 700);
        } catch (error) {
            setMessage(error.message, "error");
        }
    });
}
