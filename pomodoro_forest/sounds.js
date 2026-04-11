/* ============================================================
   Ambient Sound Mixer — Web Audio API synthesis
   Rain, Birds, Fireplace, Café, Ocean, Keyboard & Thunder use YouTube (IFrame API); Wind is synthetic.
   ============================================================ */

const RAIN_YOUTUBE_VIDEO_ID = 'q76bMs-NwRk';
/** Start time from URL &t=5339s — https://www.youtube.com/watch?v=q76bMs-NwRk&t=5339s */
const RAIN_YOUTUBE_START_SECONDS = 5339;

const CAFE_YOUTUBE_VIDEO_ID = 'h2zkV-l_TbY';
const OCEAN_YOUTUBE_VIDEO_ID = 'vPhg6sc1Mk4';
const KEYBOARD_YOUTUBE_VIDEO_ID = 'U7Y50T7NKyw';
const FIREPLACE_YOUTUBE_VIDEO_ID = '2wYtJwDkKIk';
const THUNDER_YOUTUBE_VIDEO_ID = '27RA4HwAa4U';
const BIRDS_YOUTUBE_VIDEO_ID = 'qzZyaD3GPIc';

class AmbientMixer {
    constructor() {
        this.ctx = null;
        this._ytApiPromise = null;
        this.activeSounds = {}; // id -> { gain, stopFn, kind?, rec? }

        this.soundDefs = [
            { id: 'rain',     label: 'Rain',      icon: '🌧' },
            { id: 'wind',     label: 'Wind',      icon: '🌬' },
            { id: 'fire',     label: 'Fireplace', icon: '🔥' },
            { id: 'birds',    label: 'Birds',     icon: '🐦' },
            { id: 'cafe',     label: 'Café',      icon: '☕' },
            { id: 'ocean',    label: 'Ocean',     icon: '🌊' },
            { id: 'keyboard', label: 'Keyboard',  icon: '⌨️' },
            { id: 'thunder',  label: 'Thunder',   icon: '⛈' },
        ];

        this._buildUI();
    }

    // ── Context ────────────────────────────────────────────────────────────────

    _getCtx() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
    }

    // ── Noise helpers ──────────────────────────────────────────────────────────

    _noiseBuffer(ctx, seconds = 4) {
        const len = Math.floor(ctx.sampleRate * seconds);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        // Brown-ish noise (smoother than white)
        let last = 0;
        for (let i = 0; i < len; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (last + 0.02 * white) / 1.02;
            last = data[i];
            data[i] *= 3.5;
        }
        return buf;
    }

    _whiteBuffer(ctx, seconds = 4) {
        const len = Math.floor(ctx.sampleRate * seconds);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        return buf;
    }

    _noiseSrc(ctx, buf) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        return src;
    }

    // ── YouTube (Rain, Birds, Fireplace, Café, Ocean, Keyboard, Thunder) ─────

    _ensureYouTubeIframeAPI() {
        if (this._ytApiPromise) return this._ytApiPromise;
        this._ytApiPromise = new Promise((resolve) => {
            if (window.YT && window.YT.Player) {
                resolve();
                return;
            }
            const prior = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                if (typeof prior === 'function') prior();
                resolve();
            };
            if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                document.head.appendChild(tag);
            }
        });
        return this._ytApiPromise;
    }

    /**
     * @param {string} soundId - e.g. 'rain' | 'birds' | 'fire' | 'cafe' | 'ocean' | 'keyboard' | 'thunder'
     * @param {string} videoId - YouTube video id
     * @param {string} hostElementId - stable id for off-screen host div
     * @param {{ startSeconds?: number }} [opts]
     */
    _playYouTubeAmbient(soundId, videoId, hostElementId, volume, opts = {}) {
        const startSeconds = Math.max(0, Math.floor(opts.startSeconds || 0));
        const rec = {
            cancelled: false,
            player: null,
            mount: null,
            pendingVolume: volume,
        };
        rec.stopFn = () => {
            rec.cancelled = true;
            try {
                if (rec.player && typeof rec.player.destroy === 'function') rec.player.destroy();
            } catch (e) {}
            rec.player = null;
            try {
                if (rec.mount && rec.mount.parentNode) rec.mount.remove();
            } catch (e) {}
            rec.mount = null;
        };

        this.activeSounds[soundId] = { kind: 'yt', gain: null, stopFn: rec.stopFn, rec };

        this._ensureYouTubeIframeAPI().then(() => {
            if (rec.cancelled) return;

            let host = document.getElementById(hostElementId);
            if (!host) {
                host = document.createElement('div');
                host.id = hostElementId;
                host.setAttribute('aria-hidden', 'true');
                host.style.cssText =
                    'position:fixed;left:-9999px;width:320px;height:180px;overflow:hidden;pointer-events:none;opacity:0.01;';
                document.body.appendChild(host);
            }

            const div = document.createElement('div');
            const uid = 'ambient-' + soundId + '-yt-' + Date.now();
            div.id = uid;
            host.appendChild(div);
            rec.mount = div;

            const playerVars = {
                autoplay: 1,
                loop: 1,
                playlist: videoId,
                playsinline: 1,
            };
            if (startSeconds > 0) playerVars.start = startSeconds;

            rec.player = new YT.Player(uid, {
                videoId,
                playerVars,
                events: {
                    onReady: (e) => {
                        if (rec.cancelled) return;
                        e.target.setVolume(Math.round(rec.pendingVolume));
                        if (startSeconds > 0) e.target.seekTo(startSeconds, true);
                        e.target.playVideo();
                    },
                    onStateChange: (e) => {
                        if (rec.cancelled || startSeconds <= 0) return;
                        const ENDED = window.YT?.PlayerState?.ENDED ?? 0;
                        if (e.data === ENDED) {
                            e.target.seekTo(startSeconds, true);
                            e.target.playVideo();
                        }
                    },
                },
            });
        });
    }

    // ── Sound playback ─────────────────────────────────────────────────────────

    _play(id, volume) {
        if (id === 'rain') {
            this._playYouTubeAmbient('rain', RAIN_YOUTUBE_VIDEO_ID, 'ambient-rain-yt-host', volume, {
                startSeconds: RAIN_YOUTUBE_START_SECONDS,
            });
            return;
        }
        if (id === 'birds') {
            this._playYouTubeAmbient('birds', BIRDS_YOUTUBE_VIDEO_ID, 'ambient-birds-yt-host', volume);
            return;
        }
        if (id === 'fire') {
            this._playYouTubeAmbient('fire', FIREPLACE_YOUTUBE_VIDEO_ID, 'ambient-fire-yt-host', volume);
            return;
        }
        if (id === 'cafe') {
            this._playYouTubeAmbient('cafe', CAFE_YOUTUBE_VIDEO_ID, 'ambient-cafe-yt-host', volume);
            return;
        }
        if (id === 'ocean') {
            this._playYouTubeAmbient('ocean', OCEAN_YOUTUBE_VIDEO_ID, 'ambient-ocean-yt-host', volume);
            return;
        }
        if (id === 'keyboard') {
            this._playYouTubeAmbient(
                'keyboard',
                KEYBOARD_YOUTUBE_VIDEO_ID,
                'ambient-keyboard-yt-host',
                volume
            );
            return;
        }
        if (id === 'thunder') {
            this._playYouTubeAmbient('thunder', THUNDER_YOUTUBE_VIDEO_ID, 'ambient-thunder-yt-host', volume);
            return;
        }

        const ctx = this._getCtx();
        const gain = ctx.createGain();
        gain.gain.value = Math.max(0.001, volume / 100);
        gain.connect(ctx.destination);

        const method = `_sound_${id}`;
        const stopFn = this[method] ? this[method].call(this, ctx, gain) : null;
        this.activeSounds[id] = { gain, stopFn };
    }

    _stop(id) {
        const s = this.activeSounds[id];
        if (!s) return;
        if (s.stopFn) s.stopFn();
        try {
            if (s.gain) s.gain.disconnect();
        } catch (e) {}
        delete this.activeSounds[id];
    }

    setVolume(id, volume) {
        const s = this.activeSounds[id];
        if (!s) return;
        if (s.kind === 'yt' && s.rec) {
            s.rec.pendingVolume = volume;
            try {
                if (s.rec.player && typeof s.rec.player.setVolume === 'function') {
                    s.rec.player.setVolume(Math.round(volume));
                }
            } catch (e) {}
            return;
        }
        s.gain.gain.setTargetAtTime(Math.max(0.001, volume / 100), this.ctx.currentTime, 0.05);
    }

    // ── RAIN: YouTube — see _playYouTubeAmbient() ─────────────────────────────

    // ── WIND ──────────────────────────────────────────────────────────────────
    _sound_wind(ctx, out) {
        const buf = this._whiteBuffer(ctx, 6);
        const src = this._noiseSrc(ctx, buf);

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 350;
        lp.Q.value = 0.4;

        const innerGain = ctx.createGain();
        innerGain.gain.value = 0.6;

        // LFO — howling wind
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.25;
        const lfoAmp = ctx.createGain();
        lfoAmp.gain.value = 0.45;

        src.connect(lp);
        lp.connect(innerGain);
        lfo.connect(lfoAmp);
        lfoAmp.connect(innerGain.gain);
        innerGain.connect(out);

        src.start();
        lfo.start();

        // Second layer — higher whistle
        const buf2 = this._whiteBuffer(ctx, 4);
        const src2 = this._noiseSrc(ctx, buf2);
        const bp2 = ctx.createBiquadFilter();
        bp2.type = 'bandpass';
        bp2.frequency.value = 900;
        bp2.Q.value = 2;
        const g2 = ctx.createGain();
        g2.gain.value = 0.18;
        src2.connect(bp2);
        bp2.connect(g2);
        g2.connect(out);
        src2.start();

        return () => {
            [src, src2, lfo].forEach(n => { try { n.stop(); n.disconnect(); } catch (e) {} });
            [lp, innerGain, lfoAmp, bp2, g2].forEach(n => { try { n.disconnect(); } catch (e) {} });
        };
    }

    // ── FIREPLACE: YouTube — see _playYouTubeAmbient() ───────────────────────

    // ── BIRDS: YouTube — see _playYouTubeAmbient() ───────────────────────────

    // ── RAIN / BIRDS / FIREPLACE / CAFÉ / OCEAN / KEYBOARD / THUNDER: YouTube — _playYouTubeAmbient()

    // ── UI builder ────────────────────────────────────────────────────────────

    _buildUI() {
        const container = document.getElementById('soundsList');
        if (!container) return;

        this.soundDefs.forEach(def => {
            const row = document.createElement('div');
            row.className = 'sound-row';
            row.id = `sound-row-${def.id}`;

            const defaultVol = 60;
            row.innerHTML = `
                <span class="sound-icon">${def.icon}</span>
                <span class="sound-name">${def.label}</span>
                <div class="sound-controls">
                    <div class="sound-toggle-pill" id="sound-pill-${def.id}" title="Toggle ${def.label}"></div>
                    <input type="range" class="sound-slider" id="sound-slider-${def.id}"
                           min="0" max="100" value="${defaultVol}" title="${def.label} volume">
                </div>
            `;

            const pill = row.querySelector('.sound-toggle-pill');
            const slider = row.querySelector('.sound-slider');

            // Click row (but not slider) to toggle
            row.addEventListener('click', (e) => {
                if (e.target === slider || e.target.closest('input')) return;
                this._toggle(def.id, row, pill, slider);
            });

            // Volume while active
            slider.addEventListener('input', (e) => {
                e.stopPropagation();
                if (row.classList.contains('active')) {
                    this.setVolume(def.id, parseInt(slider.value));
                }
            });

            // Prevent slider click from toggling
            slider.addEventListener('mousedown', e => e.stopPropagation());
            slider.addEventListener('click', e => e.stopPropagation());

            container.appendChild(row);
        });
    }

    _toggle(id, row, pill, slider) {
        const isActive = row.classList.toggle('active');
        if (isActive) {
            this._play(id, parseInt(slider.value));
        } else {
            this._stop(id);
        }
    }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    window.ambientMixer = new AmbientMixer();
});
