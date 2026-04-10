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
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function loadMusicList() {
    musicList.innerHTML = '';
    
    if (musicFiles.length === 0) {
        musicList.innerHTML = '<li style="padding: 20px; text-align: center; color: rgba(208, 224, 184, 0.5); font-size: 13px;">No music files found</li>';
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
        progressBar.value = currentAudio.currentTime;
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
    const nextIndex = (currentIndex + 1) % musicFiles.length;
    playTrack(nextIndex);
}

function playPrev() {
    const prevIndex = (currentIndex - 1 + musicFiles.length) % musicFiles.length;
    playTrack(prevIndex);
}

function updateUI() {
    const displayName = musicFiles[currentIndex]?.replace('.mp3', '') || 'No track playing';
    nowPlayingName.textContent = displayName;
    
    // Update play/pause button
    const playIcon = btnPlayPause.querySelector('.play-icon');
    const pauseIcon = btnPlayPause.querySelector('.pause-icon');
    if (isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
    
    // Update list items
    document.querySelectorAll('.music-item').forEach((item, idx) => {
        if (idx === currentIndex) {
            item.classList.add('playing');
        } else {
            item.classList.remove('playing');
        }
    });
}

// YouTube URL player
const ytUrlInput = document.getElementById('ytUrlInput');
const btnYtPlay = document.getElementById('btnYtPlay');
const ytContainer = document.getElementById('ytContainer');
const ytFrame = document.getElementById('ytFrame');

function extractYtId(url) {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
}

function loadYoutube() {
    const id = extractYtId(ytUrlInput.value.trim());
    if (!id) return;
    ytFrame.src = `https://www.youtube.com/embed/${id}?autoplay=1`;
    ytContainer.style.display = 'block';
}

btnYtPlay.addEventListener('click', loadYoutube);
ytUrlInput.addEventListener('keydown', e => { if (e.key === 'Enter') loadYoutube(); });


btnNext.addEventListener('click', playNext);
btnPrev.addEventListener('click', playPrev);

progressBar.addEventListener('input', (e) => {
    if (currentAudio) {
        currentAudio.currentTime = e.target.value;
    }
});

volumeSlider.addEventListener('input', (e) => {
    if (currentAudio) {
        currentAudio.volume = e.target.value / 100;
    }
});

btnVolume.addEventListener('click', () => {
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
    }
});

btnRefresh.addEventListener('click', refreshMusicList);

loadMusicFiles();
