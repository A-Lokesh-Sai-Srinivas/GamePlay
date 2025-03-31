document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initAuth();
});

function initTheme() {
  const savedTheme = localStorage.getItem("theme") || 
                     (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  document.documentElement.setAttribute("data-theme", savedTheme);

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.textContent = savedTheme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode";

    themeToggle.addEventListener("click", () => {
      const newTheme = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
      themeToggle.textContent = newTheme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode";
    });
  }
}

function initAuth() {
  const authStatus = document.getElementById("auth-status");
  const loginForm = document.getElementById("login-form");
  const token = localStorage.getItem("authToken");

  token ? showLoggedInState() : showLoggedOutState();

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (response.ok) {
          localStorage.setItem("authToken", data.token);
          localStorage.setItem("userName", data.user.displayName || email);
          showLoggedInState();
          window.location.href = "/";
        } else {
          showError(data.error || "Login failed");
        }
      } catch (error) {
        showError("An error occurred during login");
        console.error(error);
      }
    });
  }
}

function showLoggedInState() {
  const authStatus = document.getElementById("auth-status");
  const userName = localStorage.getItem("userName") || "User";

  if (authStatus) {
    authStatus.innerHTML = `
      <span>Welcome, ${userName}</span>
      <button id="logout-btn" class="btn btn-outline">Logout</button>
    `;

    setTimeout(() => {
      const logoutBtn = document.getElementById("logout-btn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", logoutUser);
      }
    }, 100);
  }

  document.querySelectorAll(".auth-required").forEach(el => el.style.display = "block");
  document.querySelectorAll(".auth-hidden").forEach(el => el.style.display = "none");
}

function showLoggedOutState() {
  const authStatus = document.getElementById("auth-status");
  if (authStatus) {
    authStatus.innerHTML = `
      <a href="/signin" class="btn btn-primary">Sign In</a>
      <a href="/signup" class="btn btn-outline">Sign Up</a>
    `;
  }

  document.querySelectorAll(".auth-required").forEach(el => el.style.display = "none");
  document.querySelectorAll(".auth-hidden").forEach(el => el.style.display = "block");
}

function logoutUser() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userName");
  showLoggedOutState();
  window.location.href = "/signin";
}

function showError(message) {
  const errorElement = document.getElementById("error-message");
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
    setTimeout(() => (errorElement.style.display = "none"), 5000);
  }
}
