const AdminApp = window.ClassManagerApp;

let adminSession = AdminApp.getSession();
if (!adminSession?.user) {
  window.location.href = "./index.html";
}

if (adminSession.user.rol !== "Admin") {
  const redirectMap = {
    Profesor: "./dashboardTeacher.html",
    Estudiante: "./dashboardStudent.html",
  };
  window.location.href = redirectMap[adminSession.user.rol] || "./index.html";
}

const usersList = document.getElementById("usuarios-lista");
const usersPagination = document.getElementById("usuarios-pagination");
const classroomForm = document.getElementById("classroom-form");
const classroomGradeInput = document.getElementById("classroom-grade");
const classroomTeacherSelect = document.getElementById("classroom-teacher");
const classroomStudentsContainer =
  document.getElementById("classroom-students");
const classroomList = document.getElementById("classroom-list");
const teacherCreateModal = document.getElementById("teacher-create-modal");
const teacherCreateForm = document.getElementById("teacher-create-form");
const teacherCreateNameInput = document.getElementById("teacher-create-name");
const teacherCreateEmailInput = document.getElementById("teacher-create-email");
const teacherCreatePasswordInput = document.getElementById("teacher-create-password");
const createTeacherQuickButton = document.getElementById("create-teacher-quick");
const createAdminButton = document.getElementById("create-admin");
const userCreateEyebrow = document.getElementById("user-create-eyebrow");
const userCreateTitle = document.getElementById("user-create-title");
const userCreateDescription = document.getElementById("user-create-description");
const userCreateHelper = document.getElementById("user-create-helper");
const userCreateSubmit = document.getElementById("user-create-submit");
const userCreateFeedback = document.getElementById("user-create-feedback");
const classroomEditModal = document.getElementById("classroom-edit-modal");
const classroomEditForm = document.getElementById("classroom-edit-form");
const classroomEditTitle = document.getElementById("classroom-edit-title");
const classroomEditStudentsContainer = document.getElementById(
  "classroom-edit-students",
);
const adminThemeToggle = document.getElementById("admin-theme-toggle");
const adminNotificationsList = document.getElementById(
  "admin-notifications-list",
);
const adminHistoryList = document.getElementById("admin-history-list");
const adminCalendarList = document.getElementById("admin-calendar-list");
const chatbotModeSelect = document.getElementById("chatbot-modo");
const chatbotCurrentMode = document.getElementById("chatbot-modo-actual");
const chatbotPreviewMessages = document.getElementById("chatbot-preview-mensajes");
const chatbotPreviewInput = document.getElementById("chatbot-prueba-input");
const chatbotPreviewSend = document.getElementById("enviar-prueba-chatbot");
const chatbotPreviewStart = document.getElementById("iniciar-prueba-chatbot");
const chatbotProfessorButton = document.getElementById("probar-chatbot-profesor");
const chatbotStudentButton = document.getElementById("probar-chatbot-estudiante");

let classroomEditingId = null;
let adminChatMode = "profesor";
let adminChatHistory = [];
let adminChatLoading = false;
let userCreateRole = "Profesor";
let userActionInFlight = false;
let remoteUsersCache = [];
let usersCurrentPage = 1;
const USERS_PER_PAGE = 4;
const DEFAULT_REMOTE_TIMEOUT_MS = 15000;

const syncUserCreateModalCopy = () => {
  const isAdmin = userCreateRole === "Admin";
  if (userCreateEyebrow) {
    userCreateEyebrow.textContent = isAdmin ? "Alta de administrador" : "Alta de profesor";
  }
  if (userCreateTitle) {
    userCreateTitle.textContent = isAdmin ? "Crear nuevo administrador" : "Crear nuevo profesor";
  }
  if (userCreateDescription) {
    userCreateDescription.textContent = isAdmin
      ? "Ingresa los datos del administrador para que tenga acceso total al panel y pueda iniciar sesion despues."
      : "Ingresa los datos del profesor para que quede disponible en el sistema y pueda iniciar sesion despues.";
  }
  if (userCreateHelper) {
    userCreateHelper.textContent = isAdmin
      ? "El administrador se guardara en la base de datos y quedara disponible con acceso completo."
      : "El profesor se guardara en la base de datos y quedara disponible en la lista de usuarios y en el selector de grados.";
  }
  if (userCreateSubmit) {
    userCreateSubmit.textContent = isAdmin ? "Guardar administrador" : "Guardar profesor";
  }
};

const openUserCreateModal = (role = "Profesor") => {
  userCreateRole = role === "Admin" ? "Admin" : "Profesor";
  syncUserCreateModalCopy();
  clearUserCreateFeedback();
  openTeacherModal();
};

const fetchWithTimeout = async (
  url,
  options = {},
  timeoutMs = DEFAULT_REMOTE_TIMEOUT_MS,
) => {
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

const getStoredAdminCredentials = () => {
  const currentEmail = String(adminSession?.user?.email ?? "").trim().toLowerCase();
  if (!currentEmail) return null;

  return (
    AdminApp.getAuthUsers().find(
      (user) =>
        String(user.email ?? "").trim().toLowerCase() === currentEmail &&
        user.rol === "Admin" &&
        user.password,
    ) || null
  );
};

const ensureRemoteAdminSession = async () => {
  if (adminSession?.token && !String(adminSession.token).startsWith("local_token")) {
    return adminSession;
  }

  const credentials = getStoredAdminCredentials();
  if (!credentials) {
    throw new Error(
      "Debes iniciar sesion con una cuenta admin guardada en la base de datos para crear usuarios.",
    );
  }

  const response = await fetchWithTimeout(
    "/api/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    },
    DEFAULT_REMOTE_TIMEOUT_MS,
  );

  const result = await response.json();
  if (!response.ok || result.status !== "success" || !result.data?.token) {
    throw new Error(
      result.message ||
        "No se pudo validar la sesion admin contra la base de datos.",
    );
  }

  AdminApp.upsertAuthUser({
    ...result.data.user,
    password: credentials.password,
  });
  adminSession = AdminApp.setSession(result.data);
  return adminSession;
};

const fetchRemoteUsers = async () => {
  const remoteSession = await ensureRemoteAdminSession();
  const response = await fetchWithTimeout(
    "/api/users",
    {
      headers: {
        Authorization: `Bearer ${remoteSession.token}`,
      },
    },
    DEFAULT_REMOTE_TIMEOUT_MS,
  );

  const result = await response.json();
  if (!response.ok || result.status !== "success") {
    throw new Error(result.message || "No fue posible cargar los usuarios desde la base de datos.");
  }

  return Array.isArray(result.data) ? result.data : [];
};

const syncUsersFromDatabase = async () => {
  const localUsers = AdminApp.getUsers();
  const localAuthUsers = AdminApp.getAuthUsers();
  const users = await fetchRemoteUsers();
  remoteUsersCache = users;
  AdminApp.replaceKnownUsers([...localUsers, ...localAuthUsers, ...users]);
  return users;
};

const showUserCreateFeedback = (message, type = "success") => {
  if (!userCreateFeedback) return;

  userCreateFeedback.textContent = message;
  userCreateFeedback.className =
    "rounded-2xl border px-4 py-3 text-sm font-bold " +
    (type === "error"
      ? "border-rose-400/30 bg-rose-400/10 text-rose-100"
      : "border-teal-400/30 bg-teal-400/10 text-teal-100");
  userCreateFeedback.classList.remove("hidden");
};

const clearUserCreateFeedback = () => {
  if (!userCreateFeedback) return;
  userCreateFeedback.textContent = "";
  userCreateFeedback.classList.add("hidden");
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "--";

const cloneTemplate = (id) => {
  const template = document.getElementById(id);
  return (
    template?.content?.firstElementChild?.cloneNode(true) ||
    document.createElement("div")
  );
};

const setText = (parent, selector, value) => {
  const element = parent.querySelector(selector);
  if (element) element.textContent = value ?? "";
};

const fillList = (container, items, templateId, fillItem, emptyTemplateId) => {
  if (!container) return;

  container.replaceChildren();
  if (!items.length) {
    if (emptyTemplateId) container.appendChild(cloneTemplate(emptyTemplateId));
    return;
  }

  items.forEach((item) => {
    const node = cloneTemplate(templateId);
    fillItem(node, item);
    container.appendChild(node);
  });
};

const getTone = (type) => {
  const normalized = String(type || "info").toLowerCase();
  return ["warning", "success", "error", "forum", "grade"].includes(normalized)
    ? normalized
    : "info";
};

const getHistoryLabel = (type) => {
  const normalized = String(type || "info").toLowerCase();
  if (normalized === "auth") return "Ingreso";
  if (normalized === "task") return "Tarea";
  if (normalized === "forum") return "Foro";
  if (normalized === "grade") return "Nota";
  if (normalized === "classroom") return "Grado";
  if (normalized === "user") return "Usuario";
  return "Evento";
};

const openModal = (modal) => {
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  modal.setAttribute("aria-hidden", "false");
};

const closeModal = (modal) => {
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  modal.setAttribute("aria-hidden", "true");
};

const openTeacherModal = () => {
  if (!teacherCreateModal) return;

  teacherCreateModal.style.display = "flex";
  teacherCreateModal.style.position = "fixed";
  teacherCreateModal.style.top = "0";
  teacherCreateModal.style.right = "0";
  teacherCreateModal.style.bottom = "0";
  teacherCreateModal.style.left = "0";
  teacherCreateModal.style.zIndex = "9999";
  teacherCreateModal.style.alignItems = "center";
  teacherCreateModal.style.justifyContent = "center";
  teacherCreateModal.style.padding = "1rem";
  teacherCreateModal.style.overflowY = "auto";
  teacherCreateModal.scrollTop = 0;
  document.body.style.overflow = "hidden";
  teacherCreateModal.classList.remove("hidden");
  teacherCreateModal.classList.add("flex");
  teacherCreateModal.setAttribute("aria-hidden", "false");
  teacherCreateNameInput?.focus();
};

const closeTeacherModal = () => {
  if (teacherCreateModal) {
    teacherCreateModal.style.display = "none";
  }
  document.body.style.overflow = "";
  closeModal(teacherCreateModal);
  teacherCreateForm?.reset();
  userCreateRole = "Profesor";
  syncUserCreateModalCopy();
};

const fillStudentOption = (node, student, checked = false) => {
  const input = node.querySelector('input[type="checkbox"]');
  const name = node.querySelector("[data-student-name]");

  if (input) {
    input.value = student.id;
    input.checked = checked;
  }
  if (name) name.textContent = student.name;
};

const openClassroomEditModal = (classroomId) => {
  if (!classroomEditModal) return;

  const classroom = AdminApp.getClassrooms().find(
    (item) => item.id === classroomId,
  );
  if (!classroom) return;

  classroomEditingId = classroomId;
  const users = AdminApp.getUsers();
  const students = AdminApp.getUsersByRole("Estudiante");
  const studentSet = new Set(classroom.estudiantes || []);

  if (classroomEditTitle)
    classroomEditTitle.textContent = `Editar ${classroom.grade}`;

  fillList(
    classroomEditStudentsContainer,
    students,
    "admin-student-checkbox-template",
    (node, student) => {
      const label =
        users.find((item) => item.id === student.id)?.name || student.name;
      fillStudentOption(
        node,
        { ...student, name: label },
        studentSet.has(student.id),
      );
    },
    "admin-edit-students-empty-template",
  );

  openModal(classroomEditModal);
};

const closeClassroomEditModal = () => {
  classroomEditingId = null;
  closeModal(classroomEditModal);
  classroomEditForm?.reset();
};

const getVisibleAdminUsers = () => {
  adminSession = AdminApp.syncStoredSession() || adminSession;
  const currentSessionId = String(adminSession?.user?.id ?? "");
  const currentSessionEmail = String(adminSession?.user?.email ?? "")
    .trim()
    .toLowerCase();
  const mergedUsers = [];
  const sessionUser = adminSession?.user
    ? {
        ...adminSession.user,
        estado: adminSession.user.estado ?? true,
      }
    : null;

  [sessionUser, ...remoteUsersCache, ...AdminApp.getUsers(), ...AdminApp.getAuthUsers()]
    .filter(Boolean)
    .forEach((user) => {
    const email = String(user.email ?? "").trim().toLowerCase();
    const normalizedUser = {
      ...user,
      id: String(user.id ?? user._id ?? ""),
      name: user.name || "Sin nombre",
      email,
      rol: user.rol || "Estudiante",
      estado: user.estado ?? true,
      lastSeenAt: user.lastSeenAt || new Date().toISOString(),
    };
    const existingIndex = mergedUsers.findIndex(
      (item) =>
        (normalizedUser.id && String(item.id) === normalizedUser.id) ||
        (email && String(item.email ?? "").trim().toLowerCase() === email),
    );

    if (existingIndex >= 0) {
      mergedUsers[existingIndex] = {
        ...mergedUsers[existingIndex],
        ...normalizedUser,
      };
    } else {
      mergedUsers.push(normalizedUser);
    }
  });

  return mergedUsers.sort((a, b) => {
    const aIsCurrent =
      String(a.id) === currentSessionId ||
      String(a.email ?? "").trim().toLowerCase() === currentSessionEmail;
    const bIsCurrent =
      String(b.id) === currentSessionId ||
      String(b.email ?? "").trim().toLowerCase() === currentSessionEmail;

    if (aIsCurrent && !bIsCurrent) return -1;
    if (!aIsCurrent && bIsCurrent) return 1;
    return 0;
  });
};

const renderUsersPagination = (totalUsers, totalPages) => {
  if (!usersPagination) return;

  if (totalUsers <= USERS_PER_PAGE) {
    usersPagination.innerHTML = "";
    usersPagination.classList.add("hidden");
    return;
  }

  usersPagination.classList.remove("hidden");
  const start = (usersCurrentPage - 1) * USERS_PER_PAGE + 1;
  const end = Math.min(usersCurrentPage * USERS_PER_PAGE, totalUsers);

  usersPagination.innerHTML = `
    <p class="text-xs font-bold text-slate-400">
      Mostrando <span class="text-white">${start}-${end}</span> de <span class="text-white">${totalUsers}</span> usuarios
    </p>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        data-users-page-prev
        ${usersCurrentPage <= 1 ? "disabled" : ""}
      >
        Anterior
      </button>
      <span class="rounded-xl border border-teal-400/20 bg-teal-400/10 px-3 py-2 text-xs font-black text-teal-100">
        ${usersCurrentPage} / ${totalPages}
      </span>
      <button
        type="button"
        class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        data-users-page-next
        ${usersCurrentPage >= totalPages ? "disabled" : ""}
      >
        Siguiente
      </button>
    </div>
  `;

  usersPagination.querySelector("[data-users-page-prev]")?.addEventListener("click", () => {
    usersCurrentPage = Math.max(1, usersCurrentPage - 1);
    renderUsers();
  });

  usersPagination.querySelector("[data-users-page-next]")?.addEventListener("click", () => {
    usersCurrentPage = Math.min(totalPages, usersCurrentPage + 1);
    renderUsers();
  });
};

const renderUsers = () => {
  if (!usersList) return;

  const users = getVisibleAdminUsers();
  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
  usersCurrentPage = Math.min(Math.max(usersCurrentPage, 1), totalPages);
  const pageStart = (usersCurrentPage - 1) * USERS_PER_PAGE;
  const pagedUsers = users.slice(pageStart, pageStart + USERS_PER_PAGE);
  const currentSessionId = String(adminSession?.user?.id ?? "");
  const currentSessionEmail = String(adminSession?.user?.email ?? "")
    .trim()
    .toLowerCase();
  usersList.innerHTML = "";

  if (!users.length) {
    usersList.innerHTML = `
      <div class="admin-users-empty min-w-[1160px] px-4 py-5 text-sm text-slate-400">
        No hay usuarios para mostrar todavia. Crea un profesor o administrador para llenar esta lista.
      </div>
    `;
    renderUsersPagination(0, 1);
    return;
  }

  pagedUsers.forEach((user) => {
    const isCurrentUser =
      String(user.id) === currentSessionId ||
      String(user.email ?? "").trim().toLowerCase() === currentSessionEmail;
    const nextState = user.estado === false;
    const row = document.createElement("article");
    row.className =
      "admin-users-row flex min-w-[1160px] items-center gap-6 px-4 py-4 text-sm text-slate-300";
    row.innerHTML = `
      <div class="w-[180px] min-w-0 border-r border-white/10 pr-6" data-label="Nombre">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <p class="truncate font-black text-white">${user.name}</p>
          ${
            isCurrentUser
              ? '<span class="rounded-full border border-teal-400/30 bg-teal-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-teal-100">Sesion actual</span>'
              : ""
          }
        </div>
      </div>
      <div class="w-[300px] min-w-0 border-r border-white/10 pr-6" data-label="Correo">
        <p class="truncate text-slate-300">${user.email}</p>
      </div>
      <div class="w-[120px] border-r border-white/10 pr-6" data-label="Rol">
        <p class="font-semibold text-white">${user.rol}</p>
      </div>
      <div class="w-[120px] border-r border-white/10 pr-6" data-label="Estado">
        <p class="${user.estado ? "text-teal-300" : "text-rose-300"} font-semibold">${
      user.estado ? "Activo" : "Inactivo"
    }</p>
      </div>
      <div class="ml-auto w-[160px] text-right text-xs text-slate-500" data-label="Ultimo acceso">
        ${new Date(user.lastSeenAt || Date.now()).toLocaleDateString("es-CO")}
      </div>
      <div class="admin-users-actions w-[220px] shrink-0 text-right" data-label="Acciones">
        ${
          isCurrentUser
            ? '<span class="inline-flex rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-300">Cuenta protegida</span>'
            : `<div class="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  class="${
                    nextState
                      ? "border-teal-400/30 bg-teal-400/10 text-teal-100 hover:bg-teal-400/20"
                      : "border-amber-400/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20"
                  } rounded-2xl border px-3 py-2 text-xs font-black transition"
                  data-toggle-user-status="${user.id}"
                  data-next-state="${String(nextState)}"
                >
                  ${nextState ? "Activar" : "Desactivar"}
                </button>
                <button
                  type="button"
                  class="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs font-black text-rose-100 transition hover:bg-rose-400/20"
                  data-delete-user="${user.id}"
                >
                  Eliminar
                </button>
              </div>`
        }
      </div>
    `;
    usersList.appendChild(row);
  });

  usersList.querySelectorAll("[data-toggle-user-status]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleUserStatus(
        button.dataset.toggleUserStatus,
        button.dataset.nextState === "true",
      );
    });
  });

  usersList.querySelectorAll("[data-delete-user]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteUserAccount(button.dataset.deleteUser);
    });
  });

  renderUsersPagination(users.length, totalPages);
};

const exportUsersExcel = () => {
  const users = getVisibleAdminUsers();
  const headers = ["Nombre", "Correo", "Rol", "Estado", "Sesion actual"];
  const currentSessionId = String(adminSession?.user?.id ?? "");
  const currentSessionEmail = String(adminSession?.user?.email ?? "")
    .trim()
    .toLowerCase();
  const rows = users.map((user) => {
    const isCurrentUser =
      String(user.id) === currentSessionId ||
      String(user.email ?? "").trim().toLowerCase() === currentSessionEmail;

    return [
      user.name || "Sin nombre",
      user.email || "",
      user.rol || "",
      user.estado === false ? "Inactivo" : "Activo",
      isCurrentUser ? "Si" : "No",
    ];
  });

  AdminApp.downloadExcel(
    "usuarios-classmanager.xls",
    "Usuarios",
    headers,
    rows,
  );
};

const userExistsInVisibleList = (email) => {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  return getVisibleAdminUsers().some(
    (user) => String(user.email ?? "").trim().toLowerCase() === normalizedEmail,
  );
};

const createLocalAdminManagedUser = ({ name, email, password, rol }) => {
  const { publicUser } = AdminApp.createLocalAccount({
    name,
    email,
    password,
    rol,
    estado: true,
  });

  return publicUser;
};

const renderNotifications = () => {
  const notifications = AdminApp.getNotificationsForUser(
    adminSession.user.id,
    adminSession.user.rol,
  ).slice(0, 6);

  fillList(
    adminNotificationsList,
    notifications,
    "dashboard-notification-template",
    (node, notification) => {
      node.dataset.tone = getTone(notification.type);
      setText(node, "[data-title]", notification.title);
      setText(
        node,
        "[data-detail]",
        notification.detail || "Sin detalle adicional.",
      );
      setText(node, "[data-date]", formatDate(notification.createdAt));
    },
    "dashboard-notifications-empty-template",
  );
};

const renderHistory = () => {
  const history = AdminApp.getHistoryForUser(
    adminSession.user.id,
    adminSession.user.rol,
  ).slice(0, 8);

  fillList(
    adminHistoryList,
    history,
    "dashboard-history-template",
    (node, entry) => {
      node.dataset.tone = getTone(entry.type);
      setText(node, "[data-title]", entry.title);
      setText(node, "[data-detail]", entry.detail || "Sin detalle adicional.");
      setText(node, "[data-date]", formatDate(entry.createdAt));
      setText(node, "[data-label]", getHistoryLabel(entry.type));
    },
    "dashboard-history-empty-template",
  );
};

const renderCalendar = () => {
  const analytics = AdminApp.getInstitutionAnalytics();

  fillList(
    adminCalendarList,
    analytics.upcomingTasks,
    "admin-calendar-template",
    (node, task) => {
      const classroom = AdminApp.getClassrooms().find(
        (item) => item.id === task.classroomId,
      );
      setText(node, "[data-title]", task.title);
      setText(node, "[data-grade]", classroom?.grade || "Sin grado");
      setText(node, "[data-date]", formatDate(task.fechaEntrega));
    },
    "admin-calendar-empty-template",
  );
};

const syncThemeButton = () => {
  if (!adminThemeToggle) return;

  const theme = AdminApp.getTheme();
  adminThemeToggle.textContent =
    theme === "dark" ? "Modo claro" : "Modo oscuro";
};

const renderSummary = () => {
  const users = AdminApp.getUsers();
  const classrooms = AdminApp.getClassrooms();
  const tasks = AdminApp.getTasks();
  const submissions = AdminApp.getSubmissions();
  const graded = submissions.filter((item) => typeof item.note === "number");
  const iaAlerts = submissions.filter((item) => item.analysisIa?.possibleIa);
  const highlightedCourses = document.getElementById("cursos-destacados-lista");

  const avg =
    graded.length > 0
      ? (
          graded.reduce((total, item) => total + Number(item.note || 0), 0) /
          graded.length
        ).toFixed(1)
      : "0";

  document.getElementById("total-users").textContent = String(users.length);
  document.getElementById("teachers-actives").textContent = String(
    users.filter((user) => user.rol === "Profesor" && user.estado !== false).length,
  );
  document.getElementById("students-actives").textContent = String(
    users.filter((user) => user.rol === "Estudiante" && user.estado !== false).length,
  );
  document.getElementById("global-score").textContent = avg;
  document.getElementById("users-actives").textContent = `${users.length}`;
  document.getElementById("tasks-revised").textContent = `${graded.length}`;
  document.getElementById("ia-alerts").textContent = `${iaAlerts.length} casos`;
  document.getElementById("task-sent").textContent = tasks.length
    ? `${Math.round((submissions.length / tasks.length) * 100)}%`
    : "0%";
  document.getElementById("forum-participation").textContent = tasks.length
    ? `${Math.min(tasks.length * 10, 100)}%`
    : "0%";
  document.getElementById("comprension").textContent = submissions.length
    ? `${Math.round((submissions.filter((item) => item.answer?.answer).length / submissions.length) * 100)}%`
    : "0%";
  document.getElementById("revission-Ia").textContent = String(iaAlerts.length);
  document.getElementById("preguntas-Ia").textContent = String(
    submissions.length,
  );

  fillList(
    highlightedCourses,
    classrooms,
    "admin-highlighted-course-template",
    (node, classroom) => {
      setText(node, "[data-grade]", classroom.grade);
      setText(
        node,
        "[data-teacher]",
        users.find((user) => user.id === classroom.profesorId)?.name ||
          "Profesor sin identificar",
      );
      setText(node, "[data-students]", `${classroom.estudiantes.length} est.`);
    },
    "admin-highlighted-course-empty-template",
  );
};

const renderAdminPanels = () => {
  renderNotifications();
  renderHistory();
  renderCalendar();
  syncThemeButton();
};

const addAdminChatMessage = (text, role) => {
  if (!chatbotPreviewMessages) return;

  const wrapper = document.createElement("div");
  wrapper.className = role === "user" ? "flex justify-end" : "flex justify-start";

  const bubble = document.createElement("div");
  bubble.className =
    role === "user"
      ? "max-w-xl rounded-3xl bg-teal-400/15 px-4 py-3 text-sm text-teal-50"
      : "max-w-xl rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-200";
  bubble.textContent = text;

  wrapper.appendChild(bubble);
  chatbotPreviewMessages.appendChild(wrapper);
  chatbotPreviewMessages.scrollTop = chatbotPreviewMessages.scrollHeight;
};

const setAdminChatLoading = (isLoading) => {
  adminChatLoading = Boolean(isLoading);
  if (chatbotPreviewSend) chatbotPreviewSend.disabled = adminChatLoading;
  if (chatbotPreviewInput) chatbotPreviewInput.disabled = adminChatLoading;
  if (chatbotPreviewStart) chatbotPreviewStart.disabled = adminChatLoading;
};

const getAdminWelcomeMessage = (mode) =>
  mode === "estudiante"
    ? "Puedo simular un estudiante sin restricciones pedagogicas y responder de forma completa para pruebas administrativas."
    : "Puedo simular apoyo docente sin restricciones y ayudarte a probar respuestas completas del asistente.";

const resetAdminChatPreview = () => {
  if (!chatbotPreviewMessages) return;

  chatbotPreviewMessages.innerHTML = "";
  addAdminChatMessage(
    adminChatMode === "estudiante"
      ? "Quiero probar el chatbot como estudiante."
      : "Quiero probar el chatbot como profesor.",
    "user",
  );
  addAdminChatMessage(getAdminWelcomeMessage(adminChatMode), "assistant");
  adminChatHistory = [
    {
      role: "assistant",
      content: getAdminWelcomeMessage(adminChatMode),
    },
  ];
};

const syncAdminChatMode = (mode = "profesor") => {
  adminChatMode = mode === "estudiante" ? "estudiante" : "profesor";
  if (chatbotModeSelect) chatbotModeSelect.value = adminChatMode;
  if (chatbotCurrentMode) {
    chatbotCurrentMode.textContent =
      adminChatMode === "estudiante" ? "Estudiante" : "Profesor";
  }
};

const sendAdminChatMessage = async () => {
  const message = chatbotPreviewInput?.value.trim();
  if (!message || adminChatLoading) return;

  addAdminChatMessage(message, "user");
  adminChatHistory.push({ role: "user", content: message });
  if (chatbotPreviewInput) chatbotPreviewInput.value = "";
  setAdminChatLoading(true);
  addAdminChatMessage("Pensando...", "assistant");

  try {
    const response = await fetch("/api/ai/admin-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: adminChatMode,
        message,
        messages: adminChatHistory.slice(-8),
      }),
    });

    const rawText = await response.text();
    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = { message: "El servidor devolvio una respuesta invalida para el panel admin." };
    }

    if (!response.ok) {
      throw new Error(data.message || "No se pudo probar el asistente.");
    }

    chatbotPreviewMessages.lastElementChild?.remove();
    addAdminChatMessage(data.reply, "assistant");
    adminChatHistory.push({ role: "assistant", content: data.reply });
    adminChatHistory = adminChatHistory.slice(-8);
  } catch (error) {
    chatbotPreviewMessages.lastElementChild?.remove();
    const fallback =
      error.message ||
      "No se pudo conectar con la IA del panel admin en este momento.";
    addAdminChatMessage(fallback, "assistant");
    adminChatHistory.push({ role: "assistant", content: fallback });
    adminChatHistory = adminChatHistory.slice(-8);
  } finally {
    setAdminChatLoading(false);
    chatbotPreviewInput?.focus();
  }
};

const populateClassroomForm = () => {
  const teachers = AdminApp.getUsersByRole("Profesor").filter((teacher) => teacher.estado !== false);
  const students = AdminApp.getUsersByRole("Estudiante");

  classroomTeacherSelect.replaceChildren();
  classroomTeacherSelect.appendChild(new Option("Selecciona un profesor", ""));
  teachers.forEach((teacher) => {
    classroomTeacherSelect.appendChild(
      new Option(`${teacher.name} - ${teacher.email}`, teacher.id),
    );
  });

  fillList(
    classroomStudentsContainer,
    students,
    "admin-student-checkbox-template",
    (node, student) => fillStudentOption(node, student),
    "admin-students-empty-template",
  );
};

const renderClassrooms = () => {
  const users = AdminApp.getUsers();
  const classrooms = AdminApp.getClassrooms();

  fillList(
    classroomList,
    classrooms,
    "admin-classroom-template",
    (node, classroom) => {
      const teacher =
        users.find((user) => user.id === classroom.profesorId)?.name ||
        "Profesor sin identificar";
      const studentNames = classroom.estudiantes
        .map((studentId) => users.find((user) => user.id === studentId)?.name)
        .filter(Boolean);
      const button = node.querySelector("[data-edit-classroom]");

      setText(node, "[data-grade]", classroom.grade);
      setText(node, "[data-teacher]", `Profesor: ${teacher}`);
      setText(
        node,
        "[data-students-count]",
        `${classroom.estudiantes.length} estudiantes`,
      );
      setText(
        node,
        "[data-students-list]",
        studentNames.length
          ? studentNames.join(", ")
          : "Aun no hay estudiantes asignados.",
      );
      if (button) button.dataset.editClassroom = classroom.id;
    },
    "admin-classrooms-empty-template",
  );

  classroomList.querySelectorAll("[data-edit-classroom]").forEach((button) => {
    button.addEventListener("click", () =>
      openClassroomEditModal(button.dataset.editClassroom),
    );
  });
};

const toggleUserStatus = async (userId, nextState) => {
  if (!userId || userActionInFlight) return;

  const targetUser = AdminApp.getUsers().find((user) => user.id === userId);
  if (!targetUser) {
    alert("No se encontro el usuario seleccionado.");
    return;
  }

  const actionLabel = nextState ? "activar" : "desactivar";
  if (!nextState && String(targetUser.id) === String(adminSession?.user?.id)) {
    alert("No puedes desactivar tu propio usuario admin.");
    return;
  }

  if (!window.confirm(`Quieres ${actionLabel} a ${targetUser.name}?`)) {
    return;
  }

  userActionInFlight = true;
  try {
    const remoteSession = await ensureRemoteAdminSession();
    const response = await fetchWithTimeout(
      `/api/users/${userId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${remoteSession.token}`,
        },
        body: JSON.stringify({
          estado: nextState,
        }),
      },
      DEFAULT_REMOTE_TIMEOUT_MS,
    );

    const result = await response.json();
    if (!response.ok || result.status !== "success") {
      throw new Error(result.message || "No fue posible actualizar el estado del profesor.");
    }

    AdminApp.syncStoredUser(result.data);
    renderUsers();
    renderSummary();
    populateClassroomForm();
    renderClassrooms();
    renderAdminPanels();
    alert(nextState ? "Usuario activado correctamente." : "Usuario desactivado correctamente.");
  } catch (error) {
    if (error?.name === "AbortError") {
      alert(
        "El servidor tardo demasiado en responder. Si estas en Render, espera unos segundos y vuelve a intentarlo.",
      );
      return;
    }
    alert(error.message || "No fue posible actualizar el estado del usuario.");
  } finally {
    userActionInFlight = false;
  }
};

const deleteUserAccount = async (userId) => {
  if (!userId || userActionInFlight) return;

  const targetUser = AdminApp.getUsers().find((user) => user.id === userId);
  if (!targetUser) {
    alert("No se encontro el usuario seleccionado.");
    return;
  }

  if (String(targetUser.id) === String(adminSession?.user?.id)) {
    alert("No puedes borrar tu propio usuario.");
    return;
  }

  if (!window.confirm(`Vas a borrar a ${targetUser.name}. Esta accion no se puede deshacer.`)) {
    return;
  }

  userActionInFlight = true;
  try {
    const remoteSession = await ensureRemoteAdminSession();
    const response = await fetchWithTimeout(
      `/api/users/${userId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${remoteSession.token}`,
        },
      },
      DEFAULT_REMOTE_TIMEOUT_MS,
    );

    const result = await response.json();
    if (!response.ok || result.status !== "success") {
      throw new Error(result.message || "No fue posible borrar el profesor.");
    }

    AdminApp.removeStoredUser(userId);
    renderUsers();
    renderSummary();
    populateClassroomForm();
    renderClassrooms();
    renderAdminPanels();
    alert("Usuario borrado correctamente.");
  } catch (error) {
    if (error?.name === "AbortError") {
      alert(
        "El servidor tardo demasiado en responder. Si estas en Render, espera unos segundos y vuelve a intentarlo.",
      );
      return;
    }
    alert(error.message || "No fue posible borrar el usuario.");
  } finally {
    userActionInFlight = false;
  }
};

classroomForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const grade = classroomGradeInput.value.trim();
  const profesorId = classroomTeacherSelect.value;
  const estudiantes = [
    ...classroomStudentsContainer.querySelectorAll(
      'input[type="checkbox"]:checked',
    ),
  ].map((input) => input.value);

  if (!grade || !profesorId) {
    alert("Debes escribir el grado y seleccionar un profesor.");
    return;
  }

  AdminApp.createClassroom({ grade, profesorId, estudiantes });
  classroomForm.reset();
  populateClassroomForm();
  renderClassrooms();
  renderSummary();
  renderAdminPanels();
});

document.getElementById("close-session")?.addEventListener("click", () => {
  const finishLogout = () => {
    AdminApp.clearSession();
    window.location.href = "./index.html";
  };

  if (AdminApp.runSessionTransition) {
    AdminApp.runSessionTransition({
      title: "Cerrando sesion",
      detail: "Guardando tu salida y volviendo al login.",
      tone: "logout",
      onComplete: finishLogout,
    });
    return;
  }

  finishLogout();
});

adminThemeToggle?.addEventListener("click", () => {
  AdminApp.toggleTheme();
  renderAdminPanels();
});

document.getElementById("create-teacher")?.addEventListener("click", () => {
  openUserCreateModal("Profesor");
});

createTeacherQuickButton?.addEventListener("click", () => {
  openUserCreateModal("Profesor");
});

createAdminButton?.addEventListener("click", () => {
  openUserCreateModal("Admin");
});

teacherCreateModal?.querySelectorAll("[data-modal-close]").forEach((button) => {
  button.addEventListener("click", closeTeacherModal);
});

teacherCreateModal?.addEventListener("click", (event) => {
  if (event.target === teacherCreateModal) closeTeacherModal();
});

classroomEditModal?.querySelectorAll("[data-modal-close]").forEach((button) => {
  button.addEventListener("click", closeClassroomEditModal);
});

classroomEditModal?.addEventListener("click", (event) => {
  if (event.target === classroomEditModal) closeClassroomEditModal();
});

teacherCreateForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = teacherCreateNameInput.value.trim();
  const email = teacherCreateEmailInput.value.trim().toLowerCase();
  const password = teacherCreatePasswordInput.value.trim();

  if (!name || !email || !password) {
    alert("Completa nombre, correo y contrasena.");
    return;
  }

  if (userExistsInVisibleList(email)) {
    alert("Ese correo ya existe. Usa otro para el usuario.");
    return;
  }

  const createdRole = userCreateRole;
  let createdRemotely = false;

  try {
    const remoteSession = await ensureRemoteAdminSession();
    const response = await fetchWithTimeout(
      "/api/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${remoteSession.token}`,
        },
        body: JSON.stringify({
          name,
          email,
          password,
          rol: createdRole,
          estado: true,
        }),
      },
      DEFAULT_REMOTE_TIMEOUT_MS,
    );

    const rawText = await response.text();
    let result = {};
    try {
      result = rawText ? JSON.parse(rawText) : {};
    } catch {
      result = {};
    }

    if (!response.ok || result.status !== "success") {
      throw new Error(result.message || "No fue posible guardar el usuario en la base de datos.");
    }

    AdminApp.upsertAuthUser({
      ...result.data,
      password,
    });
    AdminApp.registerKnownUser(result.data);
    remoteUsersCache = [
      result.data,
      ...remoteUsersCache.filter(
        (user) =>
          String(user._id ?? user.id ?? "") !== String(result.data?._id ?? result.data?.id ?? "") &&
          String(user.email ?? "").trim().toLowerCase() !== email,
      ),
    ];
    syncUsersFromDatabase()
      .then(() => {
        renderUsers();
        populateClassroomForm();
        renderSummary();
      })
      .catch((syncError) => {
        console.warn("Usuario creado, pero no se pudo refrescar desde Mongo:", syncError.message);
      });
    createdRemotely = true;
  } catch (error) {
    createLocalAdminManagedUser({
      name,
      email,
      password,
      rol: createdRole,
    });

    const remoteMessage =
      error?.name === "AbortError"
        ? "El servidor tardo demasiado en responder."
        : error.message || "No fue posible guardar en la base de datos.";
    console.warn("Usuario guardado localmente:", remoteMessage);
  }

  populateClassroomForm();
  renderUsers();
  renderSummary();
  renderAdminPanels();
  closeTeacherModal();
  showUserCreateFeedback(
    `${createdRole === "Admin" ? "Administrador" : "Profesor"} creado exitosamente.`,
  );
  alert(
    `${createdRole === "Admin" ? "Administrador" : "Profesor"} creado exitosamente${
      createdRemotely ? " y guardado en la base de datos." : " en esta sesion local."
    }`,
  );
});

classroomEditForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!classroomEditingId) {
    alert("No se encontro el grado seleccionado.");
    return;
  }

  const selectedStudents = [
    ...classroomEditStudentsContainer.querySelectorAll(
      'input[type="checkbox"]:checked',
    ),
  ].map((input) => input.value);

  AdminApp.assignStudentsToClassroom(classroomEditingId, selectedStudents);
  renderClassrooms();
  renderSummary();
  populateClassroomForm();
  renderAdminPanels();
  closeClassroomEditModal();
});

document.getElementById("export-report")?.addEventListener("click", () => {
  const classrooms = AdminApp.getClassrooms();
  const users = AdminApp.getUsers();
  const headers = ["Grado", "Profesor", "Cantidad de estudiantes"];
  const rows = classrooms.map((classroom) => [
    classroom.grade,
    users.find((user) => user.id === classroom.profesorId)?.name || "",
    classroom.estudiantes.length,
  ]);
  AdminApp.downloadExcel(
    "reporte-admin-classmanager.xls",
    "Admin",
    headers,
    rows,
  );
});

document.getElementById("export-csv")?.addEventListener("click", exportUsersExcel);

chatbotModeSelect?.addEventListener("change", () => {
  syncAdminChatMode(chatbotModeSelect.value);
  resetAdminChatPreview();
});

chatbotProfessorButton?.addEventListener("click", () => {
  syncAdminChatMode("profesor");
  resetAdminChatPreview();
});

chatbotStudentButton?.addEventListener("click", () => {
  syncAdminChatMode("estudiante");
  resetAdminChatPreview();
});

chatbotPreviewStart?.addEventListener("click", () => {
  resetAdminChatPreview();
});

chatbotPreviewSend?.addEventListener("click", sendAdminChatMessage);

chatbotPreviewInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendAdminChatMessage();
  }
});

const initializeAdminDashboard = async () => {
  renderUsers();
  populateClassroomForm();
  renderClassrooms();
  renderSummary();
  renderAdminPanels();

  try {
    await syncUsersFromDatabase();
  } catch (error) {
    console.warn(
      "No se pudieron sincronizar usuarios desde la base de datos:",
      error.message,
    );
  }

  populateClassroomForm();
  renderUsers();
  renderClassrooms();
  renderSummary();
  renderAdminPanels();
  syncAdminChatMode("profesor");
  resetAdminChatPreview();
  syncUserCreateModalCopy();
};

initializeAdminDashboard();
