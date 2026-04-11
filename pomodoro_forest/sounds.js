/* ============================================================
   Ambient Sound Mixer — Web Audio API synthesis
   8 layered sounds, fully offline capable
   ============================================================ */

class AmbientMixer {
    constructor() {
        this.ctx = null;
        this.activeSounds = {}; // id -> { gain, stopFn }

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

    // ── Sound playback ─────────────────────────────────────────────────────────

    _play(id, volume) {
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
        try { s.gain.disconnect(); } catch (e) {}
        delete this.activeSounds[id];
    }

    setVolume(id, volume) {
        const s = this.activeSounds[id];
        if (!s) return;
        s.gain.gain.setTargetAtTime(Math.max(0.001, volume / 100), this.ctx.currentTime, 0.05);
    }

    // ── RAIN ──────────────────────────────────────────────────────────────────
    _sound_rain(ctx, out) {
        const buf = this._whiteBuffer(ctx, 3);
        const src = this._noiseSrc(ctx, buf);

        const bp1 = ctx.createBiquadFilter();
        bp1.type = 'bandpass';
        bp1.frequency.value = 1000;
        bp1.Q.value = 0.5;

        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 400;

        src.connect(bp1);
        bp1.connect(hp);
        hp.connect(out);
        src.start();

        // Gentle intensity fluctuation
        const buf2 = this._whiteBuffer(ctx, 3);
        const src2 = this._noiseSrc(ctx, buf2);
        const bp2 = ctx.createBiquadFilter();
        bp2.type = 'bandpass';
        bp2.frequency.value = 2500;
        bp2.Q.value = 1.5;
        const g2 = ctx.createGain();
        g2.gain.value = 0.3;
        src2.connect(bp2);
        bp2.connect(g2);
        g2.connect(out);
        src2.start();

        return () => {
            [src, src2].forEach(s => { try { s.stop(); s.disconnect(); } catch (e) {} });
            [bp1, hp, bp2, g2].forEach(n => { try { n.disconnect(); } catch (e) {} });
        };
    }

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

    // ── FIREPLACE ─────────────────────────────────────────────────────────────
    _sound_fire(ctx, out) {
        // Low rumble base
        const buf = this._noiseBuffer(ctx, 5);
        const src = this._noiseSrc(ctx, buf);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 380;
        src.connect(lp);
        lp.connect(out);
        src.start();

        // Crackle layer
        let running = true;
        const crackle = () => {
            if (!running) return;
            const t = ctx.currentTime;
            const delay = 0.05 + Math.random() * 0.6;

            const cLen = Math.floor(ctx.sampleRate * 0.04);
            const cBuf = ctx.createBuffer(1, cLen, ctx.sampleRate);
            const d = cBuf.getChannelData(0);
            for (let i = 0; i < cLen; i++) {
                d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (cLen * 0.3));
            }
            const cSrc = ctx.createBufferSource();
            cSrc.buffer = cBuf;

            const cf = ctx.createBiquadFilter();
            cf.type = 'highpass';
            cf.frequency.value = 1000;

            const cg = ctx.createGain();
            cg.gain.setValueAtTime(0, t + delay);
            cg.gain.linearRampToValueAtTime(0.4 + Math.random() * 0.5, t + delay + 0.004);
            cg.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.04);

            cSrc.connect(cf);
            cf.connect(cg);
            cg.connect(out);
            cSrc.start(t + delay);
            cSrc.stop(t + delay + 0.05);

            setTimeout(crackle, (delay + 0.1 + Math.random() * 0.8) * 1000);
        };
        crackle();

        return () => {
            running = false;
            try { src.stop(); src.disconnect(); } catch (e) {}
            try { lp.disconnect(); } catch (e) {}
        };
    }

    // ── BIRDS ─────────────────────────────────────────────────────────────────
    _sound_birds(ctx, out) {
        let running = true;

        const chirp = () => {
            if (!running) return;
            const t = ctx.currentTime + 0.05 + Math.random() * 2.5;
            const freq = 2000 + Math.random() * 2800;
            const numNotes = 1 + Math.floor(Math.random() * 3);

            for (let n = 0; n < numNotes; n++) {
                const nt = t + n * (0.08 + Math.random() * 0.06);
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq + n * 100, nt);
                osc.frequency.linearRampToValueAtTime(freq * (1.2 + Math.random() * 0.3), nt + 0.05);
                osc.frequency.linearRampToValueAtTime(freq * 0.95, nt + 0.1);

                const env = ctx.createGain();
                env.gain.setValueAtTime(0, nt);
                env.gain.linearRampToValueAtTime(0.04 + Math.random() * 0.04, nt + 0.012);
                env.gain.setValueAtTime(0.04 + Math.random() * 0.04, nt + 0.07);
                env.gain.linearRampToValueAtTime(0, nt + 0.13);

                osc.connect(env);
                env.connect(out);
                osc.start(nt);
                osc.stop(nt + 0.15);
            }

            setTimeout(chirp, (0.5 + Math.random() * 3) * 1000);
        };

        // Multiple birds
        for (let i = 0; i < 4; i++) {
            setTimeout(chirp, Math.random() * 2000);
        }

        // Very soft forest ambience underneath
        const buf = this._whiteBuffer(ctx, 4);
        const src = this._noiseSrc(ctx, buf);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 3000;
        bp.Q.value = 0.3;
        const g = ctx.createGain();
        g.gain.value = 0.04;
        src.connect(bp);
        bp.connect(g);
        g.connect(out);
        src.start();

        return () => {
            running = false;
            try { src.stop(); src.disconnect(); } catch (e) {}
            try { bp.disconnect(); g.disconnect(); } catch (e) {}
        };
    }

    // ── CAFÉ ──────────────────────────────────────────────────────────────────
    _sound_cafe(ctx, out) {
        // Murmur base
        const buf = this._whiteBuffer(ctx, 5);
        const src = this._noiseSrc(ctx, buf);

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 600;
        bp.Q.value = 0.25;

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2800;

        src.connect(bp);
        bp.connect(lp);
        lp.connect(out);
        src.start();

        // Cup clinks / light taps at random intervals
        let running = true;
        const clink = () => {
            if (!running) return;
            const t = ctx.currentTime + 1 + Math.random() * 6;
            const freq = 800 + Math.random() * 1200;
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.4);
            const env = ctx.createGain();
            env.gain.setValueAtTime(0.08, t);
            env.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            osc.connect(env);
            env.connect(out);
            osc.start(t);
            osc.stop(t + 0.5);
            setTimeout(clink, (2 + Math.random() * 8) * 1000);
        };
        clink();

        return () => {
            running = false;
            try { src.stop(); src.disconnect(); } catch (e) {}
            try { bp.disconnect(); lp.disconnect(); } catch (e) {}
        };
    }

    // ── OCEAN ─────────────────────────────────────────────────────────────────
    _sound_ocean(ctx, out) {
        const buf = this._whiteBuffer(ctx, 8);
        const src = this._noiseSrc(ctx, buf);

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 700;

        const waveGain = ctx.createGain();
        waveGain.gain.value = 0.55;

        // Very slow wave oscillation (~0.1 Hz = 10s per wave)
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.09;
        const lfoAmp = ctx.createGain();
        lfoAmp.gain.value = 0.5;

        src.connect(lp);
        lp.connect(waveGain);
        lfo.connect(lfoAmp);
        lfoAmp.connect(waveGain.gain);
        waveGain.connect(out);
        src.start();
        lfo.start();

        // High-frequency surf
        const buf2 = this._whiteBuffer(ctx, 5);
        const src2 = this._noiseSrc(ctx, buf2);
        const bp2 = ctx.createBiquadFilter();
        bp2.type = 'bandpass';
        bp2.frequency.value = 2000;
        bp2.Q.value = 0.4;
        const g2 = ctx.createGain();
        g2.gain.value = 0.12;
        src2.connect(bp2);
        bp2.connect(g2);
        g2.connect(out);
        src2.start();

        return () => {
            [src, src2, lfo].forEach(n => { try { n.stop(); n.disconnect(); } catch (e) {} });
            [lp, waveGain, lfoAmp, bp2, g2].forEach(n => { try { n.disconnect(); } catch (e) {} });
        };
    }

    // ── KEYBOARD ──────────────────────────────────────────────────────────────
    _sound_keyboard(ctx, out) {
        let running = true;

        const key = () => {
            if (!running) return;
            const t = ctx.currentTime;
            const dur = 0.003 + Math.random() * 0.006;
            const cLen = Math.floor(ctx.sampleRate * dur);
            const cBuf = ctx.createBuffer(1, cLen, ctx.sampleRate);
            const d = cBuf.getChannelData(0);
            for (let i = 0; i < cLen; i++) {
                d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (cLen * 0.4));
            }
            const cSrc = ctx.createBufferSource();
            cSrc.buffer = cBuf;

            const hp = ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.value = 1200 + Math.random() * 1500;

            const g = ctx.createGain();
            g.gain.value = 0.18 + Math.random() * 0.15;

            cSrc.connect(hp);
            hp.connect(g);
            g.connect(out);
            cSrc.start(t);
        };

        // Simulate typing bursts
        const burst = () => {
            if (!running) return;
            const keys = 3 + Math.floor(Math.random() * 12);
            for (let k = 0; k < keys; k++) {
                setTimeout(key, k * (40 + Math.random() * 80));
            }
            // Pause between bursts
            const pause = 400 + Math.random() * 2500;
            setTimeout(burst, keys * 80 + pause);
        };
        burst();

        return () => { running = false; };
    }

    // ── THUNDER ───────────────────────────────────────────────────────────────
    _sound_thunder(ctx, out) {
        let running = true;

        const boom = () => {
            if (!running) return;
            const t = ctx.currentTime;

            const buf = this._noiseBuffer(ctx, 5);
            const src = this._noiseSrc(ctx, buf);

            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 90;

            const env = ctx.createGain();
            env.gain.setValueAtTime(0, t);
            env.gain.linearRampToValueAtTime(2.0, t + 0.15);
            env.gain.exponentialRampToValueAtTime(0.001, t + 4.0);

            src.connect(lp);
            lp.connect(env);
            env.connect(out);
            src.start(t);
            src.stop(t + 4.5);

            // Random interval 15–40 seconds
            setTimeout(boom, (15 + Math.random() * 25) * 1000);
        };

        // First thunder after a few seconds
        setTimeout(boom, (3 + Math.random() * 5) * 1000);

        // Subtle rain-like rumble underneath
        const buf2 = this._whiteBuffer(ctx, 4);
        const src2 = this._noiseSrc(ctx, buf2);
        const bp2 = ctx.createBiquadFilter();
        bp2.type = 'bandpass';
        bp2.frequency.value = 900;
        bp2.Q.value = 0.4;
        const g2 = ctx.createGain();
        g2.gain.value = 0.25;
        src2.connect(bp2);
        bp2.connect(g2);
        g2.connect(out);
        src2.start();

        return () => {
            running = false;
            try { src2.stop(); src2.disconnect(); } catch (e) {}
            try { bp2.disconnect(); g2.disconnect(); } catch (e) {}
        };
    }

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
