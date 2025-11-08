/* script for match.html (moved from inline <script>) */
/* Game contract
   - Inputs: user clicks on cards
   - Outputs: visual flips, moves, timer, win overlay
   - Error modes: ignore clicks when two cards are already flipped
*/

/* Sound effects using Web Audio API (no external files)
   - playSuccess(): short pleasant chime
   - playFail(): short buzzer
*/
let audioCtx = null;
function getAudioCtx(){
  if(!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playSuccess(){
  try{
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    // simple arpeggio using three sine oscillators
    const freqs = [880, 1100, 1320];
    freqs.forEach((f,i)=>{
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.value = 0.0001;
      o.connect(g); g.connect(ctx.destination);
      const t0 = now + i*0.05;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      o.start(t0); o.stop(t0 + 0.55);
    });
  }catch(e){/* fail silently */}
}

function playFail(){
  try{
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 180;
    g.gain.value = 0.0001;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    o.start(now); o.stop(now + 0.3);
  }catch(e){/* fail silently */}
}

function playWin(){
  try{
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    // gentle bell sequence
    const base = 880;
    const steps = [0, 3, 7, 12];
    steps.forEach((step,i)=>{
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = base * Math.pow(2, step/12);
      o.connect(g); g.connect(ctx.destination);
      const t0 = now + i*0.08;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.8);
      o.start(t0); o.stop(t0 + 0.85);
    });
  }catch(e){}
}

const animals = ['🦊','🐼','🐻','🐯','🐨','🐵']; // 6 pairs
const totalPairs = animals.length;
document.getElementById('pairs').textContent = totalPairs;

const board = document.getElementById('board');
const movesEl = document.getElementById('moves');
const matchedEl = document.getElementById('matched');
const timeEl = document.getElementById('time');
const overlay = document.getElementById('overlay');
const winStats = document.getElementById('winStats');

let deck = [];
let flipped = [];
let moves = 0;
let matched = 0;
let timer = null;
let seconds = 0;
let busy = false;

function formatTime(s){
  const m = Math.floor(s/60).toString().padStart(2,'0');
  const sec = (s%60).toString().padStart(2,'0');
  return `${m}:${sec}`;
}

function startTimer(){
  if(timer) return;
  timer = setInterval(()=>{
    seconds++;
    timeEl.textContent = formatTime(seconds);
  },1000);
}
function stopTimer(){clearInterval(timer);timer=null}

function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function buildDeck(){
  const cards = [...animals, ...animals];
  shuffle(cards);
  deck = cards;
  board.innerHTML='';
  cards.forEach((symbol,idx)=>{
    const card = document.createElement('div');
    card.className='card';
    card.dataset.animal = symbol;
    card.innerHTML = `
      <div class="inner">
        <div class="face front"><div class="pattern">🏙️</div></div>
        <div class="face back">${symbol}</div>
      </div>`;
    card.addEventListener('click',()=>onCardClick(card));
    board.appendChild(card);
  });
}

function onCardClick(card){
  if(busy) return;
  if(card.classList.contains('flipped')||card.classList.contains('matched')) return;
  if(flipped.length===0){
    startTimer();
  }
  flipCard(card);
  flipped.push(card);
  if(flipped.length===2){
    moves++;
    movesEl.textContent = moves;
    const [a,b] = flipped;
    if(a.dataset.animal === b.dataset.animal){
      // match
      playSuccess();
      a.classList.add('matched');
      b.classList.add('matched');
      matched+=1;
      matchedEl.textContent = matched;
      flipped=[];
      if(matched===totalPairs){
        // win
        stopTimer();
        setTimeout(()=>showWin(),400);
      }
    } else {
      playFail();
      busy=true;
      setTimeout(()=>{
        unflipCard(a);unflipCard(b);
        flipped=[];busy=false;
      },700);
    }
  }
}

function flipCard(card){card.classList.add('flipped');}
function unflipCard(card){card.classList.remove('flipped');}

function resetGame(){
  stopTimer();seconds=0;timeEl.textContent='00:00';
  moves=0;matched=0;flipped=[];busy=false;
  movesEl.textContent = '0';matchedEl.textContent='0';
  buildDeck();
}

function showWin(){
  overlay.classList.add('show');
  winStats.textContent = `用時 ${formatTime(seconds)} • 共 ${moves} 步`;
}

// controls
document.getElementById('restart').addEventListener('click',()=>{
  resetGame();
});
document.getElementById('playAgain').addEventListener('click',()=>{overlay.classList.remove('show');resetGame();});
document.getElementById('closeModal').addEventListener('click',()=>{overlay.classList.remove('show');});

// keyboard accessibility: press space/enter to flip when focused
board.addEventListener('keydown', e=>{
  if(e.key==='Enter' || e.key===' ') {
    const focused = document.activeElement;
    if(focused && focused.classList.contains('card')){
      focused.click();
      e.preventDefault();
    }
  }
});

// init
resetGame();

/* Leaderboard: store top scores in localStorage sorted by moves (ascending).
   Each entry: {name, moves, time, date}
*/
const STORAGE_KEY = 'animal_match_leaderboard_v1';
const scoresList = document.getElementById('scoresList');
const clearScoresBtn = document.getElementById('clearScores');
const saveScoreBtn = document.getElementById('saveScore');
const playerNameInput = document.getElementById('playerName');

function loadLeaderboard(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){return []}
}

function saveLeaderboard(list){
  try{localStorage.setItem(STORAGE_KEY, JSON.stringify(list))}catch(e){console.error(e)}
}

function renderLeaderboard(){
  const list = loadLeaderboard();
  scoresList.innerHTML = '';
  if(list.length===0){
    const li = document.createElement('li'); li.textContent='暫無紀錄'; li.style.listStyle='none'; scoresList.appendChild(li); return;
  }
  list.forEach((s)=>{
    const li = document.createElement('li');
    const label = document.createElement('div'); label.textContent = `${s.name || '玩家'} `;
    const meta = document.createElement('div'); meta.style.color='var(--muted)'; meta.style.fontSize='13px'; meta.textContent = `${s.moves} 步 • ${s.time}`;
    li.appendChild(label); li.appendChild(meta);
    scoresList.appendChild(li);
  });
}

function addScore(name,moves,time){
  const list = loadLeaderboard();
  list.push({name, moves, time, date:(new Date()).toISOString()});
  // sort by moves asc, then time asc
  list.sort((a,b)=> a.moves - b.moves || parseTime(a.time) - parseTime(b.time));
  // keep top 10
  const top = list.slice(0,10);
  saveLeaderboard(top);
  renderLeaderboard();
}

function parseTime(t){
  // t is mm:ss
  const [m,s] = (t||'00:00').split(':').map(Number); return m*60 + s;
}

clearScoresBtn.addEventListener('click',()=>{
  if(confirm('確定要清除排行榜嗎？')){ localStorage.removeItem(STORAGE_KEY); renderLeaderboard(); }
});

saveScoreBtn.addEventListener('click',()=>{
  const name = (playerNameInput.value || '玩家').trim();
  addScore(name, moves, formatTime(seconds));
  // disable save to avoid duplicate saves
  saveScoreBtn.disabled = true; saveScoreBtn.textContent='已儲存';
});

// Pre-fill default player name and render on load
playerNameInput.value = '玩家';
renderLeaderboard();

// When win modal opens, enable save button
function showWin(){
  playWin();
  overlay.classList.add('show');
  winStats.textContent = `用時 ${formatTime(seconds)} • 共 ${moves} 步`;
  saveScoreBtn.disabled = false; saveScoreBtn.textContent='儲存成績';
  // focus name input
  setTimeout(()=>{ playerNameInput.focus(); playerNameInput.select(); }, 120);
}
