const TeacherApp = window.ClassManagerApp;
const teacherSession = TeacherApp.getSession();

if (!teacherSession?.user) {
  window.location.href = "./index.html";
}

if (teacherSession.user.rol !== "Profesor") {
  const redirectMap = {
    Admin: "./dashboardAdmin.html",
    Estudiante: "./dashboardStudent.html",
  };
  window.location.href = redirectMap[teacherSession.user.rol] || "./index.html";
}
const teacher = teacherSession.user;
const teacherTaskForm = document.getElementById("teacher-task-form");
const teacherGradeForm = document.getElementById("teacher-grade-form");
const teacherClassroomSelect = document.getElementById("teacher-classroom");
const teacherTaskList = document.getElementById("teacher-task-list");
const teacherTaskEmptyState = document.getElementById("teacher-task-empty-state");
const teacherClassroomsList = document.getElementById("teacher-classrooms-list");
const teacherClassroomsEmptyState = document.getElementById(
  "teacher-classrooms-empty-state",
);
const teacherSubmissionList = document.getElementById("teacher-submission-list");
const teacherSubmissionEmptyState = document.getElementById(
  "teacher-submission-empty-state",
);
const teacherIaDetails = document.getElementById("teacher-ia-details");
const teacherIaEmptyState = document.getElementById("teacher-ia-empty-state");
const teacherGradeStatus = document.getElementById("teacher-grade-status");
const teacherSubmissionInfoModal = document.getElementById(
  "teacher-submission-info-modal",
);
const teacherSubmissionInfoTitle = document.getElementById(
  "teacher-submission-info-title",
);
const teacherSubmissionInfoStudent = document.getElementById(
  "teacher-submission-info-student",
);
const teacherSubmissionInfoEmail = document.getElementById(
  "teacher-submission-info-email",
);
const teacherSubmissionInfoTask = document.getElementById(
  "teacher-submission-info-task",
);
const teacherSubmissionInfoState = document.getElementById(
  "teacher-submission-info-state",
);
const teacherSubmissionInfoFile = document.getElementById(
  "teacher-submission-info-file",
);
const teacherSubmissionInfoDate = document.getElementById(
  "teacher-submission-info-date",
);
const teacherSubmissionInfoAnalysis = document.getElementById(
  "teacher-submission-info-analysis",
);
const teacherSubmissionInfoDefense = document.getElementById(
  "teacher-submission-info-defense",
);
const teacherSubmissionInfoGrade = document.getElementById(
  "teacher-submission-info-grade",
);
const teacherSubmissionInfoComments = document.getElementById(
  "teacher-submission-info-comments",
);
const teacherSubmissionInfoStartGrade = document.getElementById(
  "teacher-submission-info-start-grade",
);
const teacherNotificationsList = document.getElementById("teacher-notifications-list");
const teacherHistoryList = document.getElementById("teacher-history-list");
const teacherForumList = document.getElementById("teacher-forum-list");
const teacherCalendarList = document.getElementById("teacher-calendar-list");
const teacherThemeToggle = document.getElementById("teacher-theme-toggle");
const teacherChatbotMessages = document.getElementById("teacher-chatbot-messages");
const teacherChatbotInput = document.getElementById("teacher-chatbot-input");
const teacherChatbotStatus = document.getElementById("teacher-chatbot-status");
const teacherChatbotSend = document.getElementById("teacher-chatbot-send");

let selectedSubmissionId = null;
let selectedSubmissionInfoId = null;
let teacherChatbotHistory = [];
const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "--";
const getIaPercentage = (submission) =>
  Number(
    submission?.analysisIa?.percentageIa ??
      submission?.analysisIa?.porcentageIa ??
      0,
  );
const getIaBadgeClass = (percentage) => {
  if (percentage >= 60)
    return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  if (percentage >= 25)
    return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  return "border-teal-400/30 bg-teal-400/10 text-teal-100";
};
const createFileLink = (attachment, index = 0) => {
  const name = attachment?.name || `Archivo ${index + 1}`;
  const url = attachment?.dataUrl || attachment?.url || "";
  if (!url) return "";
  return `<a href="${url}" target="_blank" class="underline">${name}</a>`;
};

const updateHeaderAndCounters = () => {
  const { classrooms, tasks, submissions, graded } =
    TeacherApp.getTeacherDashboardData(teacher.id);
  const nextTask = tasks
    .filter((task) => new Date(task.fechaEntrega) >= new Date())
    .sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega))[0];
  const pending = submissions.filter((item) => typeof item.note !== "number");

  document.getElementById("teacher-name").textContent = teacher.name;
  document.getElementById("teacher-email").textContent = teacher.email;
  document.getElementById("teacher-sidebar-classrooms").textContent = String(
    classrooms.length,
  );
  document.getElementById("teacher-sidebar-tasks").textContent = String(tasks.length);
  document.getElementById("teacher-sidebar-pending").textContent = String(
    pending.length,
  );
  document.getElementById("teacher-header-deadline").textContent = nextTask
    ? `${nextTask.title} · ${formatDate(nextTask.fechaEntrega)}`
    : "Sin fechas registradas";
  document.getElementById("teacher-header-pending").textContent = pending.length
    ? `${pending.length} por revisar`
    : "Sin entregas pendientes";
  document.getElementById("grades-asigned").textContent = String(classrooms.length);
  const badgeDuplicate = document.getElementById("grades-asigned-badge");
  if (badgeDuplicate) badgeDuplicate.textContent = String(classrooms.length);
  document.getElementById("active-tasks").textContent = String(tasks.length);
  document.getElementById("pending-deliveries").textContent = String(pending.length);
  document.getElementById("graded-deliveries").textContent = String(graded.length);
};

const renderClassrooms = () => {
  const classrooms = TeacherApp.getClassroomsByProfessor(teacher.id);
  const users = TeacherApp.getUsers();

  teacherClassroomSelect.innerHTML = classrooms.length
    ? classrooms
        .map(
          (classroom) =>
            `<option value="${classroom.id}">${classroom.grade}</option>`,
        )
        .join("")
    : `<option value="">Aun no tienes grados</option>`;

  teacherClassroomsList.innerHTML = classrooms
    .map((classroom) => {
      const studentNames = classroom.estudiantes
        .map((studentId) => users.find((user) => user.id === studentId)?.name)
        .filter(Boolean);

      return `
        <article class="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-lg font-black text-white">${classroom.grade}</p>
              <p class="mt-1 text-sm text-slate-400">${classroom.estudiantes.length} estudiantes</p>
            </div>
            <div class="rounded-2xl bg-teal-400 px-4 py-2 text-sm font-black text-slate-950">
              Activo
            </div>
          </div>
          <p class="mt-3 text-sm leading-7 text-slate-300">
            ${studentNames.length ? studentNames.join(", ") : "Aun no hay estudiantes asignados por el administrador."}
          </p>
        </article>
      `;
    })
    .join("");

  teacherClassroomsEmptyState.classList.toggle("hidden", classrooms.length > 0);
};

const renderNotifications = () => {
  if (!teacherNotificationsList) return;

  const notifications = TeacherApp.getNotificationsForUser(
    teacher.id,
    teacher.rol,
  ).slice(0, 6);

  teacherNotificationsList.innerHTML = notifications.length
    ? notifications
        .map((notification) => {
          const tone = getTonePalette(notification.type);
          return `
            <article class="rounded-2xl border p-3" style="border-color:${tone.border}; background:${tone.bg};">
              <p class="text-sm font-black text-white">${notification.title}</p>
              <p class="mt-1 text-xs leading-5 text-slate-300">${notification.detail || "Sin detalle adicional."}</p>
              <p class="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">${formatDate(notification.createdAt)}</p>
            </article>
          `;
        })
        .join("")
    : `<div class="rounded-2xl border border-dashed border-white/15 bg-slate-900/40 px-4 py-4 text-sm text-slate-400">No hay notificaciones recientes.</div>`;
};

const renderHistory = () => {
  if (!teacherHistoryList) return;

  const history = TeacherApp.getHistoryForUser(teacher.id, teacher.rol).slice(0, 8);

  teacherHistoryList.innerHTML = history.length
    ? history
        .map((entry) => {
          const tone = getTonePalette(entry.type);
          return `
            <article class="rounded-2xl border bg-slate-950/70 px-4 py-4" style="border-color:${tone.border};">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-black text-white">${entry.title}</p>
                  <p class="mt-1 text-xs leading-5 text-slate-400">${entry.detail || "Sin detalle adicional."}</p>
                  <p class="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">${formatDate(entry.createdAt)}</p>
                </div>
                <div class="flex shrink-0 items-center pt-1">
                  <span class="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]" style="border-color:${tone.border}; background:${tone.bg}; color:${tone.text};">${entry.type || "info"}</span>
                </div>
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="rounded-2xl border border-dashed border-white/15 bg-slate-900/40 px-4 py-4 text-sm text-slate-400">No hay historial registrado.</div>`;
};

const renderForumSummary = () => {
  if (!teacherForumList) return;

  const tasks = TeacherApp.getTasksByProfessor(teacher.id);
  const forumEntries = tasks.flatMap((task) => {
    const forum = TeacherApp.getForumByTaskId(task.id);
    if (!forum) return [];
    return TeacherApp.getForumMessagesByForumId(forum.id).map((message) => {
      const author = TeacherApp.getUsers().find((user) => user.id === message.userId);
      return {
        taskTitle: task.title,
        author: author?.name || "Usuario",
        message: message.message,
        createdAt: message.createdAt,
      };
    });
  });

  const recent = forumEntries
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  teacherForumList.innerHTML = recent.length
    ? recent
        .map(
          (entry) => `
            <article class="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-3">
              <p class="text-xs font-black uppercase tracking-[0.18em] text-sky-100">${entry.taskTitle}</p>
              <p class="mt-2 text-sm font-bold text-white">${entry.author}</p>
              <p class="mt-1 text-sm leading-5 text-sky-50">${entry.message}</p>
              <p class="mt-2 text-[11px] uppercase tracking-[0.18em] text-sky-100/70">${formatDate(entry.createdAt)}</p>
            </article>
          `,
        )
        .join("")
    : `<div class="rounded-2xl border border-dashed border-white/15 bg-slate-900/40 px-4 py-4 text-sm text-slate-400">Todavia no hay mensajes en los foros de tus tareas.</div>`;
};

const renderCalendar = () => {
  if (!teacherCalendarList) return;

  const tasks = TeacherApp.getTasksByProfessor(teacher.id)
    .filter((task) => new Date(task.fechaEntrega) >= new Date())
    .sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega))
    .slice(0, 6);

  teacherCalendarList.innerHTML = tasks.length
    ? tasks
        .map((task) => {
          const classroom = TeacherApp.getClassrooms().find((item) => item.id === task.classroomId);
          return `
            <article class="rounded-2xl border px-4 py-4 shadow-sm" style="border-color:rgba(16, 185, 129, 0.22); background:linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(10, 28, 22, 0.9));">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-black text-white">${task.title}</p>
                  <div class="mt-3 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]" style="border-color:rgba(16, 185, 129, 0.24); background:rgba(16, 185, 129, 0.12); color:#d1fae5;">
                    ${classroom?.grade || "Sin grado"}
                  </div>
                </div>
                <div class="shrink-0 rounded-2xl border px-3 py-2 text-right" style="border-color:rgba(16, 185, 129, 0.18); background:rgba(15, 23, 42, 0.72);">
                  <p class="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/70">Fecha</p>
                  <p class="mt-1 text-sm font-bold text-emerald-50">${formatDate(task.fechaEntrega)}</p>
                </div>
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="rounded-2xl border border-dashed border-white/15 bg-slate-900/40 px-4 py-4 text-sm text-slate-400">No hay entregas próximas registradas.</div>`;
};

const syncThemeButton = () => {
  if (!teacherThemeToggle) return;
  const theme = TeacherApp.getTheme();
  teacherThemeToggle.textContent = theme === "dark" ? "Modo claro" : "Modo oscuro";
};

const addTeacherChatMessage = (text, role) => {
  if (!teacherChatbotMessages) return;

  const wrapper = document.createElement("div");
  wrapper.className = role === "user" ? "flex justify-end" : "flex justify-start";

  const bubble = document.createElement("div");
  bubble.className =
    role === "user"
      ? "max-w-xl rounded-3xl bg-teal-400/15 px-4 py-3 text-sm text-teal-50"
      : "max-w-xl rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-200";
  bubble.textContent = text;

  wrapper.appendChild(bubble);
  teacherChatbotMessages.appendChild(wrapper);
  teacherChatbotMessages.scrollTop = teacherChatbotMessages.scrollHeight;
};

const setTeacherChatbotLoading = (isLoading) => {
  if (teacherChatbotSend) teacherChatbotSend.disabled = isLoading;
  if (teacherChatbotInput) teacherChatbotInput.disabled = isLoading;
  if (teacherChatbotStatus) {
    teacherChatbotStatus.textContent = isLoading
      ? "Generando apoyo docente..."
      : "Listo para apoyar tu trabajo docente";
  }
};

const buildTeacherLocalReply = (message) => {
  const lower = String(message ?? "").toLowerCase();

  if (lower.includes("rubrica") || lower.includes("rúbrica")) {
    return "Puedo ayudarte con una rubrica. Dime la tarea, el grado, los criterios y la escala que quieres usar, por ejemplo de 1 a 5.";
  }

  if (lower.includes("feedback") || lower.includes("retroaliment")) {
    return "Comparte el texto del estudiante o un resumen de aciertos y fallos, y te propongo un comentario docente claro y utilizable.";
  }

  if (lower.includes("defensa") || lower.includes("preguntas")) {
    return "Dime el tema o pega la entrega y te propongo preguntas de defensa para validar comprension.";
  }

  if (lower.includes("mensaje") || lower.includes("aviso")) {
    return "Puedo redactar un mensaje para estudiantes o acudientes. Dime el objetivo, el tono y los puntos clave.";
  }

  return "Puedo ayudarte como docente con rubricas, comentarios, preguntas de defensa, mensajes y mejora de actividades. Escribe lo que necesitas y avanzo contigo.";
};

const askTeacherAssistant = async () => {
  const message = teacherChatbotInput?.value.trim();
  if (!message) return;

  addTeacherChatMessage(message, "user");
  teacherChatbotHistory.push({ role: "user", content: message });
  if (teacherChatbotInput) teacherChatbotInput.value = "";
  setTeacherChatbotLoading(true);

  try {
    const response = await fetch("/api/ai/teacher-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        messages: teacherChatbotHistory.slice(-8),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "No se pudo generar apoyo docente.");
    }

    addTeacherChatMessage(data.reply, "assistant");
    teacherChatbotHistory.push({ role: "assistant", content: data.reply });
    teacherChatbotHistory = teacherChatbotHistory.slice(-8);
    if (teacherChatbotStatus) {
      teacherChatbotStatus.textContent = "Apoyo docente generado";
    }
  } catch (error) {
    const fallbackReply = buildTeacherLocalReply(message);
    addTeacherChatMessage(fallbackReply, "assistant");
    teacherChatbotHistory.push({ role: "assistant", content: fallbackReply });
    teacherChatbotHistory = teacherChatbotHistory.slice(-8);
    if (teacherChatbotStatus) {
      teacherChatbotStatus.textContent = "Apoyo docente generado en modo local";
    }
  } finally {
    setTeacherChatbotLoading(false);
    teacherChatbotInput?.focus();
  }
};

const renderTeacherPanels = () => {
  renderNotifications();
  renderHistory();
  renderForumSummary();
  renderCalendar();
  syncThemeButton();
};

const renderTasks = () => {
  const tasks = TeacherApp.getTasksByProfessor(teacher.id);
  const classrooms = TeacherApp.getClassrooms();

  teacherTaskList.innerHTML = tasks
    .map((task) => {
      const classroom = classrooms.find((item) => item.id === task.classroomId);
      return `
        <article class="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-300">${classroom?.grade || "Grado"}</p>
              <h3 class="mt-3 text-xl font-black text-white">${task.title}</h3>
              <p class="mt-3 text-sm leading-7 text-slate-300">${task.descripcion}</p>
              <div class="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
                <span>Entrega: ${formatDate(task.fechaEntrega)}</span>
                <span>Metodo: ${task.assessmentMethods}</span>
              </div>
            </div>
            <div class="flex flex-wrap gap-3">
              <button type="button" data-action="view-submissions" data-task-id="${task.id}" class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                Ver entregas
              </button>
              <button type="button" data-action="delete-task" data-task-id="${task.id}" class="rounded-2xl bg-rose-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-rose-300">
                Eliminar
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  teacherTaskEmptyState.classList.toggle("hidden", tasks.length > 0);

  teacherTaskList.querySelectorAll('[data-action="view-submissions"]').forEach((button) => {
    button.addEventListener("click", () => {
      const taskId = button.dataset.taskId;
      const section = document.getElementById("entregas");
      if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
      renderSubmissions(taskId);
    });
  });

  teacherTaskList.querySelectorAll('[data-action="delete-task"]').forEach((button) => {
    button.addEventListener("click", () => {
      if (!confirm("Quieres eliminar esta tarea?")) return;
      TeacherApp.deleteTask(button.dataset.taskId);
      renderAllTeacher();
    });
  });
};

const renderIaPanel = (submission) => {
  if (!submission) {
    teacherIaDetails.innerHTML = "";
    teacherIaEmptyState.classList.remove("hidden");
    return;
  }

  teacherIaEmptyState.classList.add("hidden");
  const iaPercentage = getIaPercentage(submission);
  teacherIaDetails.innerHTML = `
    <article class="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
      <p class="text-sm font-bold text-white">Posible uso de IA</p>
      <p class="mt-3 text-2xl font-black text-white">${submission.analysisIa?.possibleIa ? "Si" : "No"}</p>
      <p class="mt-2 text-sm text-slate-400">Porcentaje estimado: ${iaPercentage}%</p>
    </article>
    <article class="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
      <p class="text-sm font-bold text-white">Feedback IA</p>
      <p class="mt-3 text-sm leading-7 text-slate-300">${submission.analysisIa?.feedback || "Sin observaciones."}</p>
    </article>
    <article class="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
      <p class="text-sm font-bold text-white">Defensa del estudiante</p>
      <p class="mt-3 text-sm text-slate-400">Pregunta: ${submission.answer?.ask || "Sin pregunta registrada"}</p>
      <p class="mt-2 text-sm leading-7 text-slate-300">Respuesta: ${submission.answer?.answer || "Sin respuesta registrada"}</p>
    </article>
  `;
};

const prefillGradeForm = (submission) => {
  selectedSubmissionId = submission.id;
  document.getElementById("submission-id").value = submission.id;
  document.getElementById("submission-note").value = submission.note ?? "";
  document.getElementById("teacher-comments").value =
    submission.teacherComments ?? "";
  renderIaPanel(submission);
};

const openSubmissionInfoModal = (submissionId) => {
  const submission = TeacherApp.getSubmissions().find(
    (item) => item.id === submissionId,
  );
  if (!submission || !teacherSubmissionInfoModal) return;

  const users = TeacherApp.getUsers();
  const tasks = TeacherApp.getTasksByProfessor(teacher.id);
  const student = users.find((user) => user.id === submission.estudianteId);
  const task = tasks.find((item) => item.id === submission.taskId);

  selectedSubmissionInfoId = submission.id;
  teacherSubmissionInfoTitle.textContent = task?.title || "Entrega";
  teacherSubmissionInfoStudent.textContent = student?.name || "Estudiante";
  teacherSubmissionInfoEmail.textContent = student?.email || "--";
  teacherSubmissionInfoTask.textContent = task?.title || "--";
  teacherSubmissionInfoState.textContent = submission.state || "--";
  teacherSubmissionInfoFile.innerHTML = renderSubmissionFiles(submission);
  teacherSubmissionInfoDate.textContent = formatDate(submission.fechaEntrega);
  const iaPercentage = getIaPercentage(submission);
  teacherSubmissionInfoAnalysis.textContent =
    `Uso estimado de IA: ${iaPercentage}%. ${
      submission.analysisIa?.feedback ||
      "Sin observaciones de IA registradas todavia."
    }`;
  teacherSubmissionInfoDefense.textContent = submission.answer?.ask
    ? `${submission.answer.ask} ${submission.answer?.answer ? `Respuesta: ${submission.answer.answer}` : ""}`
    : "Sin defensa registrada.";
  teacherSubmissionInfoGrade.textContent =
    typeof submission.note === "number" ? String(submission.note) : "Sin nota";
  teacherSubmissionInfoComments.textContent =
    submission.teacherComments || "Aun no hay comentario docente.";

  teacherSubmissionInfoModal.style.display = "flex";
  teacherSubmissionInfoModal.style.position = "absolute";
  teacherSubmissionInfoModal.style.top = `${window.scrollY}px`;
  teacherSubmissionInfoModal.style.left = "0";
  teacherSubmissionInfoModal.style.right = "0";
  teacherSubmissionInfoModal.style.bottom = "auto";
  teacherSubmissionInfoModal.style.minHeight = `${window.innerHeight}px`;
  teacherSubmissionInfoModal.style.alignItems = "center";
  teacherSubmissionInfoModal.style.justifyContent = "center";
  teacherSubmissionInfoModal.style.zIndex = "9999";
  teacherSubmissionInfoModal.style.padding = "1rem";
  teacherSubmissionInfoModal.classList.remove("hidden");
  teacherSubmissionInfoModal.classList.add("flex");
  teacherSubmissionInfoModal.setAttribute("aria-hidden", "false");
};

const closeSubmissionInfoModal = () => {
  if (!teacherSubmissionInfoModal) return;

  selectedSubmissionInfoId = null;
  teacherSubmissionInfoModal.style.display = "";
  teacherSubmissionInfoModal.style.position = "";
  teacherSubmissionInfoModal.style.top = "";
  teacherSubmissionInfoModal.style.left = "";
  teacherSubmissionInfoModal.style.right = "";
  teacherSubmissionInfoModal.style.bottom = "";
  teacherSubmissionInfoModal.style.minHeight = "";
  teacherSubmissionInfoModal.style.alignItems = "";
  teacherSubmissionInfoModal.style.justifyContent = "";
  teacherSubmissionInfoModal.style.zIndex = "";
  teacherSubmissionInfoModal.style.padding = "";
  teacherSubmissionInfoModal.classList.add("hidden");
  teacherSubmissionInfoModal.classList.remove("flex");
  teacherSubmissionInfoModal.setAttribute("aria-hidden", "true");
};
const renderSubmissionFiles = (submission) => {
  if (!submission?.attachments?.length) return "Sin archivos";
  return submission.attachments
    .map((file, i) => createFileLink(file, i))
    .join(" · ");
};

const renderSubmissions = (taskId = null) => {
  const container = document.getElementById("teacher-submission-list");
  const users = TeacherApp.getUsers();
  const tasks = TeacherApp.getTasksByProfessor(teacher.id);
  const submissions = TeacherApp.getSubmissionsByProfessor(teacher.id).filter(
    (s) => !taskId || s.taskId === taskId,
  );

  container.innerHTML = submissions
    .map((submission) => {
      const student = users.find((u) => u.id === submission.estudianteId);
      const task = tasks.find((t) => t.id === submission.taskId);
      const graded = typeof submission.note === "number";
      const ia = getIaPercentage(submission);
      const badge = getIaBadgeClass(ia);
      return ` <article class="p-4 rounded-xl bg-slate-800 border border-white/10"> <p class="text-xs font-bold ${graded ? "text-green-400" : "text-yellow-400"}">
       ${graded ? "Calificada" : "Pendiente"} </p> 
       <h3 class="text-lg font-bold mt-2">${task?.title || "Tarea"}</h3> 
       <p class="text-sm text-gray-400"> ${student?.name || "Estudiante"} - ${student?.email || ""} </p> 
       <p class="text-sm text-gray-400 mt-1"> Estado: ${submission.state} </p> 
       <div class="mt-2 text-xs ${badge} px-2 py-1 rounded-full inline-block">
        IA: ${ia}% 
        </div> 
        <p class="mt-2 text-sm"> ${renderSubmissionFiles(submission)} </p> 
        <div class="mt-3 flex gap-2">
         <button data-id="${submission.id}" class="btn-grade bg-teal-400 px-3 py-1 rounded"> ${graded ? "Editar" : "Calificar"} </button> 
         </div> 
         </article> `;
    })
    .join("");
  document.querySelectorAll(".btn-grade").forEach((btn) => {
    btn.addEventListener("click", () => {
      const submission = TeacherApp.getSubmissions().find(
        (s) => s.id === btn.dataset.id,
      );
      if (!submission) return;
      document.getElementById("submission-id").value = submission.id;
      document.getElementById("submission-note").value = submission.note || "";
      document.getElementById("teacher-comments").value =
        submission.teacherComments || "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
};
teacherTaskForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const classroomId = teacherClassroomSelect.value;
  if (!classroomId) {
    alert("Necesitas un grado asignado por el administrador para crear tareas.");
    return;
  }

  const title = document.getElementById("teacher-task-title").value.trim();
  const descripcion = document
    .getElementById("teacher-task-description")
    .value.trim();
  const fechaEntrega = document.getElementById("teacher-task-date").value;
  const assessmentMethods = document
    .getElementById("teacher-task-method")
    .value.trim();

  if (!title || !descripcion || !fechaEntrega || !assessmentMethods) {
    alert("Completa todos los campos de la tarea.");
    return;
  }

  TeacherApp.createTask({
    title,
    descripcion,
    fechaEntrega,
    assessmentMethods,
    classroomId,
    profesorId: teacher.id,
  });

  teacherTaskForm.reset();
  renderAllTeacher();
});

teacherGradeForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!selectedSubmissionId) {
    alert("Selecciona una entrega para calificar.");
    if (teacherGradeStatus) {
      teacherGradeStatus.textContent = "Primero selecciona una entrega.";
      teacherGradeStatus.className = "text-sm text-rose-300";
    }
    return;
  }

  const note = document.getElementById("submission-note").value.trim();
  const teacherComments = document.getElementById("teacher-comments").value.trim();

  if (!note) {
    alert("Debes ingresar una nota.");
    if (teacherGradeStatus) {
      teacherGradeStatus.textContent = "Agrega una nota para guardar la calificacion.";
      teacherGradeStatus.className = "text-sm text-rose-300";
    }
    return;
  }

  try {
    TeacherApp.gradeSubmission(selectedSubmissionId, { note, teacherComments });
    renderAllTeacher();
    const submission = TeacherApp.getSubmissions().find(
      (item) => item.id === selectedSubmissionId,
    );
    if (submission) prefillGradeForm(submission);
    if (teacherGradeStatus) {
      teacherGradeStatus.textContent = "Calificacion guardada correctamente.";
      teacherGradeStatus.className = "text-sm text-teal-300";
    }
  } catch (error) {
    alert(error.message);
    if (teacherGradeStatus) {
      teacherGradeStatus.textContent = error.message;
      teacherGradeStatus.className = "text-sm text-rose-300";
    }
  }
});

document.getElementById("teacher-export-report")?.addEventListener("click", () => {
  const users = TeacherApp.getUsers();
  const tasks = TeacherApp.getTasksByProfessor(teacher.id);
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const headers = ["Tarea", "Estudiante", "Estado", "IA estimada", "Nota", "Comentario"];
  const rows = TeacherApp.getSubmissionsByProfessor(teacher.id).map((submission) => [
    taskMap.get(submission.taskId)?.title || "",
    users.find((user) => user.id === submission.estudianteId)?.name || "",
    submission.state,
    `${getIaPercentage(submission)}%`,
    submission.note ?? "",
    submission.teacherComments ?? "",
  ]);
  TeacherApp.downloadExcel(
    "reporte-profesor-classmanager.xls",
    "Profesor",
    headers,
    rows,
  );
});

document.getElementById("teacher-open-forum")?.addEventListener("click", () => {
  document.getElementById("seguimiento-docente")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
});

teacherChatbotSend?.addEventListener("click", askTeacherAssistant);

teacherChatbotInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    askTeacherAssistant();
  }
});

document.getElementById("teacher-chatbot-reset")?.addEventListener("click", () => {
  if (!teacherChatbotMessages) return;
  teacherChatbotMessages.innerHTML = `
    <div class="flex justify-start">
      <div class="max-w-xl rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-200">
        Puedo ayudarte a crear rubricas, comentarios de retroalimentacion, preguntas de defensa, mensajes para estudiantes y actividades mejor estructuradas.
      </div>
    </div>
  `;
  teacherChatbotHistory = [];
  if (teacherChatbotStatus) {
    teacherChatbotStatus.textContent = "Listo para apoyar tu trabajo docente";
  }
});

teacherSubmissionInfoModal?.querySelectorAll("[data-modal-close]").forEach((button) => {
  button.addEventListener("click", closeSubmissionInfoModal);
});

teacherSubmissionInfoModal?.addEventListener("click", (event) => {
  if (event.target === teacherSubmissionInfoModal) {
    closeSubmissionInfoModal();
  }
});

teacherSubmissionInfoStartGrade?.addEventListener("click", () => {
  if (!selectedSubmissionInfoId) return;
  const submission = TeacherApp.getSubmissions().find(
    (item) => item.id === selectedSubmissionInfoId,
  );
  if (!submission) return;
  prefillGradeForm(submission);
  document.querySelector("#teacher-grade-form")?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
  closeSubmissionInfoModal();
});
const renderAllTeacher = () => {
  updateHeaderAndCounters();
  renderClassrooms();
  renderTasks();
  renderSubmissions();
  renderIaPanel(TeacherApp.getSubmissionsByProfessor(teacher.id)[0] || null);
  renderTeacherPanels();
};

document.getElementById("close-session")?.addEventListener("click", () => {
  const finishLogout = () => {
    TeacherApp.clearSession();
    window.location.href = "./index.html";
  };

  if (TeacherApp.runSessionTransition) {
    TeacherApp.runSessionTransition({
      title: "Cerrando sesion",
      detail: "Guardando tu salida y volviendo al login.",
      tone: "logout",
      onComplete: finishLogout,
    });
    return;
  }

  finishLogout();
});

renderAllTeacher();
