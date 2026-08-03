/* ==========================================================================
   TaskFlow SaaS | Hybrid Client (Time Tracking & Sprint Analytics Engine)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const NODE_API_URL = 'http://localhost:3000/api';

    let state = {
        mode: 'node',
        currentUser: null,
        sessionToken: localStorage.getItem('taskflow_session_token') || null,
        tasks: [],
        activeFilter: 'all',
        searchTerm: '',
        activeTimerTaskId: null,
        activeTimerInterval: null,
        pomodoro: {
            timeLeft: 25 * 60,
            initialDuration: 25 * 60,
            isRunning: false,
            timerId: null,
            completedSessions: 0
        }
    };

    // Chart.js Instances
    let chartVelocityInstance = null;
    let chartPriorityInstance = null;

    // DOM Elements - Auth
    const authOverlay = document.getElementById('auth-overlay');
    const tabLoginBtn = document.getElementById('tab-login-btn');
    const tabRegisterBtn = document.getElementById('tab-register-btn');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    // DOM Elements - User Profile
    const userDisplayName = document.getElementById('user-display-name');
    const userDisplayEmail = document.getElementById('user-display-email');
    const userAvatarInitials = document.getElementById('user-avatar-initials');
    const headerUserFirstname = document.getElementById('header-user-firstname');
    const btnLogout = document.getElementById('btn-logout');

    // DOM Elements - Server Status
    const serverStatusCard = document.getElementById('server-status-card');
    const statusTitleText = document.getElementById('status-title-text');
    const serverStatusText = document.getElementById('server-status-text');

    // DOM Elements - Modal & Actions
    const taskModal = document.getElementById('task-modal');
    const formTask = document.getElementById('form-task');
    const modalTitle = document.getElementById('modal-form-title');
    const btnAddTaskMain = document.getElementById('btn-add-task-main');
    const btnCloseModal = document.getElementById('close-modal');
    const btnCancelModal = document.getElementById('btn-cancel-modal');
    const taskSearchInput = document.getElementById('task-search-input');
    const btnExportCsv = document.getElementById('btn-export-csv');

    // DOM Elements - Navigation SPA
    const navItems = {
        'kanban': document.getElementById('nav-kanban'),
        'analytics': document.getElementById('nav-analytics'),
        'timer': document.getElementById('nav-timer')
    };

    const viewSections = {
        'kanban': document.getElementById('view-kanban'),
        'analytics': document.getElementById('view-analytics'),
        'timer': document.getElementById('view-timer')
    };

    // DOM Elements - Sidebar Timer
    const sidebarTimer = document.getElementById('sidebar-timer');
    const btnStartTimer = document.getElementById('btn-start-timer');
    const btnPauseTimer = document.getElementById('btn-pause-timer');
    const btnResetTimer = document.getElementById('btn-reset-timer');

    // DOM Elements - Hub Pomodoro
    const hubTimerDisplay = document.getElementById('hub-timer-display');
    const hubBtnStart = document.getElementById('hub-btn-start');
    const hubBtnPause = document.getElementById('hub-btn-pause');
    const hubBtnReset = document.getElementById('hub-btn-reset');
    const hubCompletedSessions = document.getElementById('hub-completed-sessions');

    // Kanban Lists DOM
    const lists = {
        'todo': document.getElementById('list-todo'),
        'in-progress': document.getElementById('list-in-progress'),
        'review': document.getElementById('list-review'),
        'done': document.getElementById('list-done')
    };

    const counts = {
        'todo': document.getElementById('count-todo'),
        'in-progress': document.getElementById('count-in-progress'),
        'review': document.getElementById('count-review'),
        'done': document.getElementById('count-done')
    };

    // Initialize App
    async function init() {
        setupAuthTabs();
        setupEventListeners();
        setupDragAndDrop();
        setupPomodoroTimer();
        setupSPANavigation();

        const hasSupabase = typeof initSupabaseClient === 'function' && initSupabaseClient();

        if (hasSupabase) {
            state.mode = 'supabase';
            statusTitleText.textContent = '⚡ Supabase Cloud';
            serverStatusText.textContent = '🟢 PostgreSQL + Auth Activo';
            await checkSupabaseSession();
        } else {
            state.mode = 'node';
            statusTitleText.textContent = '📡 Node.js REST Engine';
            await checkNodeHealth();
            if (state.sessionToken) {
                await verifyNodeSession();
            } else {
                showAuthOverlay();
            }
        }
    }

    // SPA Navigation View Switcher
    function setupSPANavigation() {
        Object.keys(navItems).forEach(key => {
            if (navItems[key]) {
                navItems[key].addEventListener('click', (e) => {
                    e.preventDefault();
                    switchView(key);
                });
            }
        });
    }

    function switchView(targetView) {
        Object.keys(navItems).forEach(key => {
            if (navItems[key]) navItems[key].classList.remove('active');
            if (viewSections[key]) viewSections[key].classList.remove('active');
        });

        if (navItems[targetView]) navItems[targetView].classList.add('active');
        if (viewSections[targetView]) viewSections[targetView].classList.add('active');

        if (targetView === 'analytics') {
            renderAnalytics();
        }
    }

    // Node Server Health
    async function checkNodeHealth() {
        try {
            const res = await fetch(`${NODE_API_URL}/health`);
            if (res.ok) {
                serverStatusText.textContent = '🟢 REST API Local Live (3000)';
            } else throw new Error();
        } catch (err) {
            serverStatusCard.classList.add('offline');
            serverStatusText.textContent = '🟡 Configura Supabase o ejecuta node server.js';
        }
    }

    // SUPABASE SESSION CHECK
    async function checkSupabaseSession() {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.user) {
                const user = {
                    id: session.user.id,
                    name: (session.user.user_metadata && session.user.user_metadata.name) || session.user.email.split('@')[0],
                    email: session.user.email
                };
                setLoggedInUser(user, session.access_token);
                await fetchTasks();
            } else {
                showAuthOverlay();
            }
        } catch (err) {
            showAuthOverlay();
        }
    }

    // NODE SESSION CHECK
    async function verifyNodeSession() {
        try {
            const res = await fetch(`${NODE_API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${state.sessionToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLoggedInUser(data.user, state.sessionToken);
                await fetchTasks();
            } else {
                logoutUser();
            }
        } catch (err) {
            logoutUser();
        }
    }

    // Set Logged In State
    function setLoggedInUser(user, token) {
        state.currentUser = user;
        state.sessionToken = token;
        localStorage.setItem('taskflow_session_token', token);

        userDisplayName.textContent = user.name;
        userDisplayEmail.textContent = user.email;
        headerUserFirstname.textContent = user.name.split(' ')[0];

        const initials = user.name.substring(0, 2).toUpperCase();
        userAvatarInitials.textContent = initials;
        authOverlay.classList.add('hidden');
    }

    // Logout
    async function logoutUser() {
        stopTaskTimer();
        if (state.mode === 'supabase' && supabaseClient) {
            try { await supabaseClient.auth.signOut(); } catch (e) {}
        } else if (state.sessionToken) {
            try {
                await fetch(`${NODE_API_URL}/auth/logout`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${state.sessionToken}` }
                });
            } catch (err) {}
        }

        state.currentUser = null;
        state.sessionToken = null;
        state.tasks = [];
        localStorage.removeItem('taskflow_session_token');

        renderBoard();
        showAuthOverlay();
        showToast('Sesión cerrada correctamente', 'info');
    }

    function showAuthOverlay() {
        authOverlay.classList.remove('hidden');
    }

    // Auth Form Handlers
    function setupAuthTabs() {
        tabLoginBtn.addEventListener('click', () => {
            tabLoginBtn.classList.add('active');
            tabRegisterBtn.classList.remove('active');
            formLogin.classList.add('active');
            formRegister.classList.remove('active');
        });

        tabRegisterBtn.addEventListener('click', () => {
            tabRegisterBtn.classList.add('active');
            tabLoginBtn.classList.remove('active');
            formRegister.classList.add('active');
            formLogin.classList.remove('active');
        });

        // LOGIN
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const btnSubmit = formLogin.querySelector('button[type="submit"]');

            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Autenticando...';

            try {
                if (state.mode === 'supabase' && supabaseClient) {
                    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                    if (error) {
                        showToast(`Supabase: ${error.message}`, 'warning');
                    } else if (data && data.user) {
                        const user = {
                            id: data.user.id,
                            name: (data.user.user_metadata && data.user.user_metadata.name) || email.split('@')[0],
                            email: data.user.email
                        };
                        setLoggedInUser(user, data.session ? data.session.access_token : '');
                        await fetchTasks();
                        showToast(`¡Conectado a Supabase! Bienvenido ${user.name}`, 'success');
                    }
                } else {
                    const res = await fetch(`${NODE_API_URL}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        setLoggedInUser(data.user, data.token);
                        await fetchTasks();
                        showToast(`¡Bienvenido de nuevo, ${data.user.name}! 👋`, 'success');
                    } else {
                        showToast(data.error || 'Error al iniciar sesión', 'warning');
                    }
                }
            } catch (err) {
                showToast('Error de conexión al autenticar', 'warning');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Iniciar Sesión en la Nube';
            }
        });

        // REGISTER
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            const btnSubmit = formRegister.querySelector('button[type="submit"]');

            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando...';

            try {
                if (state.mode === 'supabase' && supabaseClient) {
                    const { data, error } = await supabaseClient.auth.signUp({
                        email,
                        password,
                        options: { data: { name } }
                    });

                    if (error) {
                        showToast(`Supabase Auth: ${error.message}`, 'warning');
                    } else if (data && data.user) {
                        const user = { id: data.user.id, name, email };
                        if (data.session) {
                            setLoggedInUser(user, data.session.access_token);
                            await fetchTasks();
                            showToast(`¡Cuenta registrada! Bienvenido ${name}`, 'success');
                        } else {
                            showToast('Cuenta registrada en Supabase.', 'info');
                            tabLoginBtn.click();
                        }
                    }
                } else {
                    const res = await fetch(`${NODE_API_URL}/auth/register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, email, password })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        setLoggedInUser(data.user, data.token);
                        await fetchTasks();
                        showToast(`¡Cuenta creada! Bienvenido, ${data.user.name}`, 'success');
                    } else {
                        showToast(data.error || 'Error al registrar', 'warning');
                    }
                }
            } catch (err) {
                showToast('Error de conexión', 'warning');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fa-solid fa-user-plus"></i> Crear Cuenta en Supabase';
            }
        });
    }

    // FETCH TASKS
    async function fetchTasks() {
        if (!state.currentUser) return;

        if (state.mode === 'supabase' && supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('tasks')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    state.tasks = data.map(t => ({
                        id: t.id,
                        title: t.title,
                        desc: t.description,
                        priority: t.priority,
                        category: t.category,
                        status: t.status,
                        dueDate: t.due_date,
                        timeSpent: t.time_spent || 0
                    }));
                }
            } catch (err) {}
        } else {
            try {
                const res = await fetch(`${NODE_API_URL}/tasks`, {
                    headers: { 'Authorization': `Bearer ${state.sessionToken}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    state.tasks = data.map(t => ({ ...t, timeSpent: t.timeSpent || 0 }));
                }
            } catch (err) {}
        }

        renderBoard();
    }

    // Render Board
    function renderBoard() {
        Object.values(lists).forEach(list => list.innerHTML = '');
        const statusCounts = { 'todo': 0, 'in-progress': 0, 'review': 0, 'done': 0 };

        const filteredTasks = state.tasks.filter(task => {
            const matchesPriority = state.activeFilter === 'all' || task.priority === state.activeFilter;
            const matchesSearch = task.title.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
                                  (task.desc || '').toLowerCase().includes(state.searchTerm.toLowerCase()) ||
                                  task.category.toLowerCase().includes(state.searchTerm.toLowerCase());
            return matchesPriority && matchesSearch;
        });

        filteredTasks.forEach(task => {
            if (statusCounts[task.status] !== undefined) statusCounts[task.status]++;
            const card = createTaskCardElement(task);
            if (lists[task.status]) lists[task.status].appendChild(card);
        });

        Object.keys(lists).forEach(status => {
            if (statusCounts[status] === 0) {
                const emptyState = document.createElement('div');
                emptyState.className = 'empty-column-state';
                emptyState.innerHTML = `<i class="fa-regular fa-folder-open"></i><p>Sin tareas aquí</p>`;
                lists[status].appendChild(emptyState);
            }
        });

        Object.keys(counts).forEach(status => {
            if (counts[status]) counts[status].textContent = statusCounts[status];
        });

        document.getElementById('stat-total-tasks').textContent = `Total: ${state.tasks.length} Tareas`;
        const completedCount = state.tasks.filter(t => t.status === 'done').length;
        document.getElementById('stat-completed-tasks').textContent = `Completadas: ${completedCount}`;
    }

    // Create Task Card DOM (With Time Tracker Bar)
    function createTaskCardElement(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-id', task.id);

        const priorityClass = (task.priority || 'media').toLowerCase();
        const isTimerRunning = state.activeTimerTaskId === task.id;

        card.innerHTML = `
            <div class="task-tags">
                <span class="tag-cat">${task.category}</span>
                <span class="badge-priority ${priorityClass}">${task.priority}</span>
            </div>
            <h4 class="task-title">${escapeHtml(task.title)}</h4>
            <p class="task-desc">${escapeHtml(task.desc)}</p>

            <!-- Task Time Tracker Bar -->
            <div class="task-timer-bar">
                <button class="task-timer-btn ${isTimerRunning ? 'active' : ''}" data-id="${task.id}" title="${isTimerRunning ? 'Pausar Cronómetro' : 'Iniciar Cronómetro'}">
                    <i class="fa-solid ${isTimerRunning ? 'fa-pause' : 'fa-play'}"></i>
                </button>
                <div class="task-time-display" id="task-time-${task.id}">
                    <i class="fa-regular fa-clock"></i> ${formatTimeSpent(task.timeSpent || 0)}
                </div>
            </div>

            <div class="task-footer">
                <span class="task-date"><i class="fa-regular fa-calendar"></i> ${task.dueDate}</span>
                <div class="task-actions">
                    <button class="btn-card-action edit" data-id="${task.id}" title="Editar Tarea"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn-card-action delete" data-id="${task.id}" title="Eliminar Tarea"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `;

        // Time Tracker Button Click
        card.querySelector('.task-timer-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTaskTimer(task.id);
        });

        card.querySelector('.btn-card-action.edit').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditTaskModal(task.id);
        });

        card.querySelector('.btn-card-action.delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTaskAPI(task.id);
        });

        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);

        return card;
    }

    // TASK TIME TRACKER ENGINE
    function toggleTaskTimer(taskId) {
        if (state.activeTimerTaskId === taskId) {
            stopTaskTimer();
            showToast('Cronómetro de tarea pausado', 'info');
        } else {
            stopTaskTimer();
            startTaskTimer(taskId);
            showToast('Cronómetro iniciado en la tarea', 'success');
        }
    }

    function startTaskTimer(taskId) {
        state.activeTimerTaskId = taskId;
        renderBoard();

        state.activeTimerInterval = setInterval(() => {
            const task = state.tasks.find(t => t.id === taskId);
            if (task) {
                task.timeSpent = (task.timeSpent || 0) + 1;
                const timeEl = document.getElementById(`task-time-${taskId}`);
                if (timeEl) {
                    timeEl.innerHTML = `<i class="fa-regular fa-clock"></i> ${formatTimeSpent(task.timeSpent)}`;
                }
            } else {
                stopTaskTimer();
            }
        }, 1000);
    }

    function stopTaskTimer() {
        if (state.activeTimerInterval) {
            clearInterval(state.activeTimerInterval);
            state.activeTimerInterval = null;
        }

        if (state.activeTimerTaskId) {
            const taskId = state.activeTimerTaskId;
            const task = state.tasks.find(t => t.id === taskId);
            state.activeTimerTaskId = null;
            renderBoard();

            if (task) {
                persistTaskTime(task.id, task.timeSpent);
            }
        }
    }

    async function persistTaskTime(id, timeSpent) {
        if (state.mode === 'supabase' && supabaseClient) {
            await supabaseClient.from('tasks').update({ time_spent: timeSpent }).eq('id', id);
        } else {
            try {
                await fetch(`${NODE_API_URL}/tasks/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.sessionToken}` },
                    body: JSON.stringify({ timeSpent })
                });
            } catch (e) {}
        }
    }

    function formatTimeSpent(totalSecs) {
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;

        if (hrs > 0) return `${hrs}h ${mins}m`;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    }

    // Drag and Drop
    let draggedTaskId = null;
    function handleDragStart(e) { draggedTaskId = parseInt(this.getAttribute('data-id')); this.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; }
    function handleDragEnd() { this.classList.remove('dragging'); document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over')); }

    function setupDragAndDrop() {
        const columns = document.querySelectorAll('.kanban-column');
        columns.forEach(col => {
            col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
            col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
            col.addEventListener('drop', (e) => {
                e.preventDefault();
                col.classList.remove('drag-over');
                const targetStatus = col.getAttribute('data-status');
                if (draggedTaskId && targetStatus) {
                    updateTaskStatusAPI(draggedTaskId, targetStatus);
                }
            });
        });
    }

    async function updateTaskStatusAPI(id, newStatus) {
        const task = state.tasks.find(t => t.id === id);
        if (task && task.status !== newStatus) {
            task.status = newStatus;
            renderBoard();

            if (state.mode === 'supabase' && supabaseClient) {
                await supabaseClient.from('tasks').update({ status: newStatus }).eq('id', id);
            } else {
                try {
                    await fetch(`${NODE_API_URL}/tasks/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.sessionToken}` },
                        body: JSON.stringify({ status: newStatus })
                    });
                } catch (err) {}
            }
            showToast(`Tarea movida a "${newStatus}"`, 'info');
        }
    }

    async function deleteTaskAPI(id) {
        if (state.activeTimerTaskId === id) stopTaskTimer();
        state.tasks = state.tasks.filter(t => t.id !== id);
        renderBoard();

        if (state.mode === 'supabase' && supabaseClient) {
            await supabaseClient.from('tasks').delete().eq('id', id);
        } else {
            try {
                await fetch(`${NODE_API_URL}/tasks/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${state.sessionToken}` }
                });
            } catch (err) {}
        }
        showToast('Tarea eliminada', 'warning');
    }

    // Save Form Submit
    async function handleFormSubmit(e) {
        e.preventDefault();
        const idInput = document.getElementById('task-id').value;
        const title = document.getElementById('task-title').value.trim();
        const desc = document.getElementById('task-desc').value.trim();
        const priority = document.getElementById('task-priority').value;
        const category = document.getElementById('task-category').value;
        const status = document.getElementById('task-status-select').value;
        const dueDate = document.getElementById('task-due').value || new Date().toISOString().split('T')[0];

        if (!title) return;

        if (idInput) {
            const id = parseInt(idInput);
            const task = state.tasks.find(t => t.id === id);
            if (task) {
                task.title = title; task.desc = desc; task.priority = priority; task.category = category; task.status = status; task.dueDate = dueDate;
                renderBoard();

                if (state.mode === 'supabase' && supabaseClient) {
                    await supabaseClient.from('tasks').update({ title, description: desc, priority, category, status, due_date: dueDate }).eq('id', id);
                } else {
                    await fetch(`${NODE_API_URL}/tasks/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.sessionToken}` },
                        body: JSON.stringify({ title, desc, priority, category, status, dueDate })
                    });
                }
                showToast('Tarea actualizada', 'success');
            }
        } else {
            if (state.mode === 'supabase' && supabaseClient) {
                const { data, error } = await supabaseClient.from('tasks').insert([{
                    title, description: desc, priority, category, status, due_date: dueDate, time_spent: 0
                }]).select();

                if (!error && data && data.length > 0) {
                    const t = data[0];
                    state.tasks.unshift({ id: t.id, title: t.title, desc: t.description, priority: t.priority, category: t.category, status: t.status, dueDate: t.due_date, timeSpent: 0 });
                    renderBoard();
                    showToast('Tarea creada en Supabase (201)', 'success');
                }
            } else {
                try {
                    const res = await fetch(`${NODE_API_URL}/tasks`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.sessionToken}` },
                        body: JSON.stringify({ title, desc, priority, category, status, dueDate, timeSpent: 0 })
                    });
                    if (res.ok) {
                        const newTask = await res.json();
                        state.tasks.unshift(newTask);
                        renderBoard();
                        showToast('Tarea guardada en servidor Node.js', 'success');
                    }
                } catch (err) {}
            }
        }

        taskModal.classList.remove('active');
    }

    // RENDER SPRINT ANALYTICS DASHBOARD
    function renderAnalytics() {
        const totalSecs = state.tasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0);
        document.getElementById('kpi-total-time').textContent = formatTimeSpent(totalSecs);

        const totalTasks = state.tasks.length;
        const completedTasks = state.tasks.filter(t => t.status === 'done').length;
        const rate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;
        document.getElementById('kpi-completion-rate').textContent = `${rate}%`;

        const highPriorityCount = state.tasks.filter(t => t.priority === 'Alta').length;
        document.getElementById('kpi-high-priority').textContent = highPriorityCount;

        // Chart 1: Sprint Velocity Line / Bar Chart
        const ctxVelocity = document.getElementById('chartSprintVelocity').getContext('2d');
        if (chartVelocityInstance) chartVelocityInstance.destroy();

        chartVelocityInstance = new Chart(ctxVelocity, {
            type: 'bar',
            data: {
                labels: ['Por Hacer', 'En Progreso', 'En Revisión', 'Completadas'],
                datasets: [{
                    label: 'Cantidad de Tareas por Estado',
                    data: [
                        state.tasks.filter(t => t.status === 'todo').length,
                        state.tasks.filter(t => t.status === 'in-progress').length,
                        state.tasks.filter(t => t.status === 'review').length,
                        completedTasks
                    ],
                    backgroundColor: ['#6366f1', '#f59e0b', '#a855f7', '#10b981'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });

        // Chart 2: Priority Distribution Doughnut Chart
        const ctxPriority = document.getElementById('chartPriorityDistribution').getContext('2d');
        if (chartPriorityInstance) chartPriorityInstance.destroy();

        chartPriorityInstance = new Chart(ctxPriority, {
            type: 'doughnut',
            data: {
                labels: ['🔥 Alta', '⚡ Media', '🌱 Baja'],
                datasets: [{
                    data: [
                        highPriorityCount,
                        state.tasks.filter(t => t.priority === 'Media').length,
                        state.tasks.filter(t => t.priority === 'Baja').length
                    ],
                    backgroundColor: ['#f43f5e', '#f59e0b', '#10b981'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } },
                cutout: '70%'
            }
        });
    }

    // Modal Helpers
    function openAddTaskModal(defaultStatus = 'todo') {
        formTask.reset();
        document.getElementById('task-id').value = '';
        document.getElementById('task-status-select').value = defaultStatus;
        modalTitle.innerHTML = '<i class="fa-solid fa-square-plus"></i> Nueva Tarea';
        taskModal.classList.add('active');
    }

    function openEditTaskModal(id) {
        const task = state.tasks.find(t => t.id === id);
        if (!task) return;

        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-desc').value = task.desc;
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-category').value = task.category;
        document.getElementById('task-status-select').value = task.status;
        document.getElementById('task-due').value = task.dueDate;

        modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Tarea';
        taskModal.classList.add('active');
    }

    // Event Listeners
    function setupEventListeners() {
        btnAddTaskMain.addEventListener('click', () => openAddTaskModal('todo'));
        btnCloseModal.addEventListener('click', () => taskModal.classList.remove('active'));
        btnCancelModal.addEventListener('click', () => taskModal.classList.remove('active'));
        formTask.addEventListener('submit', handleFormSubmit);
        btnLogout.addEventListener('click', logoutUser);

        document.querySelectorAll('.btn-add-col').forEach(btn => {
            btn.addEventListener('click', (e) => { openAddTaskModal(e.currentTarget.getAttribute('data-col')); });
        });

        taskSearchInput.addEventListener('input', (e) => {
            state.searchTerm = e.target.value;
            renderBoard();
        });

        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
                state.activeFilter = e.currentTarget.getAttribute('data-priority');
                renderBoard();
            });
        });

        btnExportCsv.addEventListener('click', () => {
            if (state.tasks.length === 0) { showToast('No hay tareas para exportar', 'warning'); return; }
            let csv = 'ID,Título,Descripción,Prioridad,Categoría,Estado,Tiempo Invertido,Fecha Límite\n';
            state.tasks.forEach(t => {
                csv += `${t.id},"${(t.title||'').replace(/"/g, '""')}","${(t.desc||'').replace(/"/g, '""')}",${t.priority},${t.category},${t.status},"${formatTimeSpent(t.timeSpent||0)}",${t.dueDate}\n`;
            });
            const link = document.createElement('a');
            link.href = encodeURI('data:text/csv;charset=utf-8,' + csv);
            link.download = `TaskFlow_${state.currentUser.name.replace(/\s+/g, '_')}_Report.csv`;
            link.click();
            showToast('Reporte CSV descargado con éxito', 'success');
        });

        // Hub Pomodoro Controls
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const mins = parseInt(e.currentTarget.getAttribute('data-minutes'));
                state.pomodoro.initialDuration = mins * 60;
                state.pomodoro.timeLeft = mins * 60;
                updateHubTimerDisplay();
            });
        });

        hubBtnStart.addEventListener('click', startPomodoro);
        hubBtnPause.addEventListener('click', pausePomodoro);
        hubBtnReset.addEventListener('click', resetPomodoro);
    }

    // POMODORO ENGINE
    function setupPomodoroTimer() {
        updateSidebarTimerDisplay();
        updateHubTimerDisplay();

        btnStartTimer.addEventListener('click', startPomodoro);
        btnPauseTimer.addEventListener('click', pausePomodoro);
        btnResetTimer.addEventListener('click', resetPomodoro);
    }

    function startPomodoro() {
        if (!state.pomodoro.isRunning) {
            state.pomodoro.isRunning = true;
            state.pomodoro.timerId = setInterval(() => {
                if (state.pomodoro.timeLeft > 0) {
                    state.pomodoro.timeLeft--;
                    updateSidebarTimerDisplay();
                    updateHubTimerDisplay();
                } else {
                    clearInterval(state.pomodoro.timerId);
                    state.pomodoro.isRunning = false;
                    state.pomodoro.completedSessions++;
                    hubCompletedSessions.textContent = `${state.pomodoro.completedSessions} Sesiones`;
                    showToast('¡Sesión de Focus Pomodoro completada! ☕', 'success');
                }
            }, 1000);
        }
    }

    function pausePomodoro() {
        if (state.pomodoro.isRunning) {
            clearInterval(state.pomodoro.timerId);
            state.pomodoro.isRunning = false;
        }
    }

    function resetPomodoro() {
        clearInterval(state.pomodoro.timerId);
        state.pomodoro.isRunning = false;
        state.pomodoro.timeLeft = state.pomodoro.initialDuration;
        updateSidebarTimerDisplay();
        updateHubTimerDisplay();
    }

    function updateSidebarTimerDisplay() {
        const mins = Math.floor(state.pomodoro.timeLeft / 60);
        const secs = state.pomodoro.timeLeft % 60;
        sidebarTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function updateHubTimerDisplay() {
        const mins = Math.floor(state.pomodoro.timeLeft / 60);
        const secs = state.pomodoro.timeLeft % 60;
        hubTimerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function showToast(msg, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = { 'success': 'fa-circle-check', 'warning': 'fa-triangle-exclamation', 'info': 'fa-circle-info' };
        toast.innerHTML = `<i class="fa-solid ${icons[type] || 'fa-bell'}"></i> <span>${escapeHtml(msg)}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => { toast.remove(); }, 3500);
    }

    function escapeHtml(str) {
        return str ? str.replace(/[&<>'"]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[tag] || tag)) : '';
    }

    init();
});
