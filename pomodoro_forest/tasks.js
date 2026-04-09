class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('pomodoro-tasks') || '[]');

        // DOM refs
        this.input   = document.getElementById('taskInput');
        this.addBtn  = document.getElementById('taskAddBtn');
        this.list    = document.getElementById('taskList');
        this.count   = document.getElementById('taskCount');
        this.footer  = document.getElementById('taskFooter');

        this._bindEvents();
        this._render();
    }

    // ── Event binding ──────────────────────────────────────────────────────────

    _bindEvents() {
        this.addBtn.addEventListener('click', () => this._addTask());
        this.input.addEventListener('keydown', e => {
            if (e.key === 'Enter') this._addTask();
        });
    }

    // ── CRUD ───────────────────────────────────────────────────────────────────

    _addTask() {
        const text = this.input.value.trim();
        if (!text) return;

        this.tasks.push({ id: Date.now(), text, completed: false });
        this.input.value = '';
        this._save();
        this._render();
    }

    _toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) task.completed = !task.completed;
        this._save();
        this._render();
    }

    _deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this._save();
        this._render();
    }

    _save() {
        localStorage.setItem('pomodoro-tasks', JSON.stringify(this.tasks));
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    _render() {
        const total     = this.tasks.length;
        const remaining = this.tasks.filter(t => !t.completed).length;

        // Count badge
        this.count.textContent = remaining > 0 ? remaining : '';

        // Footer text
        if (total === 0) {
            this.footer.textContent = 'No tasks yet';
        } else if (remaining === 0) {
            this.footer.textContent = '🌿 All done — great work!';
        } else {
            this.footer.textContent = `${remaining} of ${total} remaining`;
        }

        // Clear and rebuild list (incomplete first)
        this.list.innerHTML = '';
        const sorted = [
            ...this.tasks.filter(t => !t.completed),
            ...this.tasks.filter(t =>  t.completed),
        ];

        sorted.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item${task.completed ? ' completed' : ''}`;

            // Checkbox button
            const check = document.createElement('button');
            check.className = 'task-check';
            check.title = task.completed ? 'Mark incomplete' : 'Mark complete';
            if (task.completed) {
                check.innerHTML = `
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="3.5"
                         stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>`;
            }
            check.addEventListener('click', () => this._toggleTask(task.id));

            // Task text
            const span = document.createElement('span');
            span.className = 'task-text';
            span.textContent = task.text;

            // Delete button
            const del = document.createElement('button');
            del.className = 'task-delete';
            del.title = 'Delete task';
            del.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6"  y2="18"/>
                    <line x1="6"  y1="6" x2="18" y2="18"/>
                </svg>`;
            del.addEventListener('click', () => this._deleteTask(task.id));

            li.append(check, span, del);
            this.list.appendChild(li);
        });
    }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    new TaskManager();
});
