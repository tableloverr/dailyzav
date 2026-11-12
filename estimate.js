const questions = [
  { category:'Rainbow Six Siege', answer:281 },
  { category:'Roblox', answer:33.9 },
  { category:'Fall Guys', answer:14.6 },
  { category:'Fortnite', answer:259 },
  { category:'GeoGuessr', answer:31.4 },
  { category:'Clash Royale', answer:16 },
  { category:'The Walking Dead', answer:18.1 },
  { category:'Red Dead Redemption II', answer:6.1 },
  { category:'Minecraft', answer:2.9 }
];
const size = 3;
const storageKey = 'dailyzav-estimate-v1';
const screen = document.querySelector('#screen');
const progress = document.querySelector('#progress');
const day = new Intl.DateTimeFormat('en-CA', {
  timeZone:'America/Chicago', year:'numeric', month:'2-digit', day:'2-digit'
}).format(new Date());
const dayNumber = Math.floor(Date.parse(day + 'T00:00:00Z') / 86400000);
const launchDay = Math.floor(Date.parse('2026-11-12T00:00:00Z') / 86400000);
const first = (((dayNumber - launchDay) * size) % questions.length + questions.length) % questions.length;
const daily = Array.from({length:size}, (_, index) => questions[(first + index) % questions.length]);
const format = new Intl.NumberFormat('en-US', {maximumFractionDigits:2});
let guesses = [];
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved?.day === day && Array.isArray(saved.guesses) && saved.guesses.length <= size &&
      saved.guesses.every(value => Number.isFinite(value) && value > 0)) guesses = saved.guesses;
} catch {}

function save(){
  try { localStorage.setItem(storageKey, JSON.stringify({day, guesses})); } catch {}
}
function factor(guess, answer){return Math.max(guess / answer, answer / guess)}
function scoreLabel(value){return (value === 1 ? '1.00' : value < 1.01 ? '<1.01' : format.format(value)) + '×'}
function show(html){
  screen.innerHTML = html;
  const heading = screen.querySelector('h1');
  heading.tabIndex = -1;
  heading.focus();
}
function home(){
  progress.textContent = day;
  const action = guesses.length === size ? 'View today’s score' : guesses.length ? 'Resume today’s game' : 'Play today';
  show('<h1>How close can you get?</h1><p>Estimate Zaviantee’s Twitch airtime across three games. You get one guess per round. A perfect guess scores 1.00×. Lower is better.</p>'+
    '<p class="hint">The answers use a fixed channel stats snapshot from November 2026. A different set rotates in at midnight Central.</p>'+
    '<div class="actions"><button id="play">'+action+' →</button></div>');
  screen.querySelector('#play').onclick = () => guesses.length === size ? results() : prompt();
}
function prompt(){
  const index = guesses.length;
  const question = daily[index];
  progress.textContent = 'Round ' + (index + 1) + ' / ' + size;
  show('<p class="kicker">TWITCH AIRTIME</p><h1>How many hours did Zav stream '+question.category+'?</h1>'+
    '<p class="hint">Use the channel’s November 2026 stats snapshot as the cutoff.</p>'+
    '<form><label for="guess">Your estimate</label><div class="input-row"><input id="guess" type="text" inputmode="decimal" autocomplete="off" maxlength="24" required placeholder="0"><span>HOURS</span></div>'+
    '<p class="error" id="error" role="status"></p><button>Lock it in ↵</button></form>');
  const field = screen.querySelector('#guess');
  field.focus();
  screen.querySelector('form').onsubmit = event => {
    event.preventDefault();
    const raw = field.value.trim();
    const value = Number(raw.replace(/,/g, ''));
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$|^\.\d+$/.test(raw) || !Number.isFinite(value) || value <= 0 || !Number.isFinite(factor(value, question.answer))) {
      screen.querySelector('#error').textContent = 'Enter a number greater than zero, such as 35 or 12.5.';
      return;
    }
    guesses.push(value);
    save();
    reveal(index);
  };
}
function reveal(index){
  const question = daily[index];
  const guess = guesses[index];
  const difference = factor(guess, question.answer);
  const direction = guess === question.answer ? 'Exactly right' : guess < question.answer ? 'Too low' : 'Too high';
  show('<div class="reveal"><p class="kicker">'+question.category+'</p><h1 class="score">'+scoreLabel(difference)+'</h1><p>'+direction+'</p>'+
    '<div class="comparison"><div><small>Your guess</small><strong>'+format.format(guess)+' h</strong></div>'+
    '<div><small>Recorded airtime</small><strong>'+format.format(question.answer)+' h</strong></div></div>'+
    '<p class="hint">Source: the Zaviantee channel stats snapshot supplied for Daily Zav, November 2026.</p>'+
    '<div class="actions"><button id="next">'+(guesses.length === size ? 'See results' : 'Next question')+' →</button></div></div>');
  screen.querySelector('#next').onclick = () => guesses.length === size ? results() : prompt();
}
function results(){
  progress.textContent = 'Daily results';
  const average = guesses.reduce((sum, guess, index) => sum + factor(guess, daily[index].answer) / size, 0);
  show('<h1 class="score">'+scoreLabel(average)+'</h1><p>Average error factor · Lower is better</p><ol class="recap">'+
    daily.map((question, index) => '<li><strong>'+question.category+' · '+scoreLabel(factor(guesses[index], question.answer))+
      '</strong><span>'+format.format(guesses[index])+' h guessed · '+format.format(question.answer)+' h recorded</span></li>').join('')+
    '</ol><div class="actions"><button id="copy">Copy score</button><button class="secondary" id="back">Back to start</button></div><p id="copy-status" role="status"></p>');
  screen.querySelector('#back').onclick = home;
  screen.querySelector('#copy').onclick = async () => {
    const message = 'Zav Estimate · '+day+' · '+scoreLabel(average)+'\n'+
      guesses.map((guess,index)=>scoreLabel(factor(guess,daily[index].answer))).join(' / ')+'\n'+location.href;
    try { await navigator.clipboard.writeText(message); screen.querySelector('#copy-status').textContent = 'Score copied.'; }
    catch { screen.querySelector('#copy-status').textContent = message; }
  };
}
home();
