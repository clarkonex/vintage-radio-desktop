// ===== VINTAGE RADIO DESKTOP =====

// ===== DEFAULT STATIONS =====
const DEFAULT_STATIONS = [
  // JAZZ
  { name: "Jazz Underground", url: "https://icecast.walmradio.com:8443/jazz" },
  { name: "Swiss Jazz", url: "http://stream.srg-ssr.ch/m/rsj/mp3_128" },
  { name: "Classic Jazz", url: "http://jazz-wr01.ice.infomaniak.ch/jazz-wr01-128.mp3" },
  { name: "Instrumental Jazz", url: "https://jfm1.hostingradio.ru:14536/ijstream.mp3" },
  { name: "Jazz Lounge Bar", url: "https://cast1.torontocast.com:4640/stream" },
  { name: "Jazz Sakura", url: "http://kathy.torontocast.com:3330/stream/1/" },
  { name: "Jazz London", url: "http://radio.canstream.co.uk:8075/live.mp3" },
  { name: "Jazz Berlin", url: "https://streaming.radio.co/s774887f7b/listen" },
  { name: "Jazz Groove-East", url: "http://east-mp3-128.streamthejazzgroove.com/stream" },
  { name: "Tropical Jazz", url: "https://servidor32-3.brlogic.com:8230/live" },
  { name: "WDCB Chicago", url: "http://wdcb-ice.streamguys.org/wdcb128" },
  { name: "Cool Jazz Florida", url: "http://162.244.80.20:6948/" },
  { name: "Radio Caprise-Dark Jazz", url: "http://79.120.39.202:9137/" },
  { name: "Sublime Jazz", url: "https://stream.sublime.nl/web21_mp3" },
  // VINTAGE & RETRO
  { name: "The 1920s Radio Network", url: "http://kara.fast-serv.com:8358/listen.pls" },
  { name: "1940s Radio", url: "https://cast2.asurahosting.com/proxy/1940sradio/stream" },
  { name: "Classic Radio NSW", url: "http://stream.zeno.fm/wbb1hramzd0uv" },
  // FUNK & GROOVE
  { name: "Funky Radio Italy", url: "https://funkyradio.streamingmedia.it/play.mp3" },
  { name: "Trip Hop Radio", url: "http://79.111.14.76:8002/triphop" },
  { name: "Rocksteady Radio", url: "https://mpc1.mediacp.eu:8356/stream" },
  // WORLD & MIXED
  { name: "TorontoCast Radio", url: "https://cast1.torontocast.com:4490/;" },
  { name: "Harmony FM", url: "http://mp3.harmonyfm.de/harmonyfm/hqlivestream.mp3" },
  { name: "Savage Radio", url: "http://188.40.97.185:8179/stream" },
  { name: "Shonan Beach FM", url: "http://shonanbeachfm.out.airtime.pro:8000/shonanbeachfm_a" }
];

// ===== THEMES =====
const THEMES = ['bakelite', 'retro', 'mint', 'synthwave', 'dracula', 'gruvbox', 'nord', 'vintage'];

// ===== APP STATE =====
const state = {
  stations: [...DEFAULT_STATIONS],
  currentIndex: 0,
  isPlaying: false,
  volume: 60,
  theme: 'bakelite',
  playStartTime: null,
  audioContext: null,
  gainNode: null,
  analyser: null,
  dataArray: null
};

// ===== DOM ELEMENTS =====
let audioPlayer, playlist, stationName, playTime, volumeDisplay, statusEl, nowPlayingEl;
let playBtn, stopBtn, prevBtn, nextBtn, themeBtn, exitBtn, volumeSlider;
let vuLeft, vuRight, speakerGrill;

// ===== INITIALIZATION =====
function init() {
  // Get DOM elements
  audioPlayer = document.getElementById('audio-player');
  playlist = document.getElementById('playlist');
  stationName = document.getElementById('station-name');
  nowPlayingEl = document.getElementById('now-playing'); // New element
  playTime = document.getElementById('play-time');
  volumeDisplay = document.getElementById('volume-display');
  statusEl = document.getElementById('status');

  playBtn = document.getElementById('play-btn');
  stopBtn = document.getElementById('stop-btn');
  prevBtn = document.getElementById('prev-btn');
  nextBtn = document.getElementById('next-btn');
  themeBtn = document.getElementById('theme-btn');
  exitBtn = document.getElementById('exit-btn');
  volumeSlider = document.getElementById('volume-slider');

  vuLeft = document.getElementById('vu-left');
  vuRight = document.getElementById('vu-right');
  speakerGrill = document.getElementById('speaker-grill');

  // Set up event listeners
  setupEventListeners();

  // Listen for metadata updates from Rust backend
  if (window.__TAURI__) {
    window.__TAURI__.event.listen('metadata-update', (event) => {
      updateNowPlaying(event.payload);
    });
  }

  // Load preferences
  loadPreferences();

  // Render UI
  renderPlaylist();
  renderSpeakerGrill();
  updateVolumeDisplay();

  // Start timers
  setInterval(updatePlayTime, 1000);
  setInterval(updateVUMeters, 100);
}

function setupEventListeners() {
  // Control buttons
  playBtn.addEventListener('click', togglePlay);
  stopBtn.addEventListener('click', stop);
  prevBtn.addEventListener('click', prevStation);
  nextBtn.addEventListener('click', nextStation);
  themeBtn.addEventListener('click', cycleTheme);
  exitBtn.addEventListener('click', exitApp);

  // Volume
  volumeSlider.addEventListener('input', handleVolumeChange);

  // Audio events
  audioPlayer.addEventListener('playing', onPlaying);
  audioPlayer.addEventListener('pause', onPause);
  audioPlayer.addEventListener('ended', onEnded);
  audioPlayer.addEventListener('error', onError);

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);

  // Initialize audio on first interaction
  document.addEventListener('click', initAudioContext, { once: true });
}

function initAudioContext() {
  if (state.audioContext) return;

  try {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    state.gainNode = state.audioContext.createGain();   // gainNode is used to change volume of Web Audio
    state.gainNode.gain.value = state.volume / 100;
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 256;
    state.dataArray = new Uint8Array(state.analyser.frequencyBinCount);

    const source = state.audioContext.createMediaElementSource(audioPlayer);
    source.connect(state.gainNode);
    state.gainNode.connect(state.analyser);
    state.analyser.connect(state.audioContext.destination);
  } catch (e) {
    console.warn('Could not initialize audio context:', e);
  }
}

// ===== PLAYBACK CONTROLS =====
function togglePlay() {
  if (state.isPlaying) {
    audioPlayer.pause();
  } else {
    playStation(state.currentIndex);
  }
}

function playStation(index) {
  if (index < 0 || index >= state.stations.length) return;

  state.currentIndex = index;
  const station = state.stations[index];

  // Update UI
  stationName.textContent = station.name;
  updateNowPlaying("Loading info..."); // Reset now playing text
  setStatus('connecting');

  // Start playback
  audioPlayer.src = station.url;
  audioPlayer.volume = state.volume / 100;
  applyVolume();
  audioPlayer.play().catch(e => {
    console.error('Playback failed:', e);
    setStatus('stopped');
  });

  // Start metadata listener in backend
  if (window.__TAURI__) {
    window.__TAURI__.core.invoke('start_metadata_listener', { url: station.url })
      .catch(e => console.error("Metadata listener error:", e));
  }

  state.playStartTime = Date.now();
  renderPlaylist();
}

function stop() {
  audioPlayer.pause();
  audioPlayer.src = '';
  state.isPlaying = false;
  state.playStartTime = null;
  setStatus('stopped');
  playTime.textContent = '00:00';
  stationName.textContent = 'Select a station';
  updateNowPlaying(""); // Clear now playing text
}

function prevStation() {
  const newIndex = (state.currentIndex - 1 + state.stations.length) % state.stations.length;
  playStation(newIndex);
}

function nextStation() {
  const newIndex = (state.currentIndex + 1) % state.stations.length;
  playStation(newIndex);
}

// ===== AUDIO EVENTS =====
function onPlaying() {
  state.isPlaying = true;
  setStatus('playing');
  playBtn.textContent = '|| PAUSE';

  // Resume audio context if suspended
  if (state.audioContext?.state === 'suspended') {
    state.audioContext.resume();
  }
}

function onPause() {
  state.isPlaying = false;
  playBtn.textContent = '> PLAY';
}

function onEnded() {
  // Auto-play next station
  nextStation();
}

function onError(e) {
  console.error('Audio error:', e);
  setStatus('stopped');
  stationName.textContent = 'Error loading station';
}

// ===== UI UPDATES =====
function setStatus(status) {
  statusEl.className = 'status ' + status;
  statusEl.textContent = status.toUpperCase();
}

function updateNowPlaying(text) {
  if (nowPlayingEl) {
    nowPlayingEl.textContent = text;
  }
}

function updatePlayTime() {
  if (!state.isPlaying || !state.playStartTime) return;

  const elapsed = Math.floor((Date.now() - state.playStartTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  playTime.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateVolumeDisplay() {
  volumeDisplay.textContent = `VOL: ${state.volume}%`;
}

function applyVolume() {
  if (state.gainNode) {
    state.gainNode.gain.value = state.volume / 100;
  }
}

function handleVolumeChange(e) {
  state.volume = parseInt(e.target.value);
  audioPlayer.volume = state.volume / 100;
  applyVolume();
  updateVolumeDisplay();
  savePreferences();
}

// ===== VU METERS =====
function updateVUMeters() {
  let levelLeft = 0;
  let levelRight = 0;

  if (state.isPlaying && state.analyser && state.dataArray) {
    state.analyser.getByteFrequencyData(state.dataArray);

    // Calculate average levels from frequency data
    const len = state.dataArray.length;
    let sumLeft = 0, sumRight = 0;

    for (let i = 0; i < len / 2; i++) {
      sumLeft += state.dataArray[i];
    }
    for (let i = len / 2; i < len; i++) {
      sumRight += state.dataArray[i];
    }

    levelLeft = Math.floor((sumLeft / (len / 2)) / 255 * 5);
    levelRight = Math.floor((sumRight / (len / 2)) / 255 * 5);
  }

  // Update VU bars
  updateVUMeter(vuLeft, levelLeft);
  updateVUMeter(vuRight, levelRight);
}

function updateVUMeter(container, level) {
  const bars = container.querySelectorAll('.vu-bar');
  bars.forEach((bar, index) => {
    const barLevel = parseInt(bar.dataset.level);
    if (barLevel <= level) {
      bar.classList.add('active');
    } else {
      bar.classList.remove('active');
    }
  });
}

// ===== PLAYLIST =====
function renderPlaylist() {
  playlist.innerHTML = '';

  state.stations.forEach((station, index) => {
    const item = document.createElement('div');
    item.className = 'station-item' + (index === state.currentIndex ? ' active' : '');

    const marker = document.createElement('span');
    marker.className = 'marker';
    marker.textContent = index === state.currentIndex ? '▶' : '';

    const number = document.createElement('span');
    number.className = 'number';
    number.textContent = `${index + 1}.`;

    const name = document.createElement('span');
    name.textContent = station.name;

    item.appendChild(marker);
    item.appendChild(number);
    item.appendChild(name);

    item.addEventListener('click', () => playStation(index));

    playlist.appendChild(item);
  });
}

// ===== SPEAKER GRILL =====
function renderSpeakerGrill() {
  speakerGrill.innerHTML = '';
  const rows = 20;

  for (let i = 0; i < rows; i++) {
    const bar = document.createElement('div');
    bar.className = 'grill-bar';
    speakerGrill.appendChild(bar);
  }
}

// ===== THEME =====
function cycleTheme() {
  const currentIdx = THEMES.indexOf(state.theme);
  const nextIdx = (currentIdx + 1) % THEMES.length;
  state.theme = THEMES[nextIdx];
  document.body.dataset.theme = state.theme;
  savePreferences();
}

// ===== KEYBOARD =====
function handleKeyboard(e) {
  // Don't handle if focused on input
  if (e.target.tagName === 'INPUT') return;

  switch (e.key.toLowerCase()) {
    case ' ':
      e.preventDefault();
      togglePlay();
      break;
    case 's':
      stop();
      break;
    case 'n':
      nextStation();
      break;
    case 'p':
      prevStation();
      break;
    case 't':
      cycleTheme();
      break;
    case 'q':
      exitApp();
      break;
    case 'arrowup':
      e.preventDefault();
      state.volume = Math.min(100, state.volume + 5);
      volumeSlider.value = state.volume;
      audioPlayer.volume = state.volume / 100;
      applyVolume();
      updateVolumeDisplay();
      savePreferences();
      break;
    case 'arrowdown':
      e.preventDefault();
      state.volume = Math.max(0, state.volume - 5);
      volumeSlider.value = state.volume;
      audioPlayer.volume = state.volume / 100;
      applyVolume();
      updateVolumeDisplay();
      savePreferences();
      break;
  }
}

// ===== EXIT =====
async function exitApp() {
  try {
    await window.__TAURI__.core.invoke('exit_app');
  } catch (e) {
    console.error('Exit failed:', e);
    window.close();
  }
}

// ===== PREFERENCES =====
function savePreferences() {
  const prefs = {
    theme: state.theme,
    volume: state.volume,
    currentIndex: state.currentIndex
  };
  localStorage.setItem('vintage-radio-prefs', JSON.stringify(prefs));
}

function loadPreferences() {
  try {
    const saved = localStorage.getItem('vintage-radio-prefs');
    if (saved) {
      const prefs = JSON.parse(saved);

      if (prefs.theme && THEMES.includes(prefs.theme)) {
        state.theme = prefs.theme;
        document.body.dataset.theme = prefs.theme;
      }

      if (prefs.volume !== undefined) {
        state.volume = prefs.volume;
        volumeSlider.value = prefs.volume;
        audioPlayer.volume = state.volume / 100;
        applyVolume();
      }

      if (prefs.currentIndex !== undefined) {
        state.currentIndex = prefs.currentIndex;
      }
    }
  } catch (e) {
    console.warn('Could not load preferences:', e);
  }
}

// ===== START =====
document.addEventListener('DOMContentLoaded', init);
