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

const warmAuthApi = () => {
    fetch(`${API_BASE}/health`).catch(() => {});
};

const loginRequest = async (body) => {
    return request("/auth/login", body);
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const signupRequest = async (body) => {
    const retryDelays = [0, 900, 1600, 2400];
    let lastDatabaseError;

    for (const delay of retryDelays) {
        if (delay) {
            setMessage("Creating account...");
            await wait(delay);
        }

        try {
            return await request("/auth/signup", body);
        } catch (error) {
            if (!isDatabaseConnectionMessage(error.message)) {
                throw error;
            }

            lastDatabaseError = error;
        }
    }

    throw lastDatabaseError || new Error("Could not create account yet.");
};

const loginForm = document.querySelector("[data-login-form]");
if (loginForm) {
    const passwordInput = loginForm.querySelector("input[name='password']");
    const passwordToggle = loginForm.querySelector("[data-password-toggle]");

    passwordToggle?.addEventListener("click", () => {
        if (!passwordInput) return;

        const shouldShowPassword = passwordInput.type === "password";
        passwordInput.type = shouldShowPassword ? "text" : "password";
        passwordToggle.setAttribute("aria-pressed", String(shouldShowPassword));
        passwordToggle.setAttribute("aria-label", shouldShowPassword ? "Hide password" : "Show password");
        passwordInput.focus();
    });

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        setMessage("Logging you in...");
        window.holdAmaLoader?.("Logging you in...");
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
            window.showAmaLoader?.(data.user.role === "admin" ? "Opening dashboard..." : "Opening store...");
            window.location.href = data.user.role === "admin" ? "admin.html" : "index.html";
        } catch (error) {
            if (isDatabaseConnectionMessage(error.message)) {
                setMessage("Connection is taking longer than expected. Please try once more.");
            } else {
                setMessage(error.message, "error");
            }
        } finally {
            if (!isRedirecting) window.releaseAmaLoader?.();
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
        window.holdAmaLoader?.("Creating account...");
        const submitButton = signupForm.querySelector("button[type='submit']");
        if (submitButton) submitButton.disabled = true;
        let isRedirecting = false;

        try {
            await signupRequest({
                name: signupForm.name.value,
                email: signupForm.email.value,
                password: signupForm.password.value
            });

            setMessage("Account created. Redirecting to login...", "success");
            isRedirecting = true;
            window.showAmaLoader?.("Opening login...");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 700);
        } catch (error) {
            if (isDatabaseConnectionMessage(error.message)) {
                setMessage("Creating account...");
            } else {
                setMessage(error.message, "error");
            }
        } finally {
            if (!isRedirecting) window.releaseAmaLoader?.();
            if (submitButton && !isRedirecting) submitButton.disabled = false;
        }
    });
}
