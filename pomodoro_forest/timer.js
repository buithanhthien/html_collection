/* ============================================================
   Settings helpers
   ============================================================ */

const DEFAULT_SETTINGS = {
    pomodoro: 25,
    short: 5,
    long: 15,
    sessions: 4,
    sound: true,
    volume: 60,
    lofi: true,
    lofiVolume: 40,
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
   Lofi audio player
   ============================================================ */

// Publicly available free streams — tries in order until one works
const LOFI_STREAMS = [
    'https://ice2.somafm.com/groovesalad-128-mp3',  // SomaFM Groove Salad (ambient)
    'https://ice1.somafm.com/groovesalad-128-mp3',  // Mirror
];

class LofiPlayer {
    constructor() {
        this.audio = new Audio();
        this.audio.crossOrigin = 'anonymous';
        this._streamIndex = 0;
        this._tryStream(this._streamIndex);
        this.audio.loop = true;
        this.audio.volume = 0.4;
        this._playing = false;
        this.indicator = document.getElementById('musicIndicator');
    }

    _tryStream(index) {
        if (index >= LOFI_STREAMS.length) return;
        this.audio.src = LOFI_STREAMS[index];
        this.audio.onerror = () => {
            this._streamIndex++;
            this._tryStream(this._streamIndex);
        };
    }

    setVolume(vol) {
        this.audio.volume = Math.max(0, Math.min(1, vol / 100));
    }

    play() {
        if (this._playing) return;
        this.audio.play()
            .then(() => {
                this._playing = true;
                this._showIndicator();
            })
            .catch(err => {
                console.warn('Lofi autoplay blocked:', err);
            });
    }

    pause() {
        if (!this._playing) return;
        this.audio.pause();
        this._playing = false;
        this._hideIndicator();
    }

    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this._playing = false;
        this._hideIndicator();
    }

    _showIndicator() {
        if (this.indicator) {
            this.indicator.classList.add('visible');
        }
    }

    _hideIndicator() {
        if (this.indicator) {
            this.indicator.classList.remove('visible');
        }
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
        this.inShort = document.getElementById('settingShort');
        this.inLong = document.getElementById('settingLong');
        this.inSessions = document.getElementById('settingSessions');
        this.inSound = document.getElementById('settingSound');
        this.inVolume = document.getElementById('settingVolume');
        this.volumeLabel = document.getElementById('settingVolumeLabel');
        this.inLofi = document.getElementById('settingLofi');
        this.inLofiVolume = document.getElementById('settingLofiVolume');
        this.lofiVolumeLabel = document.getElementById('settingLofiVolumeLabel');

        // SVG ring
        const r = this.ring.r.baseVal.value;
        this.circumference = 2 * Math.PI * r;
        this.ring.style.strokeDasharray = this.circumference;
        this.ring.style.strokeDashoffset = 0;

        // Lofi player (instantiate but don't play yet)
        this.lofi = new LofiPlayer();
        this.lofi.setVolume(this.settings.lofiVolume);

        this._bindEvents();
        this._applyMuteState();
        this._updateDisplay();
        this._updateDots();
    }

    // ── Modes ──────────────────────────────────────────────────────────────────

    _buildModes() {
        const s = this.settings;
        this.modes = {
            pomodoro: { duration: s.pomodoro * 60, label: 'Focus' },
            short: { duration: s.short * 60, label: 'Short Break' },
            long: { duration: s.long * 60, label: 'Long Break' },
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

        // Live labels for sliders
        this.inVolume.addEventListener('input', () => {
            this.volumeLabel.textContent = `${this.inVolume.value}%`;
        });
        this.inLofiVolume.addEventListener('input', () => {
            this.lofiVolumeLabel.textContent = `${this.inLofiVolume.value}%`;
            // Live preview volume while dragging
            this.lofi.setVolume(parseInt(this.inLofiVolume.value));
        });
    }

    // ── Timer control ──────────────────────────────────────────────────────────

    _toggle() { this.isRunning ? this._pause() : this._start(); }

    _start() {
        this.isRunning = true;
        this.btnStart.textContent = 'Pause';
        this.container.classList.add('running');
        this.interval = setInterval(() => this._tick(), 1000);

        // Resume lofi if we're in a break and it was playing
        if (this._isBreak() && this.settings.lofi) {
            this.lofi.play();
        }
    }

    _pause() {
        this.isRunning = false;
        this.btnStart.textContent = 'Resume';
        this.container.classList.remove('running');
        clearInterval(this.interval);
        this.lofi.pause();
    }

    _reset() {
        clearInterval(this.interval);
        this.isRunning = false;
        this.btnStart.textContent = 'Start';
        this.container.classList.remove('running');
        this.timeLeft = this.totalTime;
        this.lofi.stop();

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
        if (this.settings.sound) playBell(this.settings.volume);
        this.lofi.stop();

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
        this.inPomodoro.value = s.pomodoro;
        this.inShort.value = s.short;
        this.inLong.value = s.long;
        this.inSessions.value = s.sessions;
        this.inSound.checked = s.sound;
        this.inVolume.value = s.volume;
        this.volumeLabel.textContent = `${s.volume}%`;
        this.inLofi.checked = s.lofi;
        this.inLofiVolume.value = s.lofiVolume;
        this.lofiVolumeLabel.textContent = `${s.lofiVolume}%`;
        this.overlay.classList.add('open');
    }

    _closeSettings() {
        // Revert live lofi volume preview to saved value
        this.lofi.setVolume(this.settings.lofiVolume);
        this.overlay.classList.remove('open');
    }

    _saveSettings() {
        const s = {
            pomodoro: Math.max(1, Math.min(90, parseInt(this.inPomodoro.value) || 25)),
            short: Math.max(1, Math.min(30, parseInt(this.inShort.value) || 5)),
            long: Math.max(1, Math.min(60, parseInt(this.inLong.value) || 15)),
            sessions: Math.max(1, Math.min(10, parseInt(this.inSessions.value) || 4)),
            sound: this.inSound.checked,
            volume: parseInt(this.inVolume.value) || 60,
            lofi: this.inLofi.checked,
            lofiVolume: parseInt(this.inLofiVolume.value) || 40,
        };
        this.settings = s;
        saveSettings(s);
        this.lofi.setVolume(s.lofiVolume);
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
