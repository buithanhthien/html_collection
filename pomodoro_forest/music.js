/* ============================================================
   music.js — YouTube URL player only
   ============================================================ */

const musicPlayer   = document.getElementById('musicPlayer');
const nowPlayingName = document.getElementById('nowPlayingName');
const progressBar   = document.getElementById('progressBar');
const timeCurrent   = document.getElementById('timeCurrent');
const timeTotal     = document.getElementById('timeTotal');
const btnPlayPause  = document.getElementById('btnPlayPause');
const btnVolume     = document.getElementById('btnVolume');
const volumeSlider  = document.getElementById('volumeSlider');
const ytUrlInput    = document.getElementById('ytUrlInput');
const btnYtPlay     = document.getElementById('btnYtPlay');

let isPlaying = false;
let isProgressScrubbing = false;
let ytMusicPlayer = null;
let ytMusicMount  = null;
let ytProgressTimer = null;
let ytApiPromise  = null;

// ── Helpers ────────────────────────────────────────────────

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function extractYtId(url) {
    const m = String(url).match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
}

function ensureYouTubeIframeAPI() {
    if (ytApiPromise) return ytApiPromise;
    ytApiPromise = new Promise((resolve) => {
        if (window.YT && window.YT.Player) { resolve(); return; }
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
    return ytApiPromise;
}

function stopYoutubeMusic() {
    if (ytProgressTimer) { clearInterval(ytProgressTimer); ytProgressTimer = null; }
    if (ytMusicPlayer) {
        try { ytMusicPlayer.destroy(); } catch (e) {}
        ytMusicPlayer = null;
    }
    if (ytMusicMount && ytMusicMount.parentNode) { ytMusicMount.remove(); ytMusicMount = null; }
}

function startYoutubeProgressTick() {
    if (ytProgressTimer) { clearInterval(ytProgressTimer); ytProgressTimer = null; }
    ytProgressTimer = setInterval(() => {
        if (!ytMusicPlayer || typeof ytMusicPlayer.getCurrentTime !== 'function') return;
        const cur = ytMusicPlayer.getCurrentTime();
        const dur = ytMusicPlayer.getDuration();
        if (dur && !Number.isNaN(dur)) {
            progressBar.max = dur;
            timeTotal.textContent = formatTime(dur);
        }
        if (!isProgressScrubbing) progressBar.value = cur;
        timeCurrent.textContent = formatTime(cur);
    }, 250);
}

function updatePlayPauseUI() {
    const playIcon  = btnPlayPause.querySelector('.play-icon');
    const pauseIcon = btnPlayPause.querySelector('.pause-icon');
    playIcon.style.display  = isPlaying ? 'none'  : 'block';
    pauseIcon.style.display = isPlaying ? 'block' : 'none';
}

// ── Load YouTube video ─────────────────────────────────────

function loadYoutube() {
    const id = extractYtId(ytUrlInput.value.trim());
    if (!id) return;

    stopYoutubeMusic();

    ensureYouTubeIframeAPI().then(() => {
        let host = document.getElementById('music-yt-audio-host');
        if (!host) {
            host = document.createElement('div');
            host.id = 'music-yt-audio-host';
            host.setAttribute('aria-hidden', 'true');
            host.style.cssText =
                'position:fixed;left:-9999px;width:200px;height:112px;overflow:hidden;pointer-events:none;opacity:0.01;';
            document.body.appendChild(host);
        }

        ytMusicMount = document.createElement('div');
        const uid = 'music-yt-player-' + Date.now();
        ytMusicMount.id = uid;
        host.appendChild(ytMusicMount);

        ytMusicPlayer = new YT.Player(uid, {
            videoId: id,
            playerVars: { autoplay: 1, playsinline: 1 },
            events: {
                onReady: (e) => {
                    e.target.setVolume(Number(volumeSlider.value));
                    e.target.playVideo();
                    isPlaying = true;

                    let title = 'YouTube';
                    try { const d = e.target.getVideoData(); if (d && d.title) title = d.title; } catch (_) {}
                    nowPlayingName.textContent = title;

                    const dur = e.target.getDuration();
                    if (dur && !Number.isNaN(dur)) {
                        progressBar.max = dur;
                        timeTotal.textContent = formatTime(dur);
                    }

                    musicPlayer.style.display = 'flex';
                    startYoutubeProgressTick();
                    updatePlayPauseUI();
                },
                onStateChange: (e) => {
                    const YTref = window.YT;
                    if (!YTref) return;
                    if (e.data === YTref.PlayerState.ENDED) {
                        isPlaying = false;
                        if (ytProgressTimer) { clearInterval(ytProgressTimer); ytProgressTimer = null; }
                    } else if (e.data === YTref.PlayerState.PLAYING) {
                        isPlaying = true;
                        startYoutubeProgressTick();
                    } else if (e.data === YTref.PlayerState.PAUSED) {
                        isPlaying = false;
                    }
                    updatePlayPauseUI();
                },
            },
        });
    });
}

// ── Controls ───────────────────────────────────────────────

btnYtPlay.addEventListener('click', loadYoutube);
ytUrlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadYoutube(); });

btnPlayPause.addEventListener('click', () => {
    if (!ytMusicPlayer) return;
    if (isPlaying) { ytMusicPlayer.pauseVideo(); isPlaying = false; }
    else           { ytMusicPlayer.playVideo();  isPlaying = true;  }
    updatePlayPauseUI();
});

progressBar.addEventListener('pointerdown', () => { isProgressScrubbing = true; });
window.addEventListener('pointerup',     () => { isProgressScrubbing = false; });
window.addEventListener('pointercancel', () => { isProgressScrubbing = false; });
window.addEventListener('blur',          () => { isProgressScrubbing = false; });

progressBar.addEventListener('input', (e) => {
    const t = Number(e.target.value);
    if (ytMusicPlayer && typeof ytMusicPlayer.seekTo === 'function') ytMusicPlayer.seekTo(t, true);
    timeCurrent.textContent = formatTime(t);
});

volumeSlider.addEventListener('input', (e) => {
    if (ytMusicPlayer && typeof ytMusicPlayer.setVolume === 'function')
        ytMusicPlayer.setVolume(Number(e.target.value));
});

btnVolume.addEventListener('click', () => {
    if (!ytMusicPlayer || typeof ytMusicPlayer.setVolume !== 'function') return;
    const vol = Number(volumeSlider.value);
    const muting = vol > 0;
    ytMusicPlayer.setVolume(muting ? 0 : 50);
    volumeSlider.value = muting ? 0 : 50;
    btnVolume.querySelector('.volume-icon').style.display = muting ? 'none'  : 'block';
    btnVolume.querySelector('.mute-icon').style.display   = muting ? 'block' : 'none';
});
