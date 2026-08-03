/* ==========================================================================
   TaskFlow SaaS | Hybrid Full-Stack Client (Supabase Cloud + Node.js Engine)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const NODE_API_URL = 'http://localhost:3000/api';

    let state = {
        mode: 'node', // 'supabase' or 'node'
        currentUser: null,
        sessionToken: localStorage.getItem('taskflow_session_token') || null,
        tasks: [],
        activeFilter: 'all',
        searchTerm: '',
        pomodoro: {
            timeLeft: 25 * 60,
            isRunning: false,
            timerId: null
        }
    };

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

    // DOM Elements - Pomodoro Timer
    const sidebarTimer = document.getElementById('sidebar-timer');
    const btnStartTimer = document.getElementById('btn-start-timer');
    const btnPauseTimer = document.getElementById('btn-pause-timer');
    const btnResetTimer = document.getElementById('btn-reset-timer');

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

        // Check if Supabase Client is initialized
        const hasSupabase = typeof initSupabaseClient === 'function' && initSupabaseClient();

        if (hasSupabase) {
            state.mode = 'supabase';
            statusTitleText.textContent = '⚡ Supabase Cloud';
            serverStatusText.textContent = '🟢 PostgreSQL + Auth Active';
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
                    name: session.user.user_metadata.name || session.user.email.split('@')[0],
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
        if (state.mode === 'supabase' && supabaseClient) {
            await supabaseClient.auth.signOut();
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

    // Auth Form Logic (Supabase / Node.js)
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

            if (state.mode === 'supabase' && supabaseClient) {
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) {
                    showToast(error.message, 'warning');
                } else if (data.user) {
                    const user = {
                        id: data.user.id,
                        name: data.user.user_metadata.name || email.split('@')[0],
                        email: data.user.email
                    };
                    setLoggedInUser(user, data.session.access_token);
                    await fetchTasks();
                    showToast(`¡Conectado a Supabase Cloud! Bienvenido, ${user.name}`, 'success');
                }
            } else {
                // Node.js REST API Login
                try {
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
                } catch (err) {
                    showToast('Servidor backend no disponible', 'warning');
                }
            }
        });

        // REGISTER
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;

            if (state.mode === 'supabase' && supabaseClient) {
                const { data, error } = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: { data: { name } }
                });
                if (error) {
                    showToast(error.message, 'warning');
                } else if (data.user) {
                    const user = { id: data.user.id, name, email };
                    if (data.session) setLoggedInUser(user, data.session.access_token);
                    showToast('Cuenta creada en Supabase Cloud', 'success');
                    await fetchTasks();
                }
            } else {
                // Node.js REST API Register
                try {
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
                } catch (err) {
                    showToast('Error al conectar con el servidor', 'warning');
                }
            }
        });
    }

    // FETCH TASKS
    async function fetchTasks() {
        if (!state.currentUser) return;

        if (state.mode === 'supabase' && supabaseClient) {
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
                    dueDate: t.due_date
                }));
            }
        } else {
            // Node.js API
            try {
                const res = await fetch(`${NODE_API_URL}/tasks`, {
                    headers: { 'Authorization': `Bearer ${state.sessionToken}` }
                });
                if (res.ok) {
                    state.tasks = await res.json();
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

    // Create Card Element
    function createTaskCardElement(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-id', task.id);

        const priorityClass = (task.priority || 'media').toLowerCase();

        card.innerHTML = `
            <div class="task-tags">
                <span class="tag-cat">${task.category}</span>
                <span class="badge-priority ${priorityClass}">${task.priority}</span>
            </div>
            <h4 class="task-title">${escapeHtml(task.title)}</h4>
            <p class="task-desc">${escapeHtml(task.desc)}</p>
            <div class="task-footer">
                <span class="task-date"><i class="fa-regular fa-calendar"></i> ${task.dueDate}</span>
                <div class="task-actions">
                    <button class="btn-card-action edit" data-id="${task.id}" title="Editar Tarea"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn-card-action delete" data-id="${task.id}" title="Eliminar Tarea"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `;

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

    // Drag and Drop
    let draggedTaskId = null;

    function handleDragStart(e) {
        draggedTaskId = parseInt(this.getAttribute('data-id'));
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragEnd() {
        this.classList.remove('dragging');
        document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
    }

    function setupDragAndDrop() {
        const columns = document.querySelectorAll('.kanban-column');
        columns.forEach(col => {
            col.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                col.classList.add('drag-over');
            });
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

    // Update Status
    async function updateTaskStatusAPI(id, newStatus) {
        const task = state.tasks.find(t => t.id === id);
        if (task && task.status !== newStatus) {
            task.status = newStatus;
            renderBoard();

            if (state.mode === 'supabase' && supabaseClient) {
                await supabaseClient.from('tasks').update({ status: newStatus }).eq('id', id);
                showToast(`Tarea guardada en Supabase Cloud`, 'info');
            } else {
                try {
                    await fetch(`${NODE_API_URL}/tasks/${id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${state.sessionToken}`
                        },
                        body: JSON.stringify({ status: newStatus })
                    });
                    showToast(`Tarea actualizada`, 'info');
                } catch (err) {}
            }
        }
    }

    // Delete Task
    async function deleteTaskAPI(id) {
        state.tasks = state.tasks.filter(t => t.id !== id);
        renderBoard();

        if (state.mode === 'supabase' && supabaseClient) {
            await supabaseClient.from('tasks').delete().eq('id', id);
            showToast('Tarea eliminada de Supabase', 'warning');
        } else {
            try {
                await fetch(`${NODE_API_URL}/tasks/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${state.sessionToken}` }
                });
                showToast('Tarea eliminada', 'warning');
            } catch (err) {}
        }
    }

    // Save Task Form Submit
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
            // Edit
            const id = parseInt(idInput);
            const task = state.tasks.find(t => t.id === id);
            if (task) {
                task.title = title;
                task.desc = desc;
                task.priority = priority;
                task.category = category;
                task.status = status;
                task.dueDate = dueDate;
                renderBoard();

                if (state.mode === 'supabase' && supabaseClient) {
                    await supabaseClient.from('tasks').update({
                        title, description: desc, priority, category, status, due_date: dueDate
                    }).eq('id', id);
                } else {
                    await fetch(`${NODE_API_URL}/tasks/${id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${state.sessionToken}`
                        },
                        body: JSON.stringify({ title, desc, priority, category, status, dueDate })
                    });
                }
                showToast('Tarea actualizada', 'success');
            }
        } else {
            // Create
            if (state.mode === 'supabase' && supabaseClient) {
                const { data, error } = await supabaseClient.from('tasks').insert([{
                    title, description: desc, priority, category, status, due_date: dueDate
                }]).select();

                if (!error && data && data.length > 0) {
                    const t = data[0];
                    state.tasks.unshift({
                        id: t.id, title: t.title, desc: t.description, priority: t.priority, category: t.category, status: t.status, dueDate: t.due_date
                    });
                    renderBoard();
                    showToast('Tarea creada en Supabase Cloud PostgreSQL (201)', 'success');
                }
            } else {
                try {
                    const res = await fetch(`${NODE_API_URL}/tasks`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${state.sessionToken}`
                        },
                        body: JSON.stringify({ title, desc, priority, category, status, dueDate })
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
            btn.addEventListener('click', (e) => {
                openAddTaskModal(e.currentTarget.getAttribute('data-col'));
            });
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
            if (state.tasks.length === 0) {
                showToast('No hay tareas para exportar', 'warning');
                return;
            }
            let csv = 'ID,Título,Descripción,Prioridad,Categoría,Estado,Fecha Límite\n';
            state.tasks.forEach(t => {
                csv += `${t.id},"${(t.title||'').replace(/"/g, '""')}","${(t.desc||'').replace(/"/g, '""')}",${t.priority},${t.category},${t.status},${t.dueDate}\n`;
            });
            const link = document.createElement('a');
            link.href = encodeURI('data:text/csv;charset=utf-8,' + csv);
            link.download = `TaskFlow_${state.currentUser.name.replace(/\s+/g, '_')}_Report.csv`;
            link.click();
            showToast('Reporte CSV descargado con éxito', 'success');
        });
    }

    // Pomodoro Timer Logic
    function setupPomodoroTimer() {
        updateTimerDisplay();

        btnStartTimer.addEventListener('click', () => {
            if (!state.pomodoro.isRunning) {
                state.pomodoro.isRunning = true;
                state.pomodoro.timerId = setInterval(() => {
                    if (state.pomodoro.timeLeft > 0) {
                        state.pomodoro.timeLeft--;
                        updateTimerDisplay();
                    } else {
                        clearInterval(state.pomodoro.timerId);
                        state.pomodoro.isRunning = false;
                        showToast('¡Sesión de Focus completada! ☕', 'success');
                    }
                }, 1000);
            }
        });

        btnPauseTimer.addEventListener('click', () => {
            if (state.pomodoro.isRunning) {
                clearInterval(state.pomodoro.timerId);
                state.pomodoro.isRunning = false;
            }
        });

        btnResetTimer.addEventListener('click', () => {
            clearInterval(state.pomodoro.timerId);
            state.pomodoro.isRunning = false;
            state.pomodoro.timeLeft = 25 * 60;
            updateTimerDisplay();
        });
    }

    function updateTimerDisplay() {
        const mins = Math.floor(state.pomodoro.timeLeft / 60);
        const secs = state.pomodoro.timeLeft % 60;
        sidebarTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function showToast(msg, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            'success': 'fa-circle-check',
            'warning': 'fa-triangle-exclamation',
            'info': 'fa-circle-info'
        };

        toast.innerHTML = `<i class="fa-solid ${icons[type] || 'fa-bell'}"></i> <span>${escapeHtml(msg)}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => { toast.remove(); }, 3200);
    }

    function escapeHtml(str) {
        return str ? str.replace(/[&<>'"]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[tag] || tag)) : '';
    }

    init();
});
