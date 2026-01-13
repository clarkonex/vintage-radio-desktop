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
  analyser: null,
  dataArray: null,
  // 1937 Radio Filters
  vintageFiltersEnabled: true,
  vintageIntensity: 70, // 0-100
  filterNodes: {
    source: null,
    highpass: null,
    lowpass: null,
    distortion: null,
    compressor: null,
    noiseGain: null,
    noiseSource: null
  }
};

// ===== DOM ELEMENTS =====
let audioPlayer, playlist, stationName, playTime, volumeDisplay, statusEl, nowPlayingEl;
let playBtn, stopBtn, prevBtn, nextBtn, themeBtn, exitBtn, volumeSlider;
let vuLeft, vuRight, speakerGrill;
let speakerToggle, speakerStatus, intensitySlider, intensityDisplay;

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

  speakerToggle = document.getElementById('speaker-toggle');
  speakerStatus = document.getElementById('speaker-status');
  intensitySlider = document.getElementById('intensity-slider');
  intensityDisplay = document.getElementById('intensity-display');

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
  updateIntensityDisplay();
  updateVintageToggleUI();

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

  // Vintage Filters
  speakerToggle.addEventListener('click', toggleVintageFilters);
  intensitySlider.addEventListener('input', handleIntensityChange);

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
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 256;
    state.dataArray = new Uint8Array(state.analyser.frequencyBinCount);

    // Create source
    state.filterNodes.source = state.audioContext.createMediaElementSource(audioPlayer);

    // Create 1937 Radio Filter Chain
    create1937Filters();

    // Connect audio chain
    connectAudioChain();
  } catch (e) {
    console.warn('Could not initialize audio context:', e);
  }
}

// ===== 1937 RADIO FILTERS =====
function create1937Filters() {
  const ctx = state.audioContext;

  // 1. High-pass filter at 300 Hz (remove low rumble)
  state.filterNodes.highpass = ctx.createBiquadFilter();
  state.filterNodes.highpass.type = 'highpass';
  state.filterNodes.highpass.frequency.value = 300;
  state.filterNodes.highpass.Q.value = 0.7;

  // 2. Low-pass filter at 3000 Hz (authentic AM radio bandwidth)
  state.filterNodes.lowpass = ctx.createBiquadFilter();
  state.filterNodes.lowpass.type = 'lowpass';
  state.filterNodes.lowpass.frequency.value = 3000;
  state.filterNodes.lowpass.Q.value = 0.7;

  // 3. Tube distortion using WaveShaper
  state.filterNodes.distortion = ctx.createWaveShaper();
  state.filterNodes.distortion.curve = makeDistortionCurve(40); // subtle distortion
  state.filterNodes.distortion.oversample = '4x';

  // 4. Compressor (for dynamic range limiting, typical of old radios)
  state.filterNodes.compressor = ctx.createDynamicsCompressor();
  state.filterNodes.compressor.threshold.value = -24;
  state.filterNodes.compressor.knee.value = 30;
  state.filterNodes.compressor.ratio.value = 12;
  state.filterNodes.compressor.attack.value = 0.003;
  state.filterNodes.compressor.release.value = 0.25;

  // 5. Background static/noise
  createBackgroundNoise();
}

function makeDistortionCurve(amount) {
  const k = typeof amount === 'number' ? amount : 50;
  const samples = 44100;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }

  return curve;
}

function createBackgroundNoise() {
  const ctx = state.audioContext;
  const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Generate pink noise (more natural than white noise)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  // Create looping noise source
  state.filterNodes.noiseSource = ctx.createBufferSource();
  state.filterNodes.noiseSource.buffer = buffer;
  state.filterNodes.noiseSource.loop = true;

  // Gain for noise (very quiet background)
  state.filterNodes.noiseGain = ctx.createGain();
  updateVintageIntensity(); // Set initial gain based on intensity

  // Connect noise: source -> gain -> destination
  state.filterNodes.noiseSource.connect(state.filterNodes.noiseGain);
  state.filterNodes.noiseGain.connect(state.audioContext.destination);

  // Start noise
  state.filterNodes.noiseSource.start(0);
}

function connectAudioChain() {
  const nodes = state.filterNodes;

  if (state.vintageFiltersEnabled) {
    // Full vintage filter chain:
    // source -> highpass -> lowpass -> distortion -> compressor -> analyser -> destination
    nodes.source.connect(nodes.highpass);
    nodes.highpass.connect(nodes.lowpass);
    nodes.lowpass.connect(nodes.distortion);
    nodes.distortion.connect(nodes.compressor);
    nodes.compressor.connect(state.analyser);
    state.analyser.connect(state.audioContext.destination);
  } else {
    // Bypass filters (clean audio)
    nodes.source.connect(state.analyser);
    state.analyser.connect(state.audioContext.destination);
  }
}

function reconnectAudioChain() {
  // Disconnect all
  const nodes = state.filterNodes;
  try {
    nodes.source.disconnect();
    if (nodes.highpass) nodes.highpass.disconnect();
    if (nodes.lowpass) nodes.lowpass.disconnect();
    if (nodes.distortion) nodes.distortion.disconnect();
    if (nodes.compressor) nodes.compressor.disconnect();
    state.analyser.disconnect();
  } catch (e) {
    // Ignore disconnect errors
  }

  // Reconnect based on enabled state
  connectAudioChain();
}

function toggleVintageFilters() {
  state.vintageFiltersEnabled = !state.vintageFiltersEnabled;

  if (state.audioContext) {
    reconnectAudioChain();
  }

  updateVintageToggleUI();
  savePreferences();
}

function updateVintageToggleUI() {
  if (speakerStatus) {
    speakerStatus.textContent = state.vintageFiltersEnabled ? '📻 ON' : '📻 OFF';
    speakerStatus.classList.toggle('off', !state.vintageFiltersEnabled);
  }
}

function handleIntensityChange(e) {
  state.vintageIntensity = parseInt(e.target.value);
  updateIntensityDisplay();
  updateVintageIntensity();
  savePreferences();
}

function updateIntensityDisplay() {
  if (intensityDisplay) {
    intensityDisplay.textContent = `${state.vintageIntensity}%`;
  }
}

function updateVintageIntensity() {
  if (!state.audioContext) return;

  const intensity = state.vintageIntensity / 100; // 0-1 range

  // Adjust filter characteristics based on intensity
  if (state.filterNodes.highpass) {
    // More intensity = more aggressive high-pass (remove more bass)
    state.filterNodes.highpass.frequency.value = 300 + (intensity * 200); // 300-500 Hz
  }

  if (state.filterNodes.lowpass) {
    // More intensity = more aggressive low-pass (muffle highs more)
    state.filterNodes.lowpass.frequency.value = 3000 - (intensity * 1000); // 3000-2000 Hz
  }

  if (state.filterNodes.distortion) {
    // More intensity = more distortion
    const distortionAmount = 20 + (intensity * 80); // 20-100
    state.filterNodes.distortion.curve = makeDistortionCurve(distortionAmount);
  }

  if (state.filterNodes.noiseGain) {
    // More intensity = more background noise
    const noiseLevel = 0.002 + (intensity * 0.018); // 0.002-0.02
    state.filterNodes.noiseGain.gain.value = noiseLevel;
  }

  if (state.filterNodes.compressor) {
    // More intensity = more compression
    state.filterNodes.compressor.ratio.value = 8 + (intensity * 8); // 8-16
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

function handleVolumeChange(e) {
  state.volume = parseInt(e.target.value);
  audioPlayer.volume = state.volume / 100;
  updateVolumeDisplay();
  savePreferences();
}

// ===== VU METERS =====
function updateVUMeters() {
  let levelLeft = 0;
  let levelRight = 0;

  if (state.isPlaying && state.analyser && state.dataArray) {
    state.analyser.getByteFrequencyData(state.dataArray);

    // Calculate total energy across all frequencies
    let sum = 0;
    for (let i = 0; i < state.dataArray.length; i++) {
      sum += state.dataArray[i];
    }

    // Scale to 0-5 range with more sensitivity
    // Lower threshold: 50 per level instead of 200
    const level = Math.min(5, Math.max(0, Math.floor(sum / 50)));

    // For mono streams (most radio), show same level on both meters
    // Add slight variation for visual effect
    levelLeft = level;
    levelRight = Math.max(0, level + (Math.random() > 0.5 ? -1 : 0));
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
      updateVolumeDisplay();
      savePreferences();
      break;
    case 'arrowdown':
      e.preventDefault();
      state.volume = Math.max(0, state.volume - 5);
      volumeSlider.value = state.volume;
      audioPlayer.volume = state.volume / 100;
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
    currentIndex: state.currentIndex,
    vintageFiltersEnabled: state.vintageFiltersEnabled,
    vintageIntensity: state.vintageIntensity
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
      }

      if (prefs.currentIndex !== undefined) {
        state.currentIndex = prefs.currentIndex;
      }

      if (prefs.vintageFiltersEnabled !== undefined) {
        state.vintageFiltersEnabled = prefs.vintageFiltersEnabled;
      }

      if (prefs.vintageIntensity !== undefined) {
        state.vintageIntensity = prefs.vintageIntensity;
        if (intensitySlider) intensitySlider.value = prefs.vintageIntensity;
      }
    }
  } catch (e) {
    console.warn('Could not load preferences:', e);
  }
}

// ===== START =====
document.addEventListener('DOMContentLoaded', init);
