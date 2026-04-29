const API_BASE = "/api/auth";

const loginPanel = document.getElementById("login-panel");
const registerPanel = document.getElementById("register-panel");
const showRegisterButton = document.getElementById("show-register");
const showLoginButton = document.getElementById("show-login");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const loginMessage = document.getElementById("login-message");
const registerMessage = document.getElementById("register-message");

const roleToDashboard = {
  Admin: "./dashboardAdmin.html",
  Profesor: "./dashboardTeacher.html",
  Estudiante: "./dashboardStudent.html",
};

const showMessage = (element, type, message) => {
  element.textContent = message;
  element.className =
    "mt-4 rounded-2xl border px-4 py-3 text-sm " +
    (type === "error"
      ? "border-rose-400/20 bg-rose-400/10 text-rose-100"
      : "border-teal-400/20 bg-teal-400/10 text-teal-100");
  element.classList.remove("hidden");
};

const clearMessage = (element) => {
  element.textContent = "";
  element.classList.add("hidden");
};

const showLoginPanel = () => {
  registerPanel?.classList.add("hidden");
  loginPanel?.classList.remove("hidden");
};

const showRegisterPanel = () => {
  loginPanel?.classList.add("hidden");
  registerPanel?.classList.remove("hidden");
};

const goToDashboard = (role) => {
  const destination = roleToDashboard[role] || "./index.html";
  window.location.href = destination;
};

const getErrorMessage = (result, fallback) =>
  result?.message || result?.error || fallback;

const fetchWithTimeout = async (url, options = {}, timeoutMs = 1800) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

const session = window.ClassManagerApp?.getSession();
if (session?.user?.rol) {
  goToDashboard(session.user.rol);
}

showRegisterButton?.addEventListener("click", () => {
  showRegisterPanel();
  clearMessage(loginMessage);
  clearMessage(registerMessage);
});

showLoginButton?.addEventListener("click", () => {
  showLoginPanel();
  clearMessage(registerMessage);
  clearMessage(loginMessage);
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(loginMessage);

  const formData = new FormData(loginForm);
  const payload = {
    email: String(formData.get("email") || "").trim(),
    password: String(formData.get("password") || "").trim(),
  };

  try {
    const response = await fetchWithTimeout(`${API_BASE}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok || result.status !== "success") {
      throw new Error(result.message || "No fue posible iniciar sesion.");
    }

    window.ClassManagerApp?.upsertAuthUser?.({
      ...result.data.user,
      password: payload.password,
    });
    window.ClassManagerApp.setSession(result.data);
    showMessage(loginMessage, "success", "Inicio de sesion exitoso.");

    setTimeout(() => {
      goToDashboard(result.data.user.rol);
    }, 350);
  } catch (error) {
    const localSession = window.ClassManagerApp?.authenticateLocalUser?.(
      payload.email,
      payload.password,
    );

    if (localSession?.user?.rol) {
      showMessage(loginMessage, "success", "Inicio de sesion local exitoso.");

      setTimeout(() => {
        goToDashboard(localSession.user.rol);
      }, 350);
      return;
    }

    showMessage(loginMessage, "error", "No fue posible iniciar sesion.");
  }
});

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(registerMessage);
  clearMessage(loginMessage);

  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value.trim();
  const confirmPassword = document
    .getElementById("register-confirm-password")
    .value.trim();

  if (password !== confirmPassword) {
    showMessage(registerMessage, "error", "Las contrasenas no coinciden.");
    return;
  }

  try {
    const existingLocalUser = window.ClassManagerApp
      ?.getAuthUsers?.()
      ?.find((user) => user.email === email.toLowerCase());

    if (existingLocalUser) {
      showMessage(registerMessage, "error", "El correo ya esta registrado.");
      return;
    }

    window.ClassManagerApp?.upsertAuthUser?.({
      name,
      email,
      password,
      rol: "Estudiante",
      estado: true,
    });

    showMessage(registerMessage, "success", "Cuenta creada con exito.");

    setTimeout(() => {
      window.ClassManagerApp?.clearSession?.();
      registerForm.reset();
      showLoginPanel();
      clearMessage(registerMessage);

      const loginEmailInput = document.getElementById("login-email");
      if (loginEmailInput) {
        loginEmailInput.value = email;
        loginEmailInput.focus();
      }

      showMessage(
        loginMessage,
        "success",
        "Cuenta creada con exito. Ahora inicia sesion.",
      );
    }, 500);

    fetchWithTimeout(
      `${API_BASE}/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      },
      1200,
    )
      .then(async (response) => {
        if (!response.ok) return null;
        const result = await response.json();
        if (result?.status === "success") {
          window.ClassManagerApp?.upsertAuthUser?.({
            id: result.data?.user?.id,
            name,
            email,
            password,
            rol: "Estudiante",
            estado: true,
          });
        }
        return result;
      })
      .catch(() => null);
  } catch (error) {
    showMessage(registerMessage, "error", getErrorMessage(error, "No fue posible crear la cuenta."));
  }
});
