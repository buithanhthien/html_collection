/* ============================================================
   Notepad — auto-saves to localStorage
   ============================================================ */

class Notepad {
    constructor() {
        this.area     = document.getElementById('notesArea');
        this.counter  = document.getElementById('notesCharCount');
        this.clearBtn = document.getElementById('notesClear');

        if (!this.area) return;

        const notesBody = this.area.closest('.notes-body');
        if (notesBody) {
            this._confirmOverlay = document.createElement('div');
            this._confirmOverlay.className = 'notes-clear-confirm';
            this._confirmOverlay.setAttribute('hidden', '');
            this._confirmOverlay.innerHTML = `
                <div class="notes-clear-confirm-card" role="alertdialog" aria-modal="true"
                     aria-labelledby="notesClearVyTitle" aria-describedby="notesClearVyDesc">
                    <p id="notesClearVyTitle" class="notes-clear-confirm-title">Hey Vy</p>
                    <p id="notesClearVyDesc" class="notes-clear-confirm-desc">You wanna clear all notes?</p>
                    <div class="notes-clear-confirm-actions">
                        <button type="button" class="notes-clear-confirm-btn notes-clear-confirm-cancel">Cancel</button>
                        <button type="button" class="notes-clear-confirm-btn notes-clear-confirm-ok">Clear</button>
                    </div>
                </div>`;
            notesBody.appendChild(this._confirmOverlay);

            this._confirmOverlay.querySelector('.notes-clear-confirm-cancel').addEventListener('click', () => {
                this._closeClearConfirm();
            });
            this._confirmOverlay.querySelector('.notes-clear-confirm-ok').addEventListener('click', () => {
                this._closeClearConfirm();
                this._performClear();
            });
        }

        // Restore saved notes
        this.area.value = localStorage.getItem('pomodoro-notes') || '';
        this._updateCount();

        // Auto-save on every keystroke
        this.area.addEventListener('input', () => {
            localStorage.setItem('pomodoro-notes', this.area.value);
            this._updateCount();
        });

        // Clear button (in-page confirm — avoids browser “localhost… cho biết” on native confirm)
        this.clearBtn?.addEventListener('click', () => {
            if (!this.area.value) {
                this._performClear();
                return;
            }
            if (this._confirmOverlay) {
                this._openClearConfirm();
            } else {
                this._performClear();
            }
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

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (!this._confirmOverlay || this._confirmOverlay.hasAttribute('hidden')) return;
            this._closeClearConfirm();
        });
    }

    _openClearConfirm() {
        if (!this._confirmOverlay) return;
        this._confirmOverlay.removeAttribute('hidden');
        const ok = this._confirmOverlay.querySelector('.notes-clear-confirm-ok');
        ok?.focus();
    }

    _closeClearConfirm() {
        if (!this._confirmOverlay) return;
        this._confirmOverlay.setAttribute('hidden', '');
        this.area.focus();
    }

    _performClear() {
        this.area.value = '';
        localStorage.removeItem('pomodoro-notes');
        this._updateCount();
        this.area.focus();
    }

    _updateCount() {
        if (!this.counter) return;
        const n = this.area.value.length;
        this.counter.textContent = `${n.toLocaleString()} char${n !== 1 ? 's' : ''}`;
    }
}

document.addEventListener('DOMContentLoaded', () => { new Notepad(); });
