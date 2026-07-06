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

const isDatabaseConnectionMessage = (message) => /database|mongodb|atlas|network access|disconnected/i.test(message || "");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const warmAuthApi = () => {
    fetch(`${API_BASE}/health`).catch(() => {});
};

const loginRequest = async (body) => {
    const retryDelays = [0, 900, 1600, 2400];
    let lastDatabaseError;

    for (const delay of retryDelays) {
        if (delay) {
            setMessage("Signing in...");
            await wait(delay);
        }

        try {
            return await request("/auth/login", body);
        } catch (error) {
            if (!isDatabaseConnectionMessage(error.message)) {
                throw error;
            }

            lastDatabaseError = error;
        }
    }

    throw lastDatabaseError || new Error("Could not sign in yet.");
};

const loginForm = document.querySelector("[data-login-form]");
if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        setMessage("Signing in...");
        const submitButton = loginForm.querySelector("button[type='submit']");
        if (submitButton) submitButton.disabled = true;
        let isRedirecting = false;

        try {
            const data = await loginRequest({
                email: loginForm.email.value,
                password: loginForm.password.value
            });

            setSession(data);
            isRedirecting = true;
            window.location.href = data.user.role === "admin" ? "admin.html" : "index.html";
        } catch (error) {
            if (isDatabaseConnectionMessage(error.message)) {
                setMessage("Connection is taking longer than expected. Please try once more.");
            } else {
                setMessage(error.message, "error");
            }
        } finally {
            if (submitButton && !isRedirecting) submitButton.disabled = false;
        }
    });

    warmAuthApi();
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
