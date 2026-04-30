(() => {
  const KEYS = {
    session: "cm_session",
    users: "cm_frontend_users",
    authUsers: "cm_frontend_auth_users",
    classrooms: "cm_frontend_classrooms",
    tasks: "cm_frontend_tasks",
    submissions: "cm_frontend_submissions",
    forums: "cm_frontend_forums",
    forumMessages: "cm_frontend_forum_messages",
    notifications: "cm_frontend_notifications",
    history: "cm_frontend_history",
    theme: "cm_frontend_theme",
  };

  const parse = (value, fallback) => {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  };

  const read = (key, fallback) => parse(localStorage.getItem(key), fallback);
  const write = (key, value) =>
    localStorage.setItem(key, JSON.stringify(value));

  const ensureArray = (key) => {
    const current = read(key, []);
    if (!Array.isArray(current)) {
      write(key, []);
      return [];
    }
    return current;
  };

  const nowIso = () => new Date().toISOString();
  const createId = (prefix) =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const clampList = (items, limit = 200) => items.slice(0, limit);

  const getHistory = () => ensureArray(KEYS.history);
  const saveHistory = (history) => write(KEYS.history, history);
  const pushHistory = ({ type = "info", title, detail = "", userId = "", role = "" }) => {
    const history = [
      {
        id: createId("history"),
        type,
        title,
        detail,
        userId,
        role,
        createdAt: nowIso(),
      },
      ...getHistory(),
    ];
    saveHistory(clampList(history));
    return history[0];
  };

  const getHistoryForUser = (userId, role) =>
    getHistory().filter((entry) => {
      if (role === "Admin") return true;
      if (!entry.userId && !entry.role) return true;
      return entry.userId === userId || entry.role === role;
    });

  const getNotifications = () => ensureArray(KEYS.notifications);
  const saveNotifications = (notifications) => write(KEYS.notifications, notifications);
  const pushNotification = ({
    title,
    detail = "",
    type = "info",
    audience = "all",
    targetUserIds = [],
    targetRoles = [],
  }) => {
    const notifications = [
      {
        id: createId("notification"),
        title,
        detail,
        type,
        audience,
        targetUserIds,
        targetRoles,
        readBy: [],
        createdAt: nowIso(),
      },
      ...getNotifications(),
    ];
    saveNotifications(clampList(notifications, 100));
    return notifications[0];
  };

  const getNotificationsForUser = (userId, role) =>
    getNotifications().filter((notification) => {
      if (notification.audience === "all") return true;
      if (notification.audience === "roles") {
        return Array.isArray(notification.targetRoles)
          ? notification.targetRoles.includes(role)
          : false;
      }
      if (notification.audience === "users") {
        return Array.isArray(notification.targetUserIds)
          ? notification.targetUserIds.includes(userId)
          : false;
      }
      return false;
    });

  const getUnreadNotificationsForUser = (userId, role) =>
    getNotificationsForUser(userId, role).filter(
      (notification) => !Array.isArray(notification.readBy) || !notification.readBy.includes(userId),
    );

  const markNotificationAsRead = (notificationId, userId) => {
    const notifications = getNotifications().map((notification) => {
      if (notification.id !== notificationId) return notification;
      const readBy = new Set(notification.readBy || []);
      readBy.add(userId);
      return { ...notification, readBy: [...readBy] };
    });
    saveNotifications(notifications);
  };

  const markAllNotificationsAsRead = (userId, role) => {
    const notifications = getNotifications().map((notification) => {
      const targetNotifications = getNotificationsForUser(userId, role);
      if (!targetNotifications.some((item) => item.id === notification.id)) {
        return notification;
      }

      const readBy = new Set(notification.readBy || []);
      readBy.add(userId);
      return { ...notification, readBy: [...readBy] };
    });
    saveNotifications(notifications);
  };

  const clearNotifications = () => saveNotifications([]);

  const getForums = () => ensureArray(KEYS.forums);
  const saveForums = (forums) => write(KEYS.forums, forums);
  const getForumMessages = () => ensureArray(KEYS.forumMessages);
  const saveForumMessages = (messages) => write(KEYS.forumMessages, messages);

  const ensureForumForTask = (task) => {
    const forums = getForums();
    const existing = forums.find((forum) => forum.taskId === task.id);
    if (existing) return existing;

    const forum = {
      id: createId("forum"),
      taskId: task.id,
      title: `Foro: ${task.title}`,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    forums.unshift(forum);
    saveForums(forums);
    return forum;
  };

  const getForumByTaskId = (taskId) =>
    getForums().find((forum) => forum.taskId === taskId) ?? null;

  const getForumMessagesByForumId = (forumId) =>
    getForumMessages()
      .filter((message) => message.forumId === forumId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const createForumMessage = ({ forumId, userId, message, replyTo = null }) => {
    const cleanMessage = String(message ?? "").trim();
    if (!forumId || !userId || !cleanMessage) {
      throw new Error("Foro, usuario y mensaje son obligatorios.");
    }

    const forum = getForums().find((item) => item.id === forumId);
    if (!forum) {
      throw new Error("El foro no existe.");
    }

    const forumMessage = {
      id: createId("forum_message"),
      forumId,
      userId,
      message: cleanMessage,
      replyTo,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    const messages = getForumMessages();
    messages.unshift(forumMessage);
    saveForumMessages(messages);
    pushHistory({
      type: "forum",
      title: "Nuevo mensaje en foro",
      detail: cleanMessage.slice(0, 120),
      userId,
    });
    return forumMessage;
  };

  const getTheme = () => localStorage.getItem(KEYS.theme) || "dark";
  const setTheme = (theme) => {
    const normalized = theme === "light" ? "light" : "dark";
    localStorage.setItem(KEYS.theme, normalized);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = normalized;
      document.body.dataset.theme = normalized;
      document.documentElement.style.colorScheme = normalized;
    }
    return normalized;
  };

  const toggleTheme = () => setTheme(getTheme() === "dark" ? "light" : "dark");

  const applyTheme = () => setTheme(getTheme());

  const normalizeRole = (value) => {
    const normalizedValue = String(value ?? "")
      .trim()
      .toLowerCase();

    if (normalizedValue === "admin" || normalizedValue === "administrador") {
      return "Admin";
    }

    if (normalizedValue === "profesor") {
      return "Profesor";
    }

    if (normalizedValue === "estudiante") {
      return "Estudiante";
    }

    return "Estudiante";
  };

  const normalizeUser = (user) => ({
    id: String(user.id ?? user._id ?? ""),
    name: user.name ?? "Sin nombre",
    email: user.email ?? "",
    rol: normalizeRole(user.rol),
    estado: user.estado ?? true,
    lastSeenAt: nowIso(),
  });

  const normalizeSubmissionAttachments = (attachments = []) =>
    (Array.isArray(attachments) ? attachments : [])
      .map((attachment) => ({
        name: String(attachment?.name ?? attachment?.fileName ?? "Archivo"),
        type: String(attachment?.type ?? attachment?.mimeType ?? "application/octet-stream"),
        size: Number(attachment?.size ?? 0),
        dataUrl: attachment?.dataUrl ?? "",
      }))
      .filter((attachment) => attachment.name && attachment.dataUrl);

  const describeSubmissionFiles = (submission) => {
    if (submission?.attachments?.length) {
      return submission.attachments
        .map((attachment) => attachment.name)
        .join(", ");
    }

    return String(submission?.files ?? "").trim() || "Sin archivo";
  };

  const getUsers = () => {
    const users = ensureArray(KEYS.users);
    const normalizedUsers = users.map((user) => normalizeUser(user));
    const hasChanges = normalizedUsers.some(
      (user, index) =>
        user.rol !== users[index]?.rol ||
        user.email !== users[index]?.email ||
        user.id !== String(users[index]?.id ?? users[index]?._id ?? ""),
    );

    if (hasChanges) {
      saveUsers(normalizedUsers);
    }

    return normalizedUsers;
  };
  const saveUsers = (users) => write(KEYS.users, users);

  const getAuthUsers = () => {
    const users = ensureArray(KEYS.authUsers);
    const normalizedUsers = users.map((user) => ({
      ...user,
      id: String(user.id ?? user._id ?? ""),
      email: String(user.email ?? "").trim().toLowerCase(),
      rol: normalizeRole(user.rol),
      estado: user.estado ?? true,
    }));
    const hasChanges = normalizedUsers.some(
      (user, index) =>
        user.rol !== users[index]?.rol ||
        user.email !== users[index]?.email ||
        user.id !== String(users[index]?.id ?? users[index]?._id ?? ""),
    );

    if (hasChanges) {
      saveAuthUsers(normalizedUsers);
    }

    return normalizedUsers;
  };
  const saveAuthUsers = (users) => write(KEYS.authUsers, users);

  const replaceKnownUsers = (users = []) => {
    const incomingUsers = (Array.isArray(users) ? users : [])
      .map((user) => normalizeUser(user))
      .filter((user) => user.id || user.email);

    const dedupedUsers = [];
    incomingUsers.forEach((user) => {
      const email = String(user.email ?? "").trim().toLowerCase();
      const existingIndex = dedupedUsers.findIndex(
        (item) =>
          item.id === user.id ||
          (email && String(item.email ?? "").trim().toLowerCase() === email),
      );

      if (existingIndex >= 0) {
        dedupedUsers[existingIndex] = {
          ...dedupedUsers[existingIndex],
          ...user,
        };
      } else {
        dedupedUsers.push(user);
      }
    });

    saveUsers(dedupedUsers);

    const authUsers = getAuthUsers();
    const syncedAuthUsers = authUsers.map((authUser) => {
      const authEmail = String(authUser.email ?? "").trim().toLowerCase();
      const match = dedupedUsers.find(
        (user) =>
          user.id === authUser.id ||
          (authEmail && String(user.email ?? "").trim().toLowerCase() === authEmail),
      );

      return match
        ? {
            ...authUser,
            id: match.id || authUser.id,
            name: match.name,
            email: match.email,
            rol: match.rol,
            estado: match.estado,
          }
        : authUser;
    });
    saveAuthUsers(syncedAuthUsers);

    const session = getSession();
    if (session?.user) {
      const sessionEmail = String(session.user.email ?? "").trim().toLowerCase();
      const refreshedSessionUser = dedupedUsers.find(
        (user) =>
          user.id === session.user.id ||
          (sessionEmail && String(user.email ?? "").trim().toLowerCase() === sessionEmail),
      );

      if (refreshedSessionUser) {
        write(KEYS.session, {
          ...session,
          user: {
            ...session.user,
            ...refreshedSessionUser,
          },
        });
      }
    }

    return dedupedUsers;
  };

  const removeStoredUser = (userId) => {
    if (!userId) return;

    saveUsers(getUsers().filter((user) => user.id !== userId));
    saveAuthUsers(getAuthUsers().filter((user) => user.id !== userId));

    const classrooms = getClassrooms().map((classroom) => ({
      ...classroom,
      profesorId: classroom.profesorId === userId ? "" : classroom.profesorId,
      estudiantes: (classroom.estudiantes || []).filter((studentId) => studentId !== userId),
    }));
    saveClassrooms(classrooms);

    const tasks = getTasks().map((task) => ({
      ...task,
      profesorId: task.profesorId === userId ? "" : task.profesorId,
    }));
    saveTasks(tasks);

    const submissions = getSubmissions().filter((submission) => submission.estudianteId !== userId);
    saveSubmissions(submissions);
  };

  const syncStoredUser = (user) => {
    const publicUser = registerKnownUser(user);
    const existingAuthUser = getAuthUsers().find(
      (item) =>
        item.id === publicUser.id ||
        String(item.email ?? "").trim().toLowerCase() ===
          String(publicUser.email ?? "").trim().toLowerCase(),
    );

    if (existingAuthUser) {
      upsertAuthUser({
        ...existingAuthUser,
        ...publicUser,
        password: existingAuthUser.password,
      });
    }

    return publicUser;
  };

  const replaceUserReferences = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;

    const classrooms = getClassrooms().map((classroom) => ({
      ...classroom,
      profesorId: classroom.profesorId === fromId ? toId : classroom.profesorId,
      estudiantes: (classroom.estudiantes || []).map((studentId) =>
        studentId === fromId ? toId : studentId,
      ),
    }));
    saveClassrooms(classrooms);

    const tasks = getTasks().map((task) => ({
      ...task,
      profesorId: task.profesorId === fromId ? toId : task.profesorId,
    }));
    saveTasks(tasks);

    const submissions = getSubmissions().map((submission) => ({
      ...submission,
      estudianteId:
        submission.estudianteId === fromId ? toId : submission.estudianteId,
    }));
    saveSubmissions(submissions);
  };

  const registerKnownUser = (user) => {
    const normalized = normalizeUser(user);
    const normalizedEmail = String(normalized.email ?? "").trim().toLowerCase();
    const users = getUsers();
    const existingByEmail = normalizedEmail
      ? users.find((item) => String(item.email ?? "").trim().toLowerCase() === normalizedEmail)
      : null;
    const canonicalId = existingByEmail?.id || normalized.id;
    const mergedUser = {
      ...(existingByEmail || {}),
      ...normalized,
      id: canonicalId,
      email: normalizedEmail || normalized.email,
      lastSeenAt: nowIso(),
    };

    if (!mergedUser.id) return mergedUser;

    if (normalized.id && canonicalId !== normalized.id) {
      replaceUserReferences(normalized.id, canonicalId);
    }

    const dedupedUsers = users.filter(
      (item) =>
        item.id !== normalized.id &&
        item.id !== canonicalId &&
        String(item.email ?? "").trim().toLowerCase() !== normalizedEmail,
    );
    dedupedUsers.push(mergedUser);
    saveUsers(dedupedUsers);
    return mergedUser;
  };

  const upsertAuthUser = (user) => {
    const normalized = {
      id: String(user.id ?? user._id ?? createId("auth")),
      name: user.name ?? "Sin nombre",
      email: String(user.email ?? "").trim().toLowerCase(),
      password: String(user.password ?? ""),
      rol: normalizeRole(user.rol),
      estado: user.estado ?? true,
      lastSeenAt: nowIso(),
    };

    if (!normalized.email) return normalized;

    const users = getAuthUsers();
    const existing = users.find((item) => item.email === normalized.email);
    const canonicalId = existing?.id || normalized.id;
    const mergedUser = {
      ...(existing || {}),
      ...normalized,
      id: canonicalId,
      lastSeenAt: nowIso(),
    };

    if (normalized.id && canonicalId !== normalized.id) {
      replaceUserReferences(normalized.id, canonicalId);
    }

    const dedupedUsers = users.filter(
      (item) => item.id !== normalized.id && item.email !== normalized.email,
    );
    dedupedUsers.push(mergedUser);
    saveAuthUsers(dedupedUsers);
    return mergedUser;
  };

  const createLocalAccount = ({ name, email, password, rol = "Estudiante", estado = true }) => {
    const authUser = upsertAuthUser({ name, email, password, rol, estado });
    const publicUser = registerKnownUser(authUser);
    pushHistory({
      type: "user",
      title: "Cuenta creada",
      detail: `${publicUser.name} (${publicUser.rol})`,
      userId: publicUser.id,
      role: publicUser.rol,
    });
    pushNotification({
      title: "Cuenta creada",
      detail: "Tu cuenta ya puede iniciar sesion.",
      audience: "users",
      targetUserIds: [publicUser.id],
    });
    return { authUser, publicUser };
  };

  const authenticateLocalUser = (email, password) => {
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const normalizedPassword = String(password ?? "");
    const user = getAuthUsers().find(
      (item) =>
        item.email === normalizedEmail &&
        item.password === normalizedPassword &&
        item.estado !== false,
    );

    if (!user) return null;

    const session = {
      token: createId("local_token"),
      user: registerKnownUser(user),
    };

    write(KEYS.session, session);
    upsertAuthUser(user);
    pushHistory({
      type: "auth",
      title: "Inicio de sesion",
      detail: `${session.user.name} ingreso al sistema`,
      userId: session.user.id,
      role: session.user.rol,
    });
    return session;
  };

  const getSession = () => {
    const session = read(KEYS.session, null);
    if (!session?.user) return session;

    const normalizedUser = normalizeUser(session.user);
    if (normalizedUser.rol === session.user.rol) {
      return session;
    }

    const nextSession = {
      ...session,
      user: {
        ...session.user,
        ...normalizedUser,
      },
    };
    write(KEYS.session, nextSession);
    return nextSession;
  };

  const setSession = (authData) => {
    const authUser = upsertAuthUser(authData.user);
    const session = {
      token: authData.token,
      user: registerKnownUser(authUser),
    };
    write(KEYS.session, session);
    return session;
  };

  const clearSession = () => localStorage.removeItem(KEYS.session);

  const getCurrentUser = () => getSession()?.user ?? null;

  const syncStoredSession = () => {
    const session = getSession();
    if (!session?.user) return null;

    const syncedUser = registerKnownUser(upsertAuthUser(session.user));
    const nextSession = {
      ...session,
      user: syncedUser,
    };
    write(KEYS.session, nextSession);
    return nextSession;
  };

  const getClassrooms = () => ensureArray(KEYS.classrooms);
  const saveClassrooms = (classrooms) => write(KEYS.classrooms, classrooms);

  const createClassroom = ({ grade, profesorId, estudiantes = [] }) => {
    const classrooms = getClassrooms();
    const cleanGrade = grade.trim();
    const existing = classrooms.find(
      (item) => item.grade.toLowerCase() === cleanGrade.toLowerCase(),
    );

    if (existing) {
      existing.profesorId = profesorId;
      existing.estudiantes = [...new Set(estudiantes)];
      existing.updatedAt = nowIso();
      saveClassrooms(classrooms);
      pushHistory({
        type: "classroom",
        title: "Grado actualizado",
        detail: cleanGrade,
        userId: profesorId,
      });
      return existing;
    }

    const classroom = {
      id: createId("classroom"),
      grade: cleanGrade,
      profesorId,
      estudiantes: [...new Set(estudiantes)],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    classrooms.push(classroom);
    saveClassrooms(classrooms);
    pushHistory({
      type: "classroom",
      title: "Grado creado",
      detail: cleanGrade,
      userId: profesorId,
    });
    pushNotification({
      title: `Grado ${cleanGrade} creado`,
      detail: "Se asigno un nuevo curso a un profesor.",
      audience: "roles",
      targetRoles: ["Admin", "Profesor"],
    });
    return classroom;
  };

  const assignStudentsToClassroom = (classroomId, studentIds) => {
    const classrooms = getClassrooms();
    const classroom = classrooms.find((item) => item.id === classroomId);

    if (!classroom) return null;

    const previousStudents = new Set(classroom.estudiantes || []);
    const nextStudents = [...new Set(studentIds)];
    const addedStudents = nextStudents.filter((studentId) => !previousStudents.has(studentId));
    const removedStudents = [...previousStudents].filter(
      (studentId) => !nextStudents.includes(studentId),
    );

    classroom.estudiantes = nextStudents;
    classroom.updatedAt = nowIso();
    saveClassrooms(classrooms);

    pushHistory({
      type: "classroom",
      title: "Estudiantes actualizados",
      detail: `${classroom.grade}: +${addedStudents.length} / -${removedStudents.length}`,
      userId: classroom.profesorId,
    });

    if (addedStudents.length) {
      pushNotification({
        title: `Te agregaron a ${classroom.grade}`,
        detail: "Tu administrador te incluyo en un grado.",
        audience: "users",
        targetUserIds: addedStudents,
      });
    }

    if (removedStudents.length) {
      pushNotification({
        title: `Saliste de ${classroom.grade}`,
        detail: "Tu acceso a ese grado fue retirado.",
        audience: "users",
        targetUserIds: removedStudents,
      });
    }

    return classroom;
  };

  const getClassroomsByProfessor = (profesorId) =>
    getClassrooms().filter((item) => item.profesorId === profesorId);

  const getClassroomsByStudent = (studentId) =>
    getClassrooms().filter((item) => item.estudiantes.includes(studentId));

  const getTasks = () => ensureArray(KEYS.tasks);
  const saveTasks = (tasks) => write(KEYS.tasks, tasks);

  const createTask = ({
    title,
    descripcion,
    fechaEntrega,
    assessmentMethods,
    classroomId,
    profesorId,
  }) => {
    const tasks = getTasks();
    const task = {
      id: createId("task"),
      title: title.trim(),
      descripcion: descripcion.trim(),
      fechaEntrega,
      assessmentMethods: assessmentMethods.trim(),
      classroomId,
      profesorId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    tasks.unshift(task);
    saveTasks(tasks);
    ensureForumForTask(task);
    const classroom = getClassrooms().find((item) => item.id === classroomId);
    const teacher = getUsers().find((item) => item.id === profesorId);
    pushHistory({
      type: "task",
      title: "Tarea creada",
      detail: `${task.title} en ${classroom?.grade || "sin grado"}`,
      userId: profesorId,
      role: teacher?.rol || "Profesor",
    });
    pushNotification({
      title: `Nueva tarea: ${task.title}`,
      detail: classroom?.grade ? `Revisa la actividad de ${classroom.grade}.` : "Tienes una nueva tarea asignada.",
      audience: "users",
      targetUserIds: classroom?.estudiantes || [],
    });
    return task;
  };

  const deleteTask = (taskId) => {
    const task = getTaskById(taskId);
    saveTasks(getTasks().filter((taskItem) => taskItem.id !== taskId));
    saveSubmissions(getSubmissions().filter((item) => item.taskId !== taskId));
    if (task) {
      pushHistory({
        type: "task",
        title: "Tarea eliminada",
        detail: task.title,
        userId: task.profesorId,
      });
    }
  };

  const getTasksByProfessor = (profesorId) =>
    getTasks().filter((task) => task.profesorId === profesorId);

  const getTasksByStudent = (studentId) => {
    const classroomIds = getClassroomsByStudent(studentId).map((item) => item.id);
    return getTasks().filter((task) => classroomIds.includes(task.classroomId));
  };

  const getTaskById = (taskId) =>
    getTasks().find((task) => task.id === taskId) ?? null;

  const getSubmissions = () => ensureArray(KEYS.submissions);
  const saveSubmissions = (submissions) => write(KEYS.submissions, submissions);

  const buildIaAnalysis = (answerText = "", fileText = "") => {
    const source = `${answerText} ${fileText}`.trim();
    const length = source.length;
    const polishedSignals = [
      "en conclusion",
      "por consiguiente",
      "es importante destacar",
      "en sintesis",
      "cabe resaltar",
      "desde una perspectiva",
    ].filter((signal) => source.toLowerCase().includes(signal)).length;
    const possibleIa = length > 450 || (length > 260 && polishedSignals >= 2);
    const percentageIa = possibleIa
      ? Math.min(96, 30 + Math.floor(length / 18) + polishedSignals * 8)
      : 0;
    const feedback = possibleIa
      ? "La respuesta parece muy estructurada. Conviene validar comprension con preguntas de defensa."
      : "No hay señales fuertes de uso indebido de IA. Porcentaje estimado: 0%.";

    return {
      possibleIa,
      percentageIa,
      feedback,
    };
  };

  const submitTask = ({
    taskId,
    estudianteId,
    files,
    attachments = [],
    answerPrompt,
    answerText,
    answerType,
  }) => {
    const submissions = getSubmissions();
    const existing = submissions.find(
      (item) => item.taskId === taskId && item.estudianteId === estudianteId,
    );

    if (existing) {
      throw new Error("Ya enviaste esta tarea.");
    }

    const taskRecord = getTaskById(taskId);
    if (!taskRecord) {
      throw new Error("La tarea no existe.");
    }

    const deliveredAt = nowIso();
    const state =
      new Date(deliveredAt) > new Date(taskRecord.fechaEntrega) ? "Tarde" : "Entregado";

    const submission = {
      id: createId("submission"),
      estudianteId,
      taskId,
      files: String(files ?? "").trim(),
      attachments: normalizeSubmissionAttachments(attachments),
      fechaEntrega: deliveredAt,
      state,
      answer: {
        ask: String(answerPrompt ?? "").trim(),
        answer: String(answerText ?? "").trim(),
        typeAnswer: answerType,
      },
      analysisIa: buildIaAnalysis(String(answerText ?? ""), String(files ?? "")),
      note: null,
      teacherComments: "",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    submissions.unshift(submission);
    saveSubmissions(submissions);
    const classroom = taskRecord
      ? getClassrooms().find((item) => item.id === taskRecord.classroomId)
      : null;
    pushHistory({
      type: "submission",
      title: "Tarea enviada",
      detail: taskRecord?.title || "Entrega registrada",
      userId: estudianteId,
    });
    pushNotification({
      title: `Nueva entrega: ${taskRecord?.title || "Tarea"}`,
      detail: "Hay una nueva tarea lista para revisar.",
      audience: "users",
      targetUserIds: classroom?.profesorId ? [classroom.profesorId] : [],
    });
    return submission;
  };

  const gradeSubmission = (submissionId, { note, teacherComments }) => {
    const submissions = getSubmissions();
    const index = submissions.findIndex((item) => item.id === submissionId);

    if (index < 0) {
      throw new Error("La entrega seleccionada no existe.");
    }

    submissions[index] = {
      ...submissions[index],
      note: Number(note),
      teacherComments: teacherComments.trim(),
      updatedAt: nowIso(),
    };

    saveSubmissions(submissions);
    pushHistory({
      type: "grade",
      title: "Tarea calificada",
      detail: `${submissionId} -> ${note}`,
      userId: submissions[index].estudianteId,
    });
    pushNotification({
      title: "Ya tienes una calificacion",
      detail: teacherComments.trim() || "Tu profesor reviso una entrega.",
      audience: "users",
      targetUserIds: [submissions[index].estudianteId],
    });
    return submissions[index];
  };

  const getSubmissionsByStudent = (studentId) =>
    getSubmissions().filter((item) => item.estudianteId === studentId);

  const getSubmissionsByTask = (taskId) =>
    getSubmissions().filter((item) => item.taskId === taskId);

  const getSubmissionsByProfessor = (profesorId) => {
    const taskIds = new Set(getTasksByProfessor(profesorId).map((task) => task.id));
    return getSubmissions().filter((item) => taskIds.has(item.taskId));
  };

  const getTeacherDashboardData = (profesorId) => {
    const classrooms = getClassroomsByProfessor(profesorId);
    const tasks = getTasksByProfessor(profesorId);
    const submissions = getSubmissionsByProfessor(profesorId);
    const graded = submissions.filter((item) => typeof item.note === "number");

    return { classrooms, tasks, submissions, graded };
  };

  const getInstitutionAnalytics = () => {
    const users = getUsers();
    const classrooms = getClassrooms();
    const tasks = getTasks();
    const submissions = getSubmissions();
    const graded = submissions.filter((item) => typeof item.note === "number");
    const upcomingTasks = tasks
      .filter((task) => new Date(task.fechaEntrega) >= new Date())
      .sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega));

    const average =
      graded.length > 0
        ? (
            graded.reduce((total, item) => total + Number(item.note || 0), 0) /
            graded.length
          ).toFixed(1)
        : "0";

    return {
      totalUsers: users.length,
      teachers: users.filter((user) => user.rol === "Profesor").length,
      students: users.filter((user) => user.rol === "Estudiante").length,
      classrooms: classrooms.length,
      tasks: tasks.length,
      submissions: submissions.length,
      graded: graded.length,
      average,
      upcomingTasks: upcomingTasks.slice(0, 5),
      lateSubmissions: submissions.filter((item) => item.state === "Tarde").length,
      notifications: getNotifications().length,
    };
  };

  const getStudentDashboardData = (studentId) => {
    const classrooms = getClassroomsByStudent(studentId);
    const tasks = getTasksByStudent(studentId);
    const submissions = getSubmissionsByStudent(studentId);
    const submittedTaskIds = new Set(submissions.map((item) => item.taskId));
    const pendingTasks = tasks.filter((task) => !submittedTaskIds.has(task.id));

    return { classrooms, tasks, submissions, pendingTasks };
  };

  const downloadCsv = (filename, rows) => {
    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 0);
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const downloadExcel = (filename, sheetName, headers, rows) => {
    const safeRows = rows.length ? rows : [["Sin datos"]];
    const safeSheetName = escapeHtml(sheetName || "Sheet1").slice(0, 31);
    const tableRows = safeRows
      .map((row) => {
        const titleLabel = escapeHtml(headers[0] ?? "Registro");
        const titleValue = escapeHtml(row[0] ?? "Sin datos");
        const details = headers.slice(1).map((header, index) => {
          const value = row[index + 1] ?? "";
          return `<tr><td>${escapeHtml(header)}</td><td>${escapeHtml(value)}</td></tr>`;
        });

        return `
          <tr><th colspan="2">${titleLabel}: ${titleValue}</th></tr>
          ${details.join("")}
        `;
      })
      .join('<tr><td colspan="2" style="background:#e2e8f0;"></td></tr>');

    const html = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8" />
    <!--[if gte mso 9]><xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>${safeSheetName}</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml><![endif]-->
    <style>
      body { margin: 0; font-family: Arial, sans-serif; }
      table { border-collapse: collapse; width: 100%; min-width: 700px; max-width: 1100px; }
      th, td {
        border: 1px solid #cbd5e1;
        padding: 8px 10px;
        text-align: left;
        vertical-align: top;
        white-space: normal;
      }
      th {
        background: #0f172a;
        color: #ffffff;
        font-weight: 700;
      }
      tr:nth-child(even) td { background: #f8fafc; }
    </style>
  </head>
  <body>
    <table>${tableRows}</table>
  </body>
</html>`;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 0);
  };

  applyTheme();

  window.ClassManagerApp = {
    keys: KEYS,
    createId,
    getSession,
    setSession,
    clearSession,
    syncStoredSession,
    getCurrentUser,
    getUsers,
    replaceKnownUsers,
    removeStoredUser,
    syncStoredUser,
    getAuthUsers,
    registerKnownUser,
    upsertAuthUser,
    createLocalAccount,
    authenticateLocalUser,
    getUsersByRole: (role) => getUsers().filter((user) => user.rol === role),
    getClassrooms,
    createClassroom,
    assignStudentsToClassroom,
    getClassroomsByProfessor,
    getClassroomsByStudent,
    getTasks,
    createTask,
    deleteTask,
    getTaskById,
    getTasksByProfessor,
    getTasksByStudent,
    getSubmissions,
    submitTask,
    gradeSubmission,
    getSubmissionsByStudent,
    getSubmissionsByTask,
    getSubmissionsByProfessor,
    getTeacherDashboardData,
    getStudentDashboardData,
    getInstitutionAnalytics,
    getHistory,
    getHistoryForUser,
    pushHistory,
    getNotifications,
    getNotificationsForUser,
    getUnreadNotificationsForUser,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    getForums,
    getForumByTaskId,
    getForumMessages,
    getForumMessagesByForumId,
    createForumMessage,
    ensureForumForTask,
    getTheme,
    setTheme,
    toggleTheme,
    applyTheme,
    describeSubmissionFiles,
    downloadCsv,
    downloadExcel,
  };

  syncStoredSession();
})();
