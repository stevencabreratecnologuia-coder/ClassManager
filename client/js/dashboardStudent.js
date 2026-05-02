const StudentApp = window.ClassManagerApp;

const studentSession = StudentApp.getSession();
if (!studentSession?.user) {
  window.location.href = "./index.html";
}

if (studentSession.user.rol !== "Estudiante") {
  const redirectMap = {
    Admin: "./dashboardAdmin.html",
    Profesor: "./dashboardTeacher.html",
  };
  window.location.href = redirectMap[studentSession.user.rol] || "./index.html";
}

const student = studentSession.user;
let activeTaskId = null;
let activeForumId = null;
let currentTaskInfoId = null;

const pendingList = document.getElementById("student-pending-tasks-list");
const pendingEmpty = document.getElementById("student-pending-empty-state");
const submittedList = document.getElementById("student-submitted-tasks-list");
const submittedEmpty = document.getElementById("student-submitted-empty-state");
const gradeList = document.getElementById("student-grade-list");
const gradeEmpty = document.getElementById("student-grade-empty-state");
const defenseList = document.getElementById("student-defense-list");
const defenseEmpty = document.getElementById("student-defense-empty-state");
const submissionPanel = document.getElementById("student-submission-panel");
const submissionForm = document.getElementById("student-submission-form");
const submissionFilesInput = document.getElementById(
  "student-submission-files",
);
const submissionFilesTrigger = document.getElementById(
  "student-submission-files-trigger",
);
const submissionFilesText = document.getElementById(
  "student-submission-files-text",
);
const submissionLinkInput = document.getElementById("student-submission-link");
const taskInfoModal = document.getElementById("student-task-info-modal");
const taskInfoTitle = document.getElementById("student-task-info-title");
const taskInfoGrade = document.getElementById("student-task-info-grade");
const taskInfoProfessor = document.getElementById(
  "student-task-info-professor",
);
const taskInfoDeadline = document.getElementById("student-task-info-deadline");
const taskInfoMethod = document.getElementById("student-task-info-method");
const taskInfoDescription = document.getElementById(
  "student-task-info-description",
);
const taskInfoStatus = document.getElementById("student-task-info-status");
const taskInfoStartButton = document.getElementById("student-task-info-start");
const taskInfoForumMessages = document.getElementById(
  "student-task-forum-messages",
);
const taskInfoForumInput = document.getElementById("student-task-forum-input");
const taskInfoForumSend = document.getElementById("student-task-forum-send");
const studentNotificationsList = document.getElementById(
  "student-notifications-list",
);
const studentHistoryList = document.getElementById("student-history-list");
const studentCalendarList = document.getElementById("student-calendar-list");
const studentThemeToggle = document.getElementById("student-theme-toggle");
const chatbotMessages = document.getElementById("student-chatbot-messages");
const chatbotInput = document.getElementById("student-chatbot-input");
const chatbotStatus = document.getElementById("student-chatbot-status");

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

const fillList = (container, items, templateId, fillItem) => {
  if (!container) return;
  container.replaceChildren();
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

const updateSubmissionFilesLabel = () => {
  if (!submissionFilesText) return;

  const files = [...(submissionFilesInput?.files || [])];
  if (!files.length) {
    submissionFilesText.textContent = "No hay archivos seleccionados";
    return;
  }

  submissionFilesText.textContent =
    files.length === 1
      ? files[0].name
      : `${files.length} archivos seleccionados`;
};

const getTaskMeta = (task) => {
  const classroom = StudentApp.getClassrooms().find(
    (item) => item.id === task.classroomId,
  );
  const professor = StudentApp.getUsers().find(
    (user) => user.id === task.profesorId,
  );
  return { classroom, professor };
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: reader.result,
      });
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });

const renderStudentNotifications = () => {
  const notifications = StudentApp.getNotificationsForUser(
    student.id,
    student.rol,
  ).slice(0, 4);

  fillList(
    studentNotificationsList,
    notifications,
    "student-notification-template",
    (node, notification) => {
      setText(node, "[data-title]", notification.title);
      setText(
        node,
        "[data-detail]",
        notification.detail || "Sin detalle adicional.",
      );
    },
  );
  studentNotificationsList?.appendChild(
    notifications.length
      ? document.createDocumentFragment()
      : cloneTemplate("student-notifications-empty-template"),
  );
};

const renderStudentHistory = () => {
  const history = StudentApp.getHistoryForUser(student.id, student.rol).slice(
    0,
    6,
  );

  fillList(
    studentHistoryList,
    history,
    "student-history-template",
    (node, entry) => {
      node.dataset.tone = getTone(entry.type);
      setText(node, "[data-title]", entry.title);
      setText(node, "[data-detail]", entry.detail || "Sin detalle adicional.");
      setText(node, "[data-date]", formatDate(entry.createdAt));
    },
  );
  studentHistoryList?.appendChild(
    history.length
      ? document.createDocumentFragment()
      : cloneTemplate("student-history-empty-template"),
  );
};

const renderStudentCalendar = () => {
  const tasks = StudentApp.getTasksByStudent(student.id)
    .filter((task) => new Date(task.fechaEntrega) >= new Date())
    .sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega))
    .slice(0, 6);

  fillList(
    studentCalendarList,
    tasks,
    "student-calendar-template",
    (node, task) => {
      const { classroom, professor } = getTaskMeta(task);
      setText(node, "[data-title]", task.title);
      setText(node, "[data-grade]", classroom?.grade || "Sin grado");
      setText(node, "[data-professor]", professor?.name || "Sin profesor");
      setText(node, "[data-date]", formatDate(task.fechaEntrega));
    },
  );
  studentCalendarList?.appendChild(
    tasks.length
      ? document.createDocumentFragment()
      : cloneTemplate("student-calendar-empty-template"),
  );
};

const renderTaskForum = (taskId) => {
  if (!taskId || !taskInfoForumMessages) return;

  const task = StudentApp.getTaskById(taskId);
  if (!task) return;

  const forum = StudentApp.ensureForumForTask(task);
  activeForumId = forum.id;
  const messages = StudentApp.getForumMessagesByForumId(forum.id);

  fillList(
    taskInfoForumMessages,
    messages,
    "student-forum-message-template",
    (node, message) => {
      const author = StudentApp.getUsers().find(
        (user) => user.id === message.userId,
      );
      setText(node, "[data-author]", author?.name || "Usuario");
      setText(node, "[data-message]", message.message);
    },
  );
  taskInfoForumMessages.appendChild(
    messages.length
      ? document.createDocumentFragment()
      : cloneTemplate("student-forum-empty-template"),
  );
};

const openTaskInfoModal = (taskId) => {
  const task = StudentApp.getTaskById(taskId);
  if (!task || !taskInfoModal) return;

  const { classroom, professor } = getTaskMeta(task);
  currentTaskInfoId = task.id;

  if (taskInfoTitle) taskInfoTitle.textContent = task.title || "Tarea";
  if (taskInfoGrade)
    taskInfoGrade.textContent = classroom?.grade || "Sin grado";
  if (taskInfoProfessor)
    taskInfoProfessor.textContent = professor?.name || "Sin profesor";
  if (taskInfoDeadline)
    taskInfoDeadline.textContent = formatDate(task.fechaEntrega);
  if (taskInfoMethod)
    taskInfoMethod.textContent =
      task.assessmentMethods || "Sin metodo definido";
  if (taskInfoDescription)
    taskInfoDescription.textContent =
      task.descripcion || "Sin descripcion disponible.";
  if (taskInfoStatus) taskInfoStatus.textContent = "Por hacer";
  renderTaskForum(task.id);
  openModal(taskInfoModal);
};

const closeTaskInfoModal = () => {
  currentTaskInfoId = null;
  closeModal(taskInfoModal);
};

const setTopProfile = () => {
  const data = StudentApp.getStudentDashboardData(student.id);
  const graded = data.submissions.filter(
    (item) => typeof item.note === "number",
  );
  const average = graded.length
    ? (
        graded.reduce((total, item) => total + Number(item.note || 0), 0) /
        graded.length
      ).toFixed(1)
    : "--";
  const nextTask = [...data.pendingTasks].sort(
    (a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega),
  )[0];

  document.getElementById("student-name").textContent = student.name;
  document.getElementById("student-email").textContent = student.email;
  document.getElementById("student-pending-count").textContent = String(
    data.pendingTasks.length,
  );
  document.getElementById("student-submitted-count").textContent = String(
    data.submissions.length,
  );
  document.getElementById("student-total-task-count").textContent = String(
    data.tasks.length,
  );
  document.getElementById("student-total-submitted-count").textContent = String(
    data.submissions.length,
  );
  document.getElementById("student-total-graded-count").textContent = String(
    graded.length,
  );
  document.getElementById("student-average-grade").textContent = average;
  document.getElementById("student-next-deadline").textContent = nextTask
    ? `${nextTask.title} - ${formatDate(nextTask.fechaEntrega)}`
    : "Sin fechas registradas";
  document.getElementById("student-upcoming-task").textContent = nextTask
    ? nextTask.title
    : "Sin tareas asignadas";
  document.getElementById("student-status-label").textContent = data
    .pendingTasks.length
    ? `${data.pendingTasks.length} tareas pendientes`
    : "Sin tareas pendientes";

  const deliveredPercent = data.tasks.length
    ? Math.round((data.submissions.length / data.tasks.length) * 100)
    : 0;
  const gradedPercent = data.tasks.length
    ? Math.round((graded.length / data.tasks.length) * 100)
    : 0;
  const defensePercent = data.submissions.length
    ? Math.round(
        (data.submissions.filter((item) => item.answer?.answer).length /
          data.submissions.length) *
          100,
      )
    : 0;

  document.getElementById("student-delivered-percent").textContent =
    `${deliveredPercent}%`;
  document.getElementById("student-graded-percent").textContent =
    `${gradedPercent}%`;
  document.getElementById("student-defense-percent").textContent =
    `${defensePercent}%`;
  document.getElementById("student-delivered-bar").value = deliveredPercent;
  document.getElementById("student-graded-bar").value = gradedPercent;
  document.getElementById("student-defense-bar").value = defensePercent;
};

const renderPendingTasks = () => {
  const { pendingTasks } = StudentApp.getStudentDashboardData(student.id);

  fillList(
    pendingList,
    pendingTasks,
    "student-pending-task-template",
    (node, task) => {
      const { classroom, professor } = getTaskMeta(task);
      setText(node, "[data-grade]", classroom?.grade || "Sin grado");
      setText(node, "[data-title]", task.title);
      setText(node, "[data-professor]", professor?.name || "Sin profesor");
      setText(node, "[data-deadline]", formatDate(task.fechaEntrega));
      node.querySelector("[data-task-info]").dataset.taskInfo = task.id;
      node.querySelector("[data-task-start]").dataset.taskStart = task.id;
    },
  );

  pendingEmpty.classList.toggle("hidden", pendingTasks.length > 0);

  pendingList.querySelectorAll("[data-task-info]").forEach((button) => {
    button.addEventListener("click", () =>
      openTaskInfoModal(button.dataset.taskInfo),
    );
  });

  pendingList.querySelectorAll("[data-task-start]").forEach((button) => {
    button.addEventListener("click", () => {
      const task = StudentApp.getTaskById(button.dataset.taskStart);
      if (!task) return;
      activeTaskId = task.id;
      document.getElementById("student-active-task-title").textContent =
        task.title;
      submissionPanel.classList.remove("hidden");
      submissionPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
};

const renderSubmittedTasks = () => {
  const tasks = StudentApp.getTasksByStudent(student.id);
  const submissions = StudentApp.getSubmissionsByStudent(student.id);

  fillList(
    submittedList,
    submissions,
    "student-submitted-task-template",
    (node, submission) => {
      const task = tasks.find((item) => item.id === submission.taskId);
      const note = submission.note;
      const graded = typeof note === "number";
      const approved = graded && note >= 3;
      const status = approved
        ? `Aprobo - ${note}`
        : graded
          ? `Desaprobaste - ${note}`
          : "Esperando revision";

      node.dataset.status = approved
        ? "approved"
        : graded
          ? "failed"
          : "pending";
      setText(node, "[data-status]", status);
      setText(node, "[data-title]", task?.title || "Tarea");
      setText(
        node,
        "[data-delivery]",
        `Entrega: ${submission.state} - ${formatDate(submission.fechaEntrega)}`,
      );
      setText(
        node,
        "[data-comments]",
        submission.teacherComments || "Aun no hay comentario docente.",
      );
      setText(
        node,
        "[data-files]",
        StudentApp.describeSubmissionFiles(submission),
      );
    },
  );

  submittedEmpty.classList.toggle("hidden", submissions.length > 0);
};

const renderGrades = () => {
  const tasks = StudentApp.getTasksByStudent(student.id);
  const graded = StudentApp.getSubmissionsByStudent(student.id).filter(
    (item) => typeof item.note === "number",
  );

  fillList(gradeList, graded, "student-grade-template", (node, submission) => {
    const task = tasks.find((item) => item.id === submission.taskId);
    setText(node, "[data-title]", task?.title || "Tarea");
    setText(
      node,
      "[data-date]",
      formatDate(submission.updatedAt || submission.fechaEntrega),
    );
    setText(node, "[data-note]", submission.note);
    setText(
      node,
      "[data-comments]",
      submission.teacherComments || "Sin comentario adicional.",
    );
  });

  gradeEmpty.classList.toggle("hidden", graded.length > 0);
};

const renderDefense = () => {
  const submissions = StudentApp.getSubmissionsByStudent(student.id);

  fillList(
    defenseList,
    submissions,
    "student-defense-template",
    (node, submission) => {
      setText(node, "[data-type]", submission.answer?.typeAnswer || "Texto");
      setText(
        node,
        "[data-question]",
        submission.answer?.ask || "Sin pregunta",
      );
      setText(
        node,
        "[data-answer]",
        submission.answer?.answer || "Sin respuesta registrada",
      );
    },
  );

  defenseEmpty.classList.toggle("hidden", submissions.length > 0);
};

submissionForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!activeTaskId) {
    alert("Selecciona una tarea para enviar.");
    return;
  }

  const files = submissionLinkInput?.value.trim() || "";
  const answerType = document.getElementById("student-defense-type").value;
  const answerPrompt = document
    .getElementById("student-defense-prompt")
    .value.trim();
  const answerText = document
    .getElementById("student-defense-answer")
    .value.trim();
  const selectedFiles = [...(submissionFilesInput?.files || [])];

  if (!selectedFiles.length && !files && !answerPrompt && !answerText) {
    alert("Completa los datos de entrega y defensa.");
    return;
  }

  (async () => {
    try {
      const attachments = await Promise.all(
        selectedFiles.map(readFileAsDataUrl),
      );
      StudentApp.submitTask({
        taskId: activeTaskId,
        estudianteId: student.id,
        files,
        attachments,
        answerPrompt,
        answerText,
        answerType,
      });
      submissionForm.reset();
      updateSubmissionFilesLabel();
      submissionPanel.classList.add("hidden");
      activeTaskId = null;
      renderAllStudent();
    } catch (error) {
      alert(error.message);
    }
  })();
});

submissionFilesTrigger?.addEventListener("click", () =>
  submissionFilesInput?.click(),
);
submissionFilesInput?.addEventListener("change", updateSubmissionFilesLabel);

document
  .getElementById("student-cancel-submission")
  ?.addEventListener("click", () => {
    activeTaskId = null;
    submissionPanel.classList.add("hidden");
    submissionForm.reset();
    updateSubmissionFilesLabel();
  });

taskInfoModal?.querySelectorAll("[data-modal-close]").forEach((button) => {
  button.addEventListener("click", closeTaskInfoModal);
});

taskInfoModal?.addEventListener("click", (event) => {
  if (event.target === taskInfoModal) closeTaskInfoModal();
});

taskInfoStartButton?.addEventListener("click", () => {
  if (!currentTaskInfoId) return;
  const task = StudentApp.getTaskById(currentTaskInfoId);
  if (!task) return;
  activeTaskId = task.id;
  document.getElementById("student-active-task-title").textContent = task.title;
  submissionPanel.classList.remove("hidden");
  submissionPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  closeTaskInfoModal();
});

taskInfoForumSend?.addEventListener("click", () => {
  const message = taskInfoForumInput?.value.trim();
  if (!message || !activeForumId) return;

  try {
    StudentApp.createForumMessage({
      forumId: activeForumId,
      userId: student.id,
      message,
    });
    taskInfoForumInput.value = "";
    renderTaskForum(currentTaskInfoId);
  } catch (error) {
    alert(error.message);
  }
});

studentThemeToggle?.addEventListener("click", () => {
  StudentApp.toggleTheme();
  renderAllStudent();
});

document.getElementById("close-session")?.addEventListener("click", () => {
  const finishLogout = () => {
    StudentApp.clearSession();
    window.location.href = "./index.html";
  };

  if (StudentApp.runSessionTransition) {
    StudentApp.runSessionTransition({
      title: "Cerrando sesion",
      detail: "Guardando tu salida y volviendo al login.",
      tone: "logout",
      onComplete: finishLogout,
    });
    return;
  }

  finishLogout();
});

const chatbotSend = document.getElementById("student-chatbot-send");
let chatbotHistory = [];

const addChatMessage = (text, role) => {
  const node = cloneTemplate(
    role === "user"
      ? "student-chat-user-template"
      : "student-chat-assistant-template",
  );
  setText(node, "[data-message]", text);
  chatbotMessages.appendChild(node);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
};

const resetChat = () => {
  if (!chatbotMessages) return;
  chatbotMessages.replaceChildren(
    cloneTemplate("student-chat-initial-template"),
  );
  chatbotHistory = [];
};

const setChatbotLoading = (isLoading) => {
  if (chatbotSend) chatbotSend.disabled = isLoading;
  if (chatbotInput) chatbotInput.disabled = isLoading;
  if (chatbotStatus) {
    chatbotStatus.textContent = isLoading
      ? "Generando orientacion..."
      : "Listo para explicar";
  }
};

const buildLocalTutorReply = (message) => {
  const lower = String(message || "").toLowerCase();

  if (lower.includes("respuesta") || lower.includes("hazme") || lower.includes("resuelv")) {
    return "No te voy a dar la respuesta final, pero si te ayudo a sacarla. Dime que te pide el ejercicio y cual crees que seria el primer paso.";
  }

  if (lower.includes("introduccion") || lower.includes("inicio")) {
    return "Empieza presentando el tema, el objetivo de la tarea y la idea principal que quieres defender. Escribe una primera frase y te digo como mejorarla.";
  }

  if (lower.includes("conclusion")) {
    return "Para la conclusion, resume la idea principal, recupera la evidencia mas importante y cierra diciendo que aprendiste o que demostraste. Escribe una version corta y la revisamos.";
  }

  if (lower.includes("metodo") || lower.includes("procedimiento")) {
    return "Describe el procedimiento paso a paso: que hiciste primero, por que elegiste ese camino y como comprobarias si el resultado tiene sentido. Dime tu paso 1 y revisamos.";
  }

  return "No voy a resolverte la tarea completa. Vamos paso a paso: dime que te piden, que informacion tienes y cual crees que es el primer paso. Desde ahi te guio hasta que la resuelvas.";
};

const askTutor = async () => {
  const message = chatbotInput.value.trim();
  if (!message) return;

  addChatMessage(message, "user");
  chatbotHistory.push({ role: "user", content: message });
  chatbotInput.value = "";
  setChatbotLoading(true);

  try {
    const response = await fetch("/api/ai/tutor-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        messages: chatbotHistory.slice(-8),
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "La IA no pudo responder.");
    }

    const reply = result.reply || "No se pudo obtener una respuesta.";
    addChatMessage(reply, "assistant");
    chatbotHistory.push({ role: "assistant", content: reply });
    chatbotHistory = chatbotHistory.slice(-8);
    chatbotStatus.textContent = "Orientacion generada";
  } catch (error) {
    const fallbackReply = buildLocalTutorReply(message);
    addChatMessage(fallbackReply, "assistant");
    chatbotHistory.push({ role: "assistant", content: fallbackReply });
    chatbotHistory = chatbotHistory.slice(-8);
    chatbotStatus.textContent = "Orientacion generada en modo local";
  } finally {
    setChatbotLoading(false);
  }
};

chatbotSend?.addEventListener("click", askTutor);

chatbotInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    askTutor();
  }
});

document.getElementById("student-chatbot-reset")?.addEventListener("click", () => {
  chatbotMessages.innerHTML = `
    <div class="flex justify-start">
      <div class="max-w-xl rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-200">
        Hola. No te dare la respuesta final, pero si te guiare paso a paso hasta que la resuelvas por tu cuenta.
      </div>
    </div>
  `;
  chatbotHistory = [];
  chatbotStatus.textContent = "Listo para explicar";
});

const renderAllStudent = () => {
  setTopProfile();
  renderPendingTasks();
  renderSubmittedTasks();
  renderGrades();
  renderDefense();
  renderStudentNotifications();
  renderStudentHistory();
  renderStudentCalendar();
  if (studentThemeToggle) {
    studentThemeToggle.textContent =
      StudentApp.getTheme() === "light"
        ? "Cambiar a oscuro"
        : "Cambiar a claro";
  }
};

renderAllStudent();
updateSubmissionFilesLabel();
