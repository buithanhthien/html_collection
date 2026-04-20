/* ============================================================
   Settings helpers
   ============================================================ */

const DEFAULT_SETTINGS = {
    pomodoro: 25,
    pomodoroSec: 0,
    short: 5,
    shortSec: 0,
    long: 15,
    longSec: 0,
    sessions: 4,
    sound: true,
    volume: 60,
};

function loadSettings() {
    try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('pomodoro-settings') || '{}') };
    } catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings(s) {
    localStorage.setItem('pomodoro-settings', JSON.stringify(s));
}

/* ============================================================
   Bell chime (Web Audio API — no files needed)
   ============================================================ */

function playBell(volume) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const vol = (volume ?? 60) / 100;

        // Three ascending notes: C5 → E5 → G5 (major chord arpeggio)
        const notes = [523.25, 659.25, 783.99];

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = ctx.currentTime + i * 0.22;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.992, t + 0.08);

            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(vol * 0.38, t + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 2.4);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 2.5);
        });

        setTimeout(() => ctx.close(), 4000);
    } catch (e) {
        console.warn('Web Audio API unavailable:', e);
    }
}



/* ============================================================
   Pomodoro Timer
   ============================================================ */

class PomodoroTimer {
    constructor() {
        this.settings = loadSettings();
        this.mode = 'pomodoro';
        this.isRunning = false;
        this.interval = null;
        this.pomodoroCount = 0;

        this._buildModes();

        this.timeLeft = this.modes.pomodoro.duration;
        this.totalTime = this.modes.pomodoro.duration;

        // DOM
        this.display = document.getElementById('timerDisplay');
        this.label = document.getElementById('timerLabel');
        this.btnStart = document.getElementById('btnStart');
        this.btnReset = document.getElementById('btnReset');
        this.btnSkip = document.getElementById('btnSkip');
        this.btnMute = document.getElementById('btnMute');
        this.btnSettings = document.getElementById('btnSettings');
        this.modeBtns = document.querySelectorAll('.mode-btn');
        this.dots = document.querySelectorAll('.session-dot');
        this.container = document.getElementById('pomodoroTimer');
        this.ring = document.getElementById('ringProgress');

        // Settings panel DOM
        this.overlay = document.getElementById('settingsOverlay');
        this.settingsClose = document.getElementById('settingsClose');
        this.settingsCancel = document.getElementById('settingsCancel');
        this.settingsSave = document.getElementById('settingsSave');
        this.inPomodoro = document.getElementById('settingPomodoro');
        this.inPomodoroSec = document.getElementById('settingPomodoroSec');
        this.inShort = document.getElementById('settingShort');
        this.inShortSec = document.getElementById('settingShortSec');
        this.inLong = document.getElementById('settingLong');
        this.inLongSec = document.getElementById('settingLongSec');
        this.inSessions = document.getElementById('settingSessions');
        this.inSound = document.getElementById('settingSound');
        this.inVolume = document.getElementById('settingVolume');
        this.volumeLabel = document.getElementById('settingVolumeLabel');

        // SVG ring
        const r = this.ring.r.baseVal.value;
        this.circumference = 2 * Math.PI * r;
        this.ring.style.strokeDasharray = this.circumference;
        this.ring.style.strokeDashoffset = 0;

        this._bindEvents();
        this._applyMuteState();
        this._updateDisplay();
        this._updateDots();
    }

    // ── Modes ──────────────────────────────────────────────────────────────────

    _buildModes() {
        const s = this.settings;
        this.modes = {
            pomodoro: { duration: (s.pomodoro || 0) * 60 + (s.pomodoroSec || 0), label: 'Focus' },
            short: { duration: (s.short || 0) * 60 + (s.shortSec || 0), label: 'Short Break' },
            long: { duration: (s.long || 0) * 60 + (s.longSec || 0), label: 'Long Break' },
        };
    }

    // ── Events ─────────────────────────────────────────────────────────────────

    _bindEvents() {
        this.btnStart.addEventListener('click', () => this._toggle());
        this.btnReset.addEventListener('click', () => this._reset());
        this.btnSkip.addEventListener('click', () => this._skip());
        this.btnMute.addEventListener('click', () => this._toggleMute());
        this.btnSettings.addEventListener('click', () => this._openSettings());

        this.modeBtns.forEach(btn =>
            btn.addEventListener('click', () => this._switchMode(btn.dataset.mode))
        );

        // Settings overlay
        this.settingsClose.addEventListener('click', () => this._closeSettings());
        this.settingsCancel.addEventListener('click', () => this._closeSettings());
        this.settingsSave.addEventListener('click', () => this._saveSettings());

        this.overlay.addEventListener('click', e => {
            if (e.target === this.overlay) this._closeSettings();
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && this.overlay.classList.contains('open')) {
                this._closeSettings();
            }
        });

        // Live label for chime volume slider
        this.inVolume.addEventListener('input', () => {
            this.volumeLabel.textContent = `${this.inVolume.value}%`;
        });
    }

    // ── Timer control ──────────────────────────────────────────────────────────

    _toggle() { this.isRunning ? this._pause() : this._start(); }

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
            // Celebration sparkle — only on natural end, not Skip
            if (typeof window.playCelebration === 'function') window.playCelebration();
            this._complete();
        }
    }

    _complete() {
        if (this.settings.sound) playBell(this.settings.volume);

        if (this.mode === 'pomodoro') {
            this.pomodoroCount++;
            this._updateDots();
            if (this.pomodoroCount >= this.settings.sessions) {
                this.pomodoroCount = 0;
                this._updateDots();
                this._switchMode('long');
            } else {
                this._switchMode('short');
            }
        } else {
            this._switchMode('pomodoro');
        }
        // Auto-start the next mode immediately
        this._start();
    }

    _switchMode(mode) {
        this.mode = mode;
        this.totalTime = this.modes[mode].duration;
        this.label.textContent = this.modes[mode].label;
        this.modeBtns.forEach(btn =>
            btn.classList.toggle('active', btn.dataset.mode === mode)
        );
        this._reset();
    }

    _isBreak() {
        return this.mode === 'short' || this.mode === 'long';
    }

    // ── Mute ───────────────────────────────────────────────────────────────────

    _toggleMute() {
        this.settings.sound = !this.settings.sound;
        saveSettings(this.settings);
        this._applyMuteState();
    }

    _applyMuteState() {
        const muted = !this.settings.sound;
        this.btnMute.classList.toggle('muted', muted);
        this.btnMute.querySelector('.icon-sound').style.display = muted ? 'none' : '';
        this.btnMute.querySelector('.icon-mute').style.display = muted ? '' : 'none';
        this.btnMute.title = muted ? 'Unmute' : 'Mute';
    }

    // ── Settings panel ─────────────────────────────────────────────────────────

    _openSettings() {
        const s = this.settings;
        this.inPomodoro.value = s.pomodoro || 0;
        this.inPomodoroSec.value = s.pomodoroSec || 0;
        this.inShort.value = s.short || 0;
        this.inShortSec.value = s.shortSec || 0;
        this.inLong.value = s.long || 0;
        this.inLongSec.value = s.longSec || 0;
        this.inSessions.value = s.sessions;
        this.inSound.checked = s.sound;
        this.inVolume.value = s.volume;
        this.volumeLabel.textContent = `${s.volume}%`;
        this.overlay.classList.add('open');
    }

    _closeSettings() {
        this.overlay.classList.remove('open');
    }

    _saveSettings() {
        const parse = (val, def) => { const n = parseInt(val); return isNaN(n) ? def : n; };
        const parseSec = (val) => Math.max(0, Math.min(59, parse(val, 0)));
        const s = {
            pomodoro: Math.max(0, Math.min(99, parse(this.inPomodoro.value, 25))),
            pomodoroSec: parseSec(this.inPomodoroSec.value),
            short:    Math.max(0, Math.min(99, parse(this.inShort.value, 5))),
            shortSec: parseSec(this.inShortSec.value),
            long:     Math.max(0, Math.min(99, parse(this.inLong.value, 15))),
            longSec:  parseSec(this.inLongSec.value),
            sessions: Math.max(1, Math.min(10, parse(this.inSessions.value, 4))),
            sound:    this.inSound.checked,
            volume:   parse(this.inVolume.value, 60),
        };
        this.settings = s;
        saveSettings(s);
        this._buildModes();
        this._switchMode(this.mode);
        this._applyMuteState();
        this._closeSettings();
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
        this.ring.style.strokeDashoffset =
            this.circumference * (1 - this.timeLeft / this.totalTime);
    }

    _updateDots() {
        this.dots.forEach((dot, i) => {
            dot.classList.toggle('filled', i < this.pomodoroCount);
            dot.classList.toggle('current', i === this.pomodoroCount &&
                this.pomodoroCount < this.settings.sessions);
        });
    }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    new PomodoroTimer();
});
