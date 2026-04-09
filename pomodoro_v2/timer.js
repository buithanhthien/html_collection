const MODES = {
    pomodoro: { duration: 25 * 60, label: 'Focus' },
    short:    { duration:  5 * 60, label: 'Short Break' },
    long:     { duration: 15 * 60, label: 'Long Break' },
};

class PomodoroTimer {
    constructor() {
        this.mode          = 'pomodoro';
        this.timeLeft      = MODES.pomodoro.duration;
        this.totalTime     = MODES.pomodoro.duration;
        this.isRunning     = false;
        this.interval      = null;
        this.pomodoroCount = 0;   // completed pomodoros in current cycle (max 4)
        this.totalSessions = 4;

        // DOM refs
        this.display    = document.getElementById('timerDisplay');
        this.label      = document.getElementById('timerLabel');
        this.btnStart   = document.getElementById('btnStart');
        this.btnReset   = document.getElementById('btnReset');
        this.btnSkip    = document.getElementById('btnSkip');
        this.modeBtns   = document.querySelectorAll('.mode-btn');
        this.dots       = document.querySelectorAll('.session-dot');
        this.container  = document.getElementById('pomodoroTimer');
        this.ring       = document.getElementById('ringProgress');

        // SVG ring setup
        const r = this.ring.r.baseVal.value;
        this.circumference = 2 * Math.PI * r;
        this.ring.style.strokeDasharray  = this.circumference;
        this.ring.style.strokeDashoffset = 0;

        this._bindEvents();
        this._updateDisplay();
        this._updateDots();
    }

    // ── Event binding ──────────────────────────────────────────────────────────

    _bindEvents() {
        this.btnStart.addEventListener('click', () => this._toggle());
        this.btnReset.addEventListener('click', () => this._reset());
        this.btnSkip .addEventListener('click', () => this._skip());

        this.modeBtns.forEach(btn =>
            btn.addEventListener('click', () => this._switchMode(btn.dataset.mode))
        );
    }

    // ── Timer control ──────────────────────────────────────────────────────────

    _toggle() {
        this.isRunning ? this._pause() : this._start();
    }

    _start() {
        this.isRunning = true;
        this.btnStart.textContent = 'Pause';
        this.container.classList.add('running');
        this.interval = setInterval(() => this._tick(), 1000);
    }

    _pause() {
        this.isRunning = false;
        this.btnStart.textContent = 'Resume';
        this.container.classList.remove('running');
        clearInterval(this.interval);
    }

    _reset() {
        clearInterval(this.interval);
        this.isRunning = false;
        this.btnStart.textContent = 'Start';
        this.container.classList.remove('running');
        this.timeLeft = this.totalTime;

        // Instant ring reset (no animated transition)
        this.ring.style.transition = 'none';
        this._updateRing();
        requestAnimationFrame(() => {
            this.ring.style.transition = 'stroke-dashoffset 0.9s linear';
        });

        this._updateDisplay();
    }

    _skip() {
        clearInterval(this.interval);
        this.isRunning = false;
        this.container.classList.remove('running');
        this._complete();
    }

    _tick() {
        this.timeLeft--;
        this._updateDisplay();
        this._updateRing();
        if (this.timeLeft <= 0) {
            clearInterval(this.interval);
            this.isRunning = false;
            this.container.classList.remove('running');
            this._complete();
        }
    }

    _complete() {
        if (this.mode === 'pomodoro') {
            this.pomodoroCount++;
            this._updateDots();

            if (this.pomodoroCount >= this.totalSessions) {
                this.pomodoroCount = 0;
                this._updateDots();
                this._switchMode('long');
            } else {
                this._switchMode('short');
            }
        } else {
            this._switchMode('pomodoro');
        }
    }

    _switchMode(mode) {
        this.mode      = mode;
        this.totalTime = MODES[mode].duration;
        this.label.textContent = MODES[mode].label;

        this.modeBtns.forEach(btn =>
            btn.classList.toggle('active', btn.dataset.mode === mode)
        );

        this._reset();
    }

    // ── Display helpers ────────────────────────────────────────────────────────

    _updateDisplay() {
        const m = Math.floor(this.timeLeft / 60);
        const s = this.timeLeft % 60;
        const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        this.display.textContent = timeStr;
        document.title = `${timeStr} — Pomodoro`;
    }

    _updateRing() {
        const progress = this.timeLeft / this.totalTime;
        this.ring.style.strokeDashoffset = this.circumference * (1 - progress);
    }

    _updateDots() {
        this.dots.forEach((dot, i) => {
            const filled  = i < this.pomodoroCount;
            const current = i === this.pomodoroCount && this.pomodoroCount < this.totalSessions;
            dot.classList.toggle('filled',  filled);
            dot.classList.toggle('current', !filled && current);
        });
    }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    new PomodoroTimer();
});
