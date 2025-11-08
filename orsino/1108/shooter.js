// shooter.js - target shooting game with 1-10 points and distinct sounds
// original "dark hero / chaotic jester" inspired styling - no copyrighted assets used

const range = document.getElementById('range');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const hitsEl = document.getElementById('hits');
const endModal = document.getElementById('endModal');
const finalScore = document.getElementById('finalScore');
const playAgainBtn = document.getElementById('playAgainBtn');
const closeModalBtn = document.getElementById('closeModal');

let audioCtx = null;
function getAudioCtx(){ if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); return audioCtx; }

function playTone(freq, type='sine', duration=0.25, gain=0.12){
  try{
    const ctx = getAudioCtx();
    // support a special 'bubble' timbre that emulates a popping/rising bubble
    if(type === 'bubble'){
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      o.type = 'sine';
      // start slightly higher and slide down to emulate a bubbly pop
      o.frequency.setValueAtTime(freq * 1.4, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.5), ctx.currentTime + duration);
      f.type = 'lowpass'; f.frequency.setValueAtTime(2000, ctx.currentTime);
      f.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + duration);
      g.gain.value = 0.0001;
      o.connect(f); f.connect(g); g.connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(gain, now+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now+duration);
      o.start(now); o.stop(now+duration+0.02);
      return;
    }
  const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = 0.0001;
    o.connect(g); g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now+duration);
    o.start(now); o.stop(now+duration+0.02);
  }catch(e){}
}

// map score to frequency & timbre
function soundForScore(score){
  // map 1..10 to a bubble-like frequency range (low to high)
  // bubbles are higher pitch for higher score but still short and plucky
  const base = 240; // base frequency
  const step = 55; // step per score
  const freq = base + (Math.max(1, Math.min(10, score)) - 1) * step; // 240.. (240+9*55=735)
  const dur = 0.12 + score * 0.01; // slightly longer for higher scores
  // use 'bubble' timbre for all targets
  return {freq, wave: 'bubble', dur};
}

// game variables
let playing=false;
let timeLeft=30;
let timerId=null;
let score=0;
let hits=0;
let maxTargets=6;
let spawnIntervalId=null;

function rand(min,max){return Math.random()*(max-min)+min}

function createTarget(value){
  const el = document.createElement('div');
  el.className='target';
  // color tier classes by value ranges
  if(value>=9) el.classList.add('t5');
  else if(value>=7) el.classList.add('t4');
  else if(value>=5) el.classList.add('t3');
  else if(value>=3) el.classList.add('t2');
  else el.classList.add('t1');

  // determine visual size and rise speed based on value
  // Choice B: higher scores -> smaller bubbles, slower rise
  const maxSize = 110; // size for score 1
  const minSize = 50;  // size for score 10 (adjusted per user request)
  const step = (maxSize - minSize) / 9; // decrement per score
  const size = Math.round(maxSize - (Math.max(1, Math.min(10, value)) - 1) * step);
  // rise duration: score1 fast (3s), score10 slow (~8s)
  const riseDuration = 3 + ((Math.max(1, Math.min(10, value)) - 1) * (5/9));
  // rise distance: keep relatively consistent so small bubbles remain visible
  const riseDistance = 120; // percent
  // set CSS variables for size and rise duration/distance
  el.style.setProperty('--size', size + 'px');
  el.style.setProperty('--rise-duration', riseDuration + 's');
  el.style.setProperty('--rise-distance', riseDistance + '%');

  // bubble-inner holds scale/entrance transitions, keeping float transform separate
  el.innerHTML = `<div class="bubble-inner"><div class="value">${value}</div></div>`;
  // random position inside range
  const pad = 20; // padding from edges
  const r = range.getBoundingClientRect();
  const w = Math.max(48, Math.min(84, r.width * 0.12));
  // use percentage positioning
  const x = rand(pad, r.width - w - pad);
  const y = rand(pad, r.height - w - pad);
  el.style.left = x + 'px';
  el.style.top = y + 'px';

  // click handler
  el.addEventListener('click', (e)=>{
    if(!playing) return;
    e.stopPropagation();
    const val = value;
    // play sound mapped to score
    const s = soundForScore(val);
    playTone(s.freq, s.wave, s.dur, 0.16);
    // pop animation: scale inner bubble and fade
    const inner = el.querySelector('.bubble-inner');
    if(inner){ inner.style.transform = 'scale(0.6)'; }
    el.style.opacity = '0.12';
    setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); }, 220);
    score += val; hits += 1;
    scoreEl.textContent = score;
    hitsEl.textContent = hits;
  });

  return el;
}

function spawnTargets(){
  // ensure there are up to maxTargets on screen
  const existing = range.querySelectorAll('.target').length;
  const toSpawn = Math.max(0, maxTargets - existing);
  for(let i=0;i<toSpawn;i++){
    const val = Math.floor(rand(1,11)); // 1..10
    const t = createTarget(val);
    range.appendChild(t);
    // small entrance animation: scale inner element so float animation isn't interfered
    const inner = t.querySelector('.bubble-inner');
    if(inner){ inner.style.transform = 'scale(0.2)'; inner.style.opacity = '0'; }
    setTimeout(()=>{ if(inner){ inner.style.transition='transform .18s ease, opacity .18s ease'; inner.style.transform='scale(1)'; inner.style.opacity='1'; } t.style.opacity='1'; }, 30);
    // auto remove target after its rise duration + small buffer
    const removeAfter = Math.max(2200, (parseFloat(getComputedStyle(t).getPropertyValue('--rise-duration')) * 1000) + 800 + Math.random()*800);
    setTimeout(()=>{ if(t.parentNode) t.parentNode.removeChild(t); }, removeAfter);
  }
}

function startRound(seconds=30){
  if(playing) return;
  // resume audio context on user gesture
  getAudioCtx();
  playing=true; timeLeft=seconds; score=0;hits=0;
  scoreEl.textContent=score; hitsEl.textContent=hits; timerEl.textContent = formatTimer(timeLeft);
  spawnTargets();
  spawnIntervalId = setInterval(spawnTargets, 900);
  timerId = setInterval(()=>{
    timeLeft -=1;
    timerEl.textContent = formatTimer(timeLeft);
    if(timeLeft<=0) endRound();
  },1000);
}

function endRound(){
  playing=false;
  clearInterval(timerId); clearInterval(spawnIntervalId);
  // remove remaining targets
  range.querySelectorAll('.target').forEach(t=>t.remove());
  // show end modal
  finalScore.textContent = `你的得分： ${score}（命中 ${hits} 次）`;
  endModal.classList.add('show');
  endModal.setAttribute('aria-hidden','false');
  // enable save button and focus name input
  if(saveScoreBtn){ saveScoreBtn.disabled = false; saveScoreBtn.textContent = '儲存成績'; }
  if(playerNameInput){ setTimeout(()=>{ playerNameInput.focus(); playerNameInput.select(); }, 120); }
}

/* Leaderboard for shooter: store top scores in localStorage sorted by score (desc).
   Each entry: {name, score, hits, date}
*/
const STORAGE_KEY = 'shooter_leaderboard_v1';
const scoresList = document.getElementById('scoresList');
const clearScoresBtn = document.getElementById('clearScores');
const saveScoreBtn = document.getElementById('saveScore');
const playerNameInput = document.getElementById('playerName');

function loadLeaderboard(){
  try{ const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; }catch(e){return []}
}
function saveLeaderboard(list){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }catch(e){console.error(e)} }

function renderLeaderboard(){
  const list = loadLeaderboard();
  if(!scoresList) return;
  scoresList.innerHTML = '';
  if(list.length===0){ const li = document.createElement('li'); li.textContent='暫無紀錄'; li.style.listStyle='none'; scoresList.appendChild(li); return; }
  list.forEach(s=>{
    const li = document.createElement('li');
    const label = document.createElement('div'); label.textContent = `${s.name || '玩家'}`;
    const meta = document.createElement('div'); meta.style.color='#2b6b7a'; meta.style.fontSize='13px'; meta.textContent = `${s.score} 分 • 命中 ${s.hits} 次`;
    li.appendChild(label); li.appendChild(meta); scoresList.appendChild(li);
  });
}

function addScore(name, scoreVal, hitsVal){
  const list = loadLeaderboard();
  list.push({name, score: scoreVal, hits: hitsVal, date: (new Date()).toISOString()});
  // sort by score desc, then hits desc
  list.sort((a,b)=> b.score - a.score || b.hits - a.hits);
  const top = list.slice(0,10);
  saveLeaderboard(top);
  renderLeaderboard();
}

if(clearScoresBtn){ clearScoresBtn.addEventListener('click', ()=>{ if(confirm('確定要清除排行榜嗎？')){ localStorage.removeItem(STORAGE_KEY); renderLeaderboard(); } }); }

if(saveScoreBtn){ saveScoreBtn.addEventListener('click', ()=>{
  const name = (playerNameInput && playerNameInput.value.trim()) || '玩家';
  addScore(name, score, hits);
  saveScoreBtn.disabled = true; saveScoreBtn.textContent = '已儲存';
}); }

// initialize leaderboard display and set default player name
if(playerNameInput) playerNameInput.value = '玩家';
renderLeaderboard();

function resetGame(){
  clearInterval(timerId); clearInterval(spawnIntervalId);
  playing=false; timeLeft=30; score=0; hits=0; scoreEl.textContent='0'; hitsEl.textContent='0'; timerEl.textContent='00:30';
  range.querySelectorAll('.target').forEach(t=>t.remove()); endModal.classList.remove('show'); endModal.setAttribute('aria-hidden','true');
}

function formatTimer(s){ const m = Math.floor(s/60).toString().padStart(2,'0'); const sec = (s%60).toString().padStart(2,'0'); return `${m}:${sec}` }

startBtn.addEventListener('click', ()=>{ resetGame(); startRound(30); });
resetBtn.addEventListener('click', ()=>{ resetGame(); });
playAgainBtn.addEventListener('click', ()=>{ endModal.classList.remove('show'); endModal.setAttribute('aria-hidden','true'); startRound(30); });
if(closeModalBtn){ closeModalBtn.addEventListener('click', ()=>{ endModal.classList.remove('show'); endModal.setAttribute('aria-hidden','true'); }); }

// clicking empty range will create a target (optional) - for mobile tuning
range.addEventListener('click', (e)=>{
  if(!playing) return;
  const val = Math.floor(rand(1,11));
  const t = createTarget(val);
  // position at click
  const r = range.getBoundingClientRect();
  const w = t.offsetWidth || 68;
  t.style.left = Math.max(8, Math.min(e.clientX - r.left - w/2, r.width - w - 8)) + 'px';
  t.style.top = Math.max(8, Math.min(e.clientY - r.top - w/2, r.height - w - 8)) + 'px';
  range.appendChild(t);
  // entrance: scale inner bubble
  const inner = t.querySelector('.bubble-inner');
  if(inner){ inner.style.transform = 'scale(0.2)'; inner.style.opacity = '0'; }
  setTimeout(()=>{ if(inner){ inner.style.transition='transform .18s ease, opacity .18s ease'; inner.style.transform='scale(1)'; inner.style.opacity='1'; } t.style.opacity='1'; }, 20);
  const removeAfter = Math.max(2200, (parseFloat(getComputedStyle(t).getPropertyValue('--rise-duration')) * 1000) + 800 + Math.random()*800);
  setTimeout(()=>{ if(t.parentNode) t.parentNode.removeChild(t); }, removeAfter);
});

// initialize HUD
resetGame();
