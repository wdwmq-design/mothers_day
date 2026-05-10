
// ── PARTICLE SYSTEM ──────────────────────────────────────────────────────────
(function () {
  const canvas = document.getElementById('particles-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  const GOLD = 'rgba(201,169,110,';
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height;
      this.r = Math.random() * 1.5 + 0.5; this.alpha = Math.random() * 0.4 + 0.1;
      this.vx = (Math.random() - 0.5) * 0.15; this.vy = -(Math.random() * 0.3 + 0.1);
      this.life = 0; this.maxLife = Math.random() * 300 + 200;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life++; if (this.life > this.maxLife || this.y < -10) this.reset(); }
    draw() {
      const p = this.life / this.maxLife;
      const a = p < 0.1 ? p * 10 : p > 0.8 ? (1 - p) * 5 : 1;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = GOLD + (this.alpha * a) + ')'; ctx.fill();
    }
  }
  for (let i = 0; i < 80; i++)particles.push(new Particle());
  (function animate() { ctx.clearRect(0, 0, canvas.width, canvas.height); particles.forEach(p => { p.update(); p.draw(); }); requestAnimationFrame(animate); })();
})();

// ── INTERSECTION OBSERVER ────────────────────────────────────────────────────
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.15 });
document.querySelectorAll('.section-inner,.memory-card').forEach(el => {
  el.classList.add('fade-in'); observer.observe(el);
});

// ── HELPERS ──────────────────────────────────────────────────────────────────
function scrollToSection(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function triggerUpload(inputId) { document.getElementById(inputId)?.click(); }
function handleUpload(input, previewId, zoneId) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById(previewId);
    img.src = e.target.result; img.classList.add('visible');
    document.getElementById(zoneId)?.classList.add('has-image');
  };
  reader.readAsDataURL(file);
}

// ── AMBIENT MUSIC (Web Audio API — cinematic piano melody) ───────────────────
let audioCtx = null, musicGain = null, musicPlaying = false, musicStarted = false;
let melodyInterval = null, arpInterval = null;

function createAmbientMusic() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Master gain (starts at 0, faded in)
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0;

  // Reverb via ConvolverNode (impulse response built with noise)
  const convolver = audioCtx.createConvolver();
  const revLen = audioCtx.sampleRate * 3.5;
  const revBuf = audioCtx.createBuffer(2, revLen, audioCtx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = revBuf.getChannelData(ch);
    for (let i = 0; i < revLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 2.5);
  }
  convolver.buffer = revBuf;

  // Wet/dry mix for reverb
  const dryGain = audioCtx.createGain(); dryGain.gain.value = 0.55;
  const wetGain = audioCtx.createGain(); wetGain.gain.value = 0.45;
  convolver.connect(wetGain);
  wetGain.connect(musicGain);
  dryGain.connect(musicGain);
  musicGain.connect(audioCtx.destination);

  // Warm low-pass filter for softness
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2200;
  filter.Q.value = 0.7;
  filter.connect(dryGain);
  filter.connect(convolver);

  // Helper: play a soft piano-like tone (attack/decay/sustain/release)
  function playTone(freq, startTime, duration, vol = 0.18, type = 'sine') {
    const osc = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator(); // subtle 2nd harmonic
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2.001; // slight detune for warmth
    const g2 = audioCtx.createGain(); g2.gain.value = 0.08;
    osc.connect(g); osc2.connect(g2); g2.connect(filter);
    g.connect(filter);
    // ADSR
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(vol, startTime + 0.04);        // attack
    g.gain.exponentialRampToValueAtTime(vol * 0.6, startTime + 0.18); // decay
    g.gain.setValueAtTime(vol * 0.6, startTime + duration - 0.3);   // sustain
    g.gain.linearRampToValueAtTime(0.0001, startTime + duration);    // release
    osc.start(startTime); osc.stop(startTime + duration + 0.1);
    osc2.start(startTime); osc2.stop(startTime + duration + 0.1);
  }

  // Bass pad: deep warm root notes
  function playBass(freq, startTime, duration) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(0.09, startTime + 0.3);
    g.gain.setValueAtTime(0.09, startTime + duration - 0.5);
    g.gain.linearRampToValueAtTime(0, startTime + duration);
    osc.connect(g); g.connect(filter);
    osc.start(startTime); osc.stop(startTime + duration + 0.1);
  }

  // ── C major scale frequencies ──
  // C4=261.63 D4=293.66 E4=329.63 F4=349.23 G4=392 A4=440 B4=493.88 C5=523.25
  // Am pentatonic melody line: A C D E G A (emotional, nostalgic)
  const melody = [
    440.00,  // A4
    523.25,  // C5
    587.33,  // D5
    659.25,  // E5
    523.25,  // C5
    440.00,  // A4
    392.00,  // G4
    440.00,  // A4
    349.23,  // F4
    392.00,  // G4
    440.00,  // A4
    523.25,  // C5
  ];

  // Chord progressions (Am - F - C - G) — classic emotional sequence
  const chords = [
    [220.00, 261.63, 329.63, 440.00],  // Am
    [174.61, 220.00, 261.63, 349.23],  // F
    [130.81, 164.81, 196.00, 261.63],  // C
    [196.00, 246.94, 293.66, 392.00],  // G
  ];
  const bassNotes = [110.00, 87.31, 65.41, 98.00]; // A2 F2 C2 G2

  let chordIdx = 0;
  const CHORD_DUR = 4.0; // seconds per chord
  const NOTE_GAP = 0.38; // arpeggio speed

  function scheduleChord() {
    if (!audioCtx || audioCtx.state === 'closed') return;
    const now = audioCtx.currentTime;
    const chord = chords[chordIdx % chords.length];
    const bass = bassNotes[chordIdx % bassNotes.length];

    // Bass note
    playBass(bass, now, CHORD_DUR);

    // Arpeggio: play chord notes one by one, softly
    chord.forEach((freq, i) => {
      playTone(freq, now + i * NOTE_GAP, CHORD_DUR - i * NOTE_GAP, 0.12);
    });

    // Melody note on top (every other chord)
    const melNote = melody[(chordIdx * 2) % melody.length];
    const melNote2 = melody[(chordIdx * 2 + 1) % melody.length];
    playTone(melNote, now + 0.1, 1.6, 0.16);
    playTone(melNote2, now + 1.8, 1.4, 0.14);

    chordIdx++;
  }

  // Schedule first chord immediately, then repeat
  scheduleChord();
  arpInterval = setInterval(scheduleChord, CHORD_DUR * 1000);
}

function fadeMusic(targetVol, duration) {
  if (!musicGain) return;
  musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
  musicGain.gain.setValueAtTime(musicGain.gain.value, audioCtx.currentTime);
  musicGain.gain.linearRampToValueAtTime(targetVol, audioCtx.currentTime + duration);
}

function toggleMusic() {
  const btn = document.getElementById('music-toggle');
  if (!musicStarted) {
    createAmbientMusic();
    musicStarted = true;
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (musicPlaying) {
    fadeMusic(0, 1.5);
    btn.classList.add('muted');
    btn.classList.remove('playing');
  } else {
    fadeMusic(1, 2);
    btn.classList.remove('muted');
    btn.classList.add('playing');
  }
  musicPlaying = !musicPlaying;
}

function startMusicIfNeeded() {
  if (!musicStarted) {
    createAmbientMusic(); musicStarted = true;
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (!musicPlaying) {
    fadeMusic(1, 3);
    musicPlaying = true;
    const btn = document.getElementById('music-toggle');
    btn.classList.remove('muted'); btn.classList.add('playing');
  }
}



// ── LOCAL STORY GENERATOR ────────────────────────────────────────────────────
async function callGemini(name, m1, m2, m3) {
  return `Before the world called her "Mom," ${name} was once a little girl with dreams in her eyes and wonder in her heart.

Long before she carried anyone else, she carried her own hopes — small, tender, and full of life. She did not know then what she would become. She only knew how to feel deeply, love quietly, and keep going.

She grew through moments no one saw. Through silent tears and soft mornings. Through every time she chose someone else over herself — not out of duty, but out of love so instinctive it needed no name.

${m1 ? m1 : 'She was there in every quiet moment that mattered.'}

${m2 ? m2 : 'Her love showed up in ways that words could never fully hold.'}

${m3 ? m3 : 'And in remembering her, we remember ourselves.'}

To love a mother is to love the first home you ever knew — warm, unconditional, and always waiting for you to return.

Happy Mother's Day, ${name}. Before you became everything to us, you were someone's little girl. And you deserved all the love in the world then, just as you do now.`;
}

// ── CINEMATIC PARAGRAPH REVEAL ───────────────────────────────────────────────
async function revealParagraphs(text, container) {
  container.innerHTML = '';
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  for (let i = 0; i < paragraphs.length; i++) {
    const p = document.createElement('p');
    p.className = 'story-paragraph' + (i === 0 || i === paragraphs.length - 1 ? ' highlight' : '');
    p.textContent = paragraphs[i];
    container.appendChild(p);
    await new Promise(r => setTimeout(r, 80));
    requestAnimationFrame(() => setTimeout(() => p.classList.add('revealed'), 60));
    await new Promise(r => setTimeout(r, i === 0 || i === paragraphs.length - 1 ? 1400 : 1000));
    p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ── CHILDHOOD MEMORY PARTICLES ───────────────────────────────────────────────
function startMemoryParticles() {
  const c = document.getElementById('memory-particles-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  const rect = c.parentElement.getBoundingClientRect();
  c.width = rect.width; c.height = rect.height;
  const pts = [];
  for (let i = 0; i < 40; i++) { pts.push({ x: Math.random() * c.width, y: Math.random() * c.height, r: Math.random() * 2 + 0.5, a: Math.random() * 0.5 + 0.1, vx: (Math.random() - 0.5) * 0.2, vy: -(Math.random() * 0.4 + 0.1), life: 0, max: Math.random() * 200 + 150 }); }
  (function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.life++; if (p.life > p.max) { p.x = Math.random() * c.width; p.y = c.height + 10; p.life = 0; }
      const prog = p.life / p.max; const fade = prog < 0.1 ? prog * 10 : prog > 0.8 ? (1 - prog) * 5 : 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(201,169,110,${p.a * fade})`; ctx.fill();
    });
    requestAnimationFrame(draw);
  })();
}

// ── LOADING OVERLAY ──────────────────────────────────────────────────────────
function startLoadingOverlay(cImg, nImg) {
  const overlay = document.getElementById('loading-overlay');
  const photo = document.getElementById('loading-photo');
  const txt = document.getElementById('loading-text');
  if (cImg && cImg.startsWith('data:')) photo.src = cImg;
  else if (nImg && nImg.startsWith('data:')) photo.src = nImg;
  overlay.classList.remove('overlay-hidden');
  const phrases = ["Rebuilding forgotten memories...", "Finding moments of love...", "Turning memories into a story...", "Every mother has a journey...", "Creating her cinematic memory..."];
  let idx = 0; txt.textContent = phrases[0]; txt.classList.add('visible');
  const iv = setInterval(() => {
    txt.classList.remove('visible');
    setTimeout(() => { idx++; if (idx < phrases.length) { txt.textContent = phrases[idx]; txt.classList.add('visible'); } }, 1000);
  }, 2500);
  return { overlay, iv, startTime: Date.now() };
}
function stopLoadingOverlay({ overlay, iv, startTime }) {
  clearInterval(iv);
  const wait = Math.max(0, 5000 - (Date.now() - startTime));
  return new Promise(r => setTimeout(() => { overlay.classList.add('overlay-hidden'); setTimeout(r, 1500); }, wait));
}

// ── MAIN FLOW ────────────────────────────────────────────────────────────────
function generateStory() {
  // Start music on first generate
  startMusicIfNeeded();

  const name = document.getElementById('mothers-name').value.trim() || 'her';
  const m1 = document.getElementById('memory-1').value;
  const m2 = document.getElementById('memory-2').value;
  const m3 = document.getElementById('memory-3').value;
  const cImg = document.getElementById('preview-childhood').src;
  const nImg = document.getElementById('preview-current').src;
  const btn = document.getElementById('generate-btn');
  btn.classList.add('loading');
  btn.querySelector('.btn-generate-text').textContent = 'Weaving memories…';

  const loadCtx = startLoadingOverlay(cImg, nImg);

  callGemini(name, m1, m2, m3)
    .then(async story => {
      await stopLoadingOverlay(loadCtx);
      const hasChild = cImg && cImg.startsWith('data:');
      const hasCurrent = nImg && nImg.startsWith('data:');

      // ── CHILDHOOD MEMORY PLAYBACK ──
      if (hasChild) {
        const memSec = document.getElementById('childhood-memory');
        document.getElementById('memory-childhood-img').src = cImg;
        memSec.classList.remove('hidden');
        memSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        startMemoryParticles();
        // Swell music
        if (musicPlaying) fadeMusic(1.3, 2);
        await new Promise(r => setTimeout(r, 5000));
        if (musicPlaying) fadeMusic(1, 1.5);
      }

      // ── STORY PLAYBACK ──
      const pb = document.getElementById('playback-section');
      pb.classList.remove('hidden');
      pb.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (hasChild) { const ci = document.getElementById('playback-childhood'); ci.src = cImg; ci.style.display = 'block'; }
      if (hasCurrent) { const ni = document.getElementById('playback-current'); ni.src = nImg; ni.style.display = 'block'; }
      document.getElementById('story-name-display').textContent = name;
      await revealParagraphs(story, document.getElementById('story-text'));

      // ── THANK YOU ──
      // Swell music for finale
      if (musicPlaying) fadeMusic(1.4, 2);
      setTimeout(() => {
        const ty = document.getElementById('thankyou-section');
        ty.classList.remove('hidden');
        ty.scrollIntoView({ behavior: 'smooth', block: 'start' });
        spawnPetals(); setTimeout(spawnPetals, 600);
        // Slowly fade music down for emotional ending
        if (musicPlaying) setTimeout(() => fadeMusic(0.6, 8), 4000);
      }, 1800);

      btn.classList.remove('loading');
      btn.querySelector('.btn-generate-text').textContent = 'Generate Her Story';
    })
    .catch(err => {
      stopLoadingOverlay(loadCtx);
      btn.classList.remove('loading');
      btn.querySelector('.btn-generate-text').textContent = 'Generate Her Story';
      console.error(err);
    });
}

// ── PETALS ────────────────────────────────────────────────────────────────────
function spawnPetals() {
  const container = document.getElementById('petals-container');
  for (let i = 0; i < 24; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      const sym = ['✿', '❀', '✾', '❁', '✽', '⚘'];
      p.textContent = sym[Math.floor(Math.random() * sym.length)];
      p.style.cssText = `position:absolute;top:-30px;left:${Math.random() * 100}%;font-size:${Math.random() * 16 + 10}px;color:rgba(201,169,110,${Math.random() * 0.5 + 0.2});animation:petalFall ${Math.random() * 4 + 4}s ease forwards;pointer-events:none;`;
      container.appendChild(p);
      setTimeout(() => p.remove(), 8000);
    }, i * 300);
  }
}

// ── SHARE / RESTART ──────────────────────────────────────────────────────────
function shareStory() {
  const name = document.getElementById('mothers-name').value.trim() || 'Mom';
  const text = `I created a cinematic tribute for ${name} this Mother's Day. ♡ "Before you became my mother, you were someone's little girl." — Before Mom`;
  if (navigator.share) navigator.share({ title: 'Before Mom', text, url: window.location.href });
  else navigator.clipboard.writeText(text + '\n' + window.location.href).then(() => alert('Copied to clipboard! Share it with love. ♡'));
}
function restartApp() {
  ['playback-section', 'thankyou-section', 'childhood-memory'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
  document.getElementById('mothers-name').value = '';
  ['memory-1', 'memory-2', 'memory-3'].forEach(id => document.getElementById(id).value = '');
  ['childhood', 'current'].forEach(k => {
    const img = document.getElementById('preview-' + k); img.src = ''; img.classList.remove('visible');
    document.getElementById('zone-' + k)?.classList.remove('has-image');
  });
  scrollToSection('hero');
}

// Continuous petals
setInterval(() => { if (!document.getElementById('thankyou-section').classList.contains('hidden')) spawnPetals(); }, 7000);

// ── SHARE AS STORY IMAGE ─────────────────────────────────────────────────────
let generatedStoryBlob = null;
let generatedStoryDataUrl = null;

function extractCinematicQuote() {
  const storyEl = document.getElementById('story-text');
  const fallback = 'Before you became my mother, you were someone\'s little girl. And you deserved all the love in the world then, just as you do now.';
  if (!storyEl) return `"${fallback}"`;
  const paragraphs = storyEl.querySelectorAll('.story-paragraph');
  if (paragraphs.length === 0) return `"${fallback}"`;

  // Prefer a highlighted (first/last) paragraph
  let quote = '';
  paragraphs.forEach(p => {
    if (p.classList.contains('highlight') && !quote) {
      quote = p.textContent.trim();
    }
  });
  if (!quote) quote = paragraphs[0].textContent.trim();

  // Hard cap at 160 chars, break at last sentence end for elegance
  const MAX = 160;
  if (quote.length > MAX) {
    let cut = quote.lastIndexOf('.', MAX);
    if (cut < 80) cut = quote.lastIndexOf(' ', MAX); // fallback: word boundary
    quote = cut > 0 ? quote.substring(0, cut + 1) : quote.substring(0, MAX) + '…';
  }
  return `"${quote}"`;
}

function populateStoryCard() {
  const name = document.getElementById('mothers-name').value.trim() || 'Mom';
  const cImg = document.getElementById('preview-childhood').src;
  const nImg = document.getElementById('preview-current').src;
  const quote = extractCinematicQuote();

  // Set photo — prefer current photo, fallback to childhood
  const photoEl = document.getElementById('story-card-photo');
  if (nImg && nImg.startsWith('data:')) {
    photoEl.src = nImg;
  } else if (cImg && cImg.startsWith('data:')) {
    photoEl.src = cImg;
  }

  // Set name and quote
  document.getElementById('story-card-name').textContent = name;
  document.getElementById('story-card-quote').textContent = quote;
}

async function generateStoryImage() {
  populateStoryCard();

  const wrapper = document.getElementById('story-card-wrapper');
  const card    = document.getElementById('story-card');
  const content = card.querySelector('.story-card-content');

  // Move card into the visible render area (off-screen but not display:none)
  wrapper.style.left    = '0px';
  wrapper.style.top     = '0px';
  wrapper.style.zIndex  = '-999';
  wrapper.style.opacity = '1';

  // Temporarily expand the tribute container height and ensure overflow is visible
  const originalHeight = card.style.height;
  const originalOverflow = card.style.overflow;
  const originalContentOverflow = content ? content.style.overflow : '';

  card.style.height = 'auto';
  card.style.overflow = 'visible';
  if (content) content.style.overflow = 'visible';

  // Wait for the photo to fully decode before capturing
  const photoEl = document.getElementById('story-card-photo');
  if (photoEl.src && photoEl.src !== window.location.href) {
    try { await photoEl.decode(); } catch (_) { /* continue anyway */ }
  }
  // Extra paint frame for fonts / backgrounds
  await new Promise(r => setTimeout(r, 400));

  try {
    const targetHeight = Math.max(1920, card.scrollHeight);

    const canvas = await html2canvas(card, {
      width:       1080,
      height:      targetHeight,
      windowWidth: 1080,
      windowHeight: targetHeight,
      x:           0,
      y:           0,
      scrollX:     0,
      scrollY:     0,
      scale:       2,
      useCORS:     true,
      allowTaint:  true,
      backgroundColor: '#000000',
      logging:     false,
      imageTimeout: 8000,
    });

    wrapper.style.left = '-9999px';
    card.style.height = originalHeight;
    card.style.overflow = originalOverflow;
    if (content) content.style.overflow = originalContentOverflow;

    generatedStoryDataUrl = canvas.toDataURL('image/png', 1.0);
    const response = await fetch(generatedStoryDataUrl);
    generatedStoryBlob = await response.blob();
    return generatedStoryDataUrl;
  } catch (err) {
    wrapper.style.left = '-9999px';
    card.style.height = originalHeight;
    card.style.overflow = originalOverflow;
    if (content) content.style.overflow = originalContentOverflow;
    console.error('Story image generation failed:', err);
    return null;
  }
}

async function openShareModal() {
  const modal = document.getElementById('share-modal');
  const loading = document.getElementById('share-preview-loading');
  const previewImg = document.getElementById('share-preview-img');

  // Reset state
  loading.classList.remove('done');
  previewImg.classList.remove('visible');
  previewImg.src = '';
  generatedStoryBlob = null;
  generatedStoryDataUrl = null;

  // Show modal
  modal.classList.add('visible');

  // Generate the image
  const dataUrl = await generateStoryImage();

  if (dataUrl) {
    previewImg.src = dataUrl;
    previewImg.classList.add('visible');
    loading.classList.add('done');
  } else {
    loading.querySelector('p').textContent = 'Could not generate image. Please try again.';
  }
}

function closeShareModal() {
  document.getElementById('share-modal').classList.remove('visible');
}

function downloadStoryImage() {
  if (!generatedStoryDataUrl) return;
  const name = document.getElementById('mothers-name').value.trim() || 'Mom';
  const link = document.createElement('a');
  link.download = `BeforeMom_${name.replace(/\s+/g, '_')}_tribute.png`;
  link.href = generatedStoryDataUrl;
  link.click();
}

function shareToWhatsApp() {
  const name = document.getElementById('mothers-name').value.trim() || 'Mom';
  const text = encodeURIComponent(
    `💛 I created a cinematic Mother's Day tribute for ${name}.\n\n"Before you became my mother, you were someone's little girl."\n\n— Before Mom ✦\n\n${window.location.href}`
  );

  // If we have the image blob, try native share first (mobile)
  if (navigator.canShare && generatedStoryBlob) {
    const file = new File([generatedStoryBlob], 'BeforeMom_tribute.png', { type: 'image/png' });
    if (navigator.canShare({ files: [file] })) {
      navigator.share({
        title: `Before Mom — ${name}`,
        text: `💛 A cinematic Mother's Day tribute for ${name}`,
        files: [file],
      }).catch(() => {
        // Fallback to WhatsApp URL
        window.open(`https://wa.me/?text=${text}`, '_blank');
      });
      return;
    }
  }

  // Download image first, then open WhatsApp
  if (generatedStoryDataUrl) downloadStoryImage();
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

function shareToInstagram() {
  // Instagram doesn't support direct web sharing — download + guide user
  if (generatedStoryDataUrl) {
    downloadStoryImage();

    // If native share is available (mobile), try it with the image file
    if (navigator.canShare && generatedStoryBlob) {
      const file = new File([generatedStoryBlob], 'BeforeMom_tribute.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        navigator.share({
          title: 'Before Mom — A Mother\'s Day Tribute',
          files: [file],
        }).catch(() => {});
        return;
      }
    }

    // Show instructions
    setTimeout(() => {
      alert('✨ Image downloaded!\n\nOpen Instagram → Create Story → Select the downloaded image from your gallery.\n\nTip: Add #BeforeMom and #MothersDay to your story!');
    }, 500);
  }
}

// Close share modal with Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeShareModal();
});
// Close share modal on backdrop click
document.getElementById('share-modal')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeShareModal();
});
