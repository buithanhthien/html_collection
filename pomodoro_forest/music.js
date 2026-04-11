const MUSIC_FILES = [];

// Music player
const musicList = document.getElementById('musicList');
const musicPlayer = document.getElementById('musicPlayer');
const nowPlayingName = document.getElementById('nowPlayingName');
const progressBar = document.getElementById('progressBar');
const timeCurrent = document.getElementById('timeCurrent');
const timeTotal = document.getElementById('timeTotal');
const btnPlayPause = document.getElementById('btnPlayPause');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const btnVolume = document.getElementById('btnVolume');
const volumeSlider = document.getElementById('volumeSlider');
const btnRefresh = document.getElementById('btnRefresh');

let musicFiles = MUSIC_FILES;
let currentAudio = null;
let currentIndex = -1;
let isPlaying = false;
/** When true, `timeupdate` must not overwrite the progress slider (user is dragging). */
let isProgressScrubbing = false;

/** Hidden YouTube IFrame API player (audio only in UI — no visible video). */
let ytMusicPlayer = null;
let ytMusicMount = null;
let ytProgressTimer = null;
let ytApiPromise = null;

function stopYoutubeMusic() {
    if (ytProgressTimer) {
        clearInterval(ytProgressTimer);
        ytProgressTimer = null;
    }
    if (ytMusicPlayer) {
        try {
            ytMusicPlayer.destroy();
        } catch (e) {}
        ytMusicPlayer = null;
    }
    if (ytMusicMount && ytMusicMount.parentNode) {
        ytMusicMount.remove();
    }
    ytMusicMount = null;
}

function ensureYouTubeIframeAPI() {
    if (ytApiPromise) return ytApiPromise;
    ytApiPromise = new Promise((resolve) => {
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
    return ytApiPromise;
}

function startYoutubeProgressTick() {
    if (ytProgressTimer) {
        clearInterval(ytProgressTimer);
        ytProgressTimer = null;
    }
    ytProgressTimer = setInterval(() => {
        if (!ytMusicPlayer || typeof ytMusicPlayer.getCurrentTime !== 'function') return;
        const cur = ytMusicPlayer.getCurrentTime();
        const dur = ytMusicPlayer.getDuration();
        if (dur && !Number.isNaN(dur)) {
            progressBar.max = dur;
            timeTotal.textContent = formatTime(dur);
        }
        if (!isProgressScrubbing) {
            progressBar.value = cur;
        }
        timeCurrent.textContent = formatTime(cur);
    }, 250);
}

// Refresh music list
async function refreshMusicList() {
    btnRefresh.classList.add('spinning');

    try {
        const response = await fetch('music-list.json?t=' + Date.now());
        if (response.ok) {
            musicFiles = await response.json();
            loadMusicList();
        }
    } catch (error) {
        console.error('Could not refresh:', error);
    }

    setTimeout(() => btnRefresh.classList.remove('spinning'), 600);
}

// Load music files
async function loadMusicFiles() {
    try {
        const response = await fetch('music-list.json');
        if (response.ok) {
            musicFiles = await response.json();
        }
    } catch (error) {
        console.error('Could not load music list:', error);
    }
    loadMusicList();
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function loadMusicList() {
    musicList.innerHTML = '';

    if (musicFiles.length === 0) {
        musicList.innerHTML =
            '<li style="padding: 20px; text-align: center; color: rgba(208, 224, 184, 0.5); font-size: 13px;">No music files found</li>';
        return;
    }

    musicFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'music-item';
        li.dataset.index = index;

        const displayName = file.replace('.mp3', '');

        li.innerHTML = `
            <span class="music-name" title="${displayName}">${displayName}</span>
        `;

        li.addEventListener('click', () => playTrack(index));
        musicList.appendChild(li);
    });
}

function playTrack(index) {
    stopYoutubeMusic();

    if (currentAudio && currentIndex === index) {
        togglePlayPause();
        return;
    }

    if (currentAudio) {
        currentAudio.pause();
    }

    currentIndex = index;
    const file = musicFiles[index];
    currentAudio = new Audio(`asset/sound/${file}`);
    currentAudio.volume = volumeSlider.value / 100;

    currentAudio.addEventListener('loadedmetadata', () => {
        timeTotal.textContent = formatTime(currentAudio.duration);
        progressBar.max = currentAudio.duration;
    });

    currentAudio.addEventListener('timeupdate', () => {
        if (!isProgressScrubbing) {
            progressBar.value = currentAudio.currentTime;
        }
        timeCurrent.textContent = formatTime(currentAudio.currentTime);
    });

    currentAudio.addEventListener('ended', () => {
        playNext();
    });

    currentAudio.play();
    isPlaying = true;
    updateUI();
    musicPlayer.style.display = 'flex';
}

function togglePlayPause() {
    if (ytMusicPlayer) {
        if (isPlaying) {
            ytMusicPlayer.pauseVideo();
            isPlaying = false;
        } else {
            ytMusicPlayer.playVideo();
            isPlaying = true;
        }
        updateUI();
        return;
    }
    if (!currentAudio) return;

    if (isPlaying) {
        currentAudio.pause();
        isPlaying = false;
    } else {
        currentAudio.play();
        isPlaying = true;
    }
    updateUI();
}

function playNext() {
    if (musicFiles.length === 0) return;
    const nextIndex = (currentIndex + 1) % musicFiles.length;
    playTrack(nextIndex);
}

function playPrev() {
    if (musicFiles.length === 0) return;
    const prevIndex = (currentIndex - 1 + musicFiles.length) % musicFiles.length;
    playTrack(prevIndex);
}

function updateUI() {
    if (ytMusicPlayer) {
        document.querySelectorAll('.music-item').forEach((item) => item.classList.remove('playing'));
    } else {
        const displayName = musicFiles[currentIndex]?.replace('.mp3', '') || 'No track playing';
        nowPlayingName.textContent = displayName;

        document.querySelectorAll('.music-item').forEach((item, idx) => {
            if (idx === currentIndex) {
                item.classList.add('playing');
            } else {
                item.classList.remove('playing');
            }
        });
    }

    const playIcon = btnPlayPause.querySelector('.play-icon');
    const pauseIcon = btnPlayPause.querySelector('.pause-icon');
    if (isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
}

// YouTube URL — hidden player (audio in your controls; no visible video in the widget)
const ytUrlInput = document.getElementById('ytUrlInput');
const btnYtPlay = document.getElementById('btnYtPlay');

function extractYtId(url) {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
}

function loadYoutube() {
    const id = extractYtId(ytUrlInput.value.trim());
    if (!id) return;

    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    stopYoutubeMusic();

    currentIndex = -1;

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
            playerVars: {
                autoplay: 1,
                playsinline: 1,
            },
            events: {
                onReady: (e) => {
                    e.target.setVolume(Number(volumeSlider.value));
                    e.target.playVideo();
                    isPlaying = true;

                    let title = 'YouTube';
                    try {
                        const d = e.target.getVideoData();
                        if (d && d.title) title = d.title;
                    } catch (err) {}
                    nowPlayingName.textContent = title;

                    const dur = e.target.getDuration();
                    if (dur && !Number.isNaN(dur)) {
                        progressBar.max = dur;
                        timeTotal.textContent = formatTime(dur);
                    }

                    musicPlayer.style.display = 'flex';
                    startYoutubeProgressTick();
                    updateUI();
                },
                onStateChange: (e) => {
                    const YTref = window.YT;
                    if (!YTref) return;
                    if (e.data === YTref.PlayerState.ENDED) {
                        isPlaying = false;
                        if (ytProgressTimer) {
                            clearInterval(ytProgressTimer);
                            ytProgressTimer = null;
                        }
                        updateUI();
                    } else if (e.data === YTref.PlayerState.PLAYING) {
                        isPlaying = true;
                        startYoutubeProgressTick();
                        updateUI();
                    } else if (e.data === YTref.PlayerState.PAUSED) {
                        isPlaying = false;
                        updateUI();
                    }
                },
            },
        });
    });
}

btnYtPlay.addEventListener('click', loadYoutube);
ytUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadYoutube();
});

btnNext.addEventListener('click', playNext);
btnPrev.addEventListener('click', playPrev);
btnPlayPause.addEventListener('click', togglePlayPause);

progressBar.addEventListener('pointerdown', () => {
    isProgressScrubbing = true;
});
window.addEventListener('pointerup', () => {
    isProgressScrubbing = false;
});
window.addEventListener('pointercancel', () => {
    isProgressScrubbing = false;
});

progressBar.addEventListener('input', (e) => {
    const t = Number(e.target.value);
    if (currentAudio) {
        currentAudio.currentTime = t;
    } else if (ytMusicPlayer && typeof ytMusicPlayer.seekTo === 'function') {
        ytMusicPlayer.seekTo(t, true);
    }
    timeCurrent.textContent = formatTime(t);
});

volumeSlider.addEventListener('input', (e) => {
    const v = Number(e.target.value) / 100;
    if (currentAudio) {
        currentAudio.volume = v;
    }
    if (ytMusicPlayer && typeof ytMusicPlayer.setVolume === 'function') {
        ytMusicPlayer.setVolume(Number(e.target.value));
    }
});

btnVolume.addEventListener('click', () => {
    const volVal = Number(volumeSlider.value);
    if (currentAudio) {
        if (currentAudio.volume > 0) {
            currentAudio.volume = 0;
            volumeSlider.value = 0;
            btnVolume.querySelector('.volume-icon').style.display = 'none';
            btnVolume.querySelector('.mute-icon').style.display = 'block';
        } else {
            currentAudio.volume = 0.5;
            volumeSlider.value = 50;
            btnVolume.querySelector('.volume-icon').style.display = 'block';
            btnVolume.querySelector('.mute-icon').style.display = 'none';
        }
        return;
    }
    if (ytMusicPlayer && typeof ytMusicPlayer.setVolume === 'function') {
        if (volVal > 0) {
            ytMusicPlayer.setVolume(0);
            volumeSlider.value = 0;
            btnVolume.querySelector('.volume-icon').style.display = 'none';
            btnVolume.querySelector('.mute-icon').style.display = 'block';
        } else {
            ytMusicPlayer.setVolume(50);
            volumeSlider.value = 50;
            btnVolume.querySelector('.volume-icon').style.display = 'block';
            btnVolume.querySelector('.mute-icon').style.display = 'none';
        }
    }
});

btnRefresh.addEventListener('click', refreshMusicList);

loadMusicFiles();
