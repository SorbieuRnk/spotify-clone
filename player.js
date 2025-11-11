// === Music Player Class ===
class MusicPlayer {
    constructor() {
        this.audio = new Audio();
        this.songs = [];
        this.currentFolder = '';
        this.isPlaying = false;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Update progress bar
        this.audio.addEventListener('timeupdate', () => {
            const circle = document.querySelector('.circle');
            if (circle && this.audio.duration) {
                circle.style.left = `${(this.audio.currentTime / this.audio.duration) * 100}%`;
            }
            this.updateTimeDisplay();
        });

        // Play next song automatically
        this.audio.addEventListener('ended', () => this.playNext());
    }

    formatTime(seconds) {
        if (isNaN(seconds) || seconds <= 0) return "00:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    updateTimeDisplay() {
        const el = document.querySelector('.songtime');
        if (el) el.textContent = `${this.formatTime(this.audio.currentTime)} / ${this.formatTime(this.audio.duration)}`;
    }

    async loadSongs(folder) {
        try {
            this.currentFolder = folder;
            const res = await fetch(`${folder}/info.json`);
            const data = await res.json();
            this.songs = data.songs || [];
            this.updateSongList();
            return this.songs;
        } catch (err) {
            console.error(`Error loading songs from ${folder}:`, err);
            return [];
        }
    }

    updateSongList() {
        const ul = document.querySelector('.songlist ul');
        if (!ul) return;
        ul.innerHTML = this.songs.map(song => `
            <li data-src="${song}">
                <img class="invert" src="music.svg" alt="">
                <div class="info">
                    <div>${song.replace('.mp3', '')}</div>
                    <div>-artist</div>
                </div>
                <div class="playnow"><img class="invert" src="playsong.svg" alt=""></div>
            </li>
        `).join('');

        this.attachSongClickListeners();
    }

    attachSongClickListeners() {
        document.querySelectorAll('.songlist li').forEach(li => {
            li.addEventListener('click', () => {
                const src = li.dataset.src;
                this.playSong(src);
            });
        });
    }

    async playSong(track, pause = false) {
        if (!track) return;
        this.audio.src = `${this.currentFolder}/${track}`;
        const songName = decodeURIComponent(track.replace('.mp3', ''));
        const songInfo = document.querySelector('.songinfo');
        if (songInfo) songInfo.textContent = songName;
        if (!pause) {
            await this.audio.play();
            this.isPlaying = true;
        }
        this.updatePlayButton();
    }

    togglePlay() {
        if (this.audio.paused) {
            this.audio.play();
            this.isPlaying = true;
        } else {
            this.audio.pause();
            this.isPlaying = false;
        }
        this.updatePlayButton();
    }

    updatePlayButton() {
        const playBtn = document.getElementById('play');
        if (playBtn) playBtn.src = this.isPlaying ? "pausesong.svg" : "playsong.svg";
    }

    seek(e, seekbar) {
        const percent = e.offsetX / seekbar.offsetWidth;
        this.audio.currentTime = percent * this.audio.duration;
    }

   findCurrentIndex() {
    if (!this.audio.src) return -1;

    // Extract just the filename from the audio source
    const current = decodeURIComponent(this.audio.src.split('/').pop() || '');
    return this.songs.findIndex(song => {
        const songName = decodeURIComponent(song.split('/').pop() || '');
        return songName === current;
    });
}


    playNext() {
    const i = this.findCurrentIndex();
    if (i === -1 && this.songs.length > 0) {
        // nothing playing yet → start first song
        this.playSong(this.songs[0]);
        return;
    }

    if (i < this.songs.length - 1) {
        this.playSong(this.songs[i + 1]);
    } else {
        console.log("🔚 Already at last song");
    }
}

playPrevious() {
    const i = this.findCurrentIndex();
    if (i === -1 && this.songs.length > 0) {
        // nothing playing yet → start last song
        this.playSong(this.songs[this.songs.length - 1]);
        return;
    }

    if (i > 0) {
        this.playSong(this.songs[i - 1]);
    } else {
        console.log("🔙 Already at first song");
    }
}

}

// === Initialize everything ===
document.addEventListener('DOMContentLoaded', async () => {
    const player = new MusicPlayer();

    const playBtn = document.getElementById('play');
    const seekbar = document.querySelector('.seekbar');
    const nextBtn = document.getElementById('next');
    const prevBtn = document.getElementById('previous');

    if (playBtn) playBtn.addEventListener('click', () => player.togglePlay());
    if (seekbar) seekbar.addEventListener('click', e => player.seek(e, seekbar));
    if (nextBtn) nextBtn.addEventListener('click', () => player.playNext());
    if (prevBtn) prevBtn.addEventListener('click', () => player.playPrevious());

    // === Load playlist cards dynamically ===
    const cardContainer = document.querySelector('.cardcontainer');
    const songsRoot = 'songs';

    try {
        const res = await fetch(`${songsRoot}/`);
        const text = await res.text();
        const div = document.createElement('div');
        div.innerHTML = text;
        const links = Array.from(div.getElementsByTagName('a'))
            .filter(a => !a.href.endsWith('.mp3') && !a.href.includes('.json') && !a.href.includes('.jpg'));

            // === Build cards from each playlist folder ===
    for (const link of links) {
        // Get the folder name safely (convert backslashes to slashes)
        const folder = decodeURIComponent(
            link.href.split('/').slice(-2, -1)[0]
        ).replace(/\\/g, '/');

        // Clean up the path (remove duplicate slashes)
        const infoPath = `${songsRoot}/${folder}/info.json`.replace(/\/\/+/g, '/');

        try {
            const infoRes = await fetch(infoPath);
            if (!infoRes.ok) throw new Error('info.json not found');
            const info = await infoRes.json();

            // Create the card dynamically
            const cardHTML = `
                <div class="card" data-folder="${folder}">
                    <div class="play"><img src="hoverplay.svg" alt=""></div>
                    <img src="${songsRoot}/${folder}/cover.jpg" alt="">
                    <h2>${info.title}</h2>
                    <p>${info.description}</p>
                </div>`;
            cardContainer.insertAdjacentHTML('beforeend', cardHTML);
        } catch (err) {
            console.warn(`Skipping ${infoPath}: no info.json`);
        }
    }

    // === Card click handler ===
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', async () => {
            const folder = `${songsRoot}/${card.dataset.folder}`;
            const songs = await player.loadSongs(folder);
            if (songs.length) player.playSong(songs[0], true);
        });
    });

    } catch (err) {
        console.error("Error fetching playlists:", err);
    }

    // === Initial load (optional default) ===
    await player.loadSongs("songs/aashiqui 2 songs");
    if (player.songs.length) player.playSong(player.songs[0], true);
});
