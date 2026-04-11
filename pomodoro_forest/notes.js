/* ============================================================
   Notepad — auto-saves to localStorage
   ============================================================ */

class Notepad {
    constructor() {
        this.area     = document.getElementById('notesArea');
        this.counter  = document.getElementById('notesCharCount');
        this.clearBtn = document.getElementById('notesClear');

        if (!this.area) return;

        // Restore saved notes
        this.area.value = localStorage.getItem('pomodoro-notes') || '';
        this._updateCount();

        // Auto-save on every keystroke
        this.area.addEventListener('input', () => {
            localStorage.setItem('pomodoro-notes', this.area.value);
            this._updateCount();
        });

        // Clear button
        this.clearBtn?.addEventListener('click', () => {
            if (this.area.value && !confirm('Clear all notes?')) return;
            this.area.value = '';
            localStorage.removeItem('pomodoro-notes');
            this._updateCount();
            this.area.focus();
        });

        // Tab → insert spaces (not navigate away)
        this.area.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const s = this.area.selectionStart;
                const e2 = this.area.selectionEnd;
                this.area.value = this.area.value.substring(0, s) + '    ' + this.area.value.substring(e2);
                this.area.selectionStart = this.area.selectionEnd = s + 4;
                localStorage.setItem('pomodoro-notes', this.area.value);
                this._updateCount();
            }
        });
    }

    _updateCount() {
        if (!this.counter) return;
        const n = this.area.value.length;
        this.counter.textContent = `${n.toLocaleString()} char${n !== 1 ? 's' : ''}`;
    }
}

document.addEventListener('DOMContentLoaded', () => { new Notepad(); });
