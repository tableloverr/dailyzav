const questions = [
  { category:'Siege airtime', unit:'hours', answer:281, prompt:'How many hours did Zav stream Rainbow Six Siege?', source:'The supplied November 2026 Twitch category snapshot.' },
  { category:'Twitch peak', unit:'viewers', answer:141, prompt:'What was Zav’s peak concurrent viewership in Just Chatting?', source:'The peak-viewer column of the supplied Twitch category snapshot.' },
  { category:'YouTube subscribers', unit:'subscribers', answer:330, prompt:'How many subscribers did Zav’s YouTube channel show in the November snapshot?', source:'Zaviantee’s YouTube channel header, observed November 12, 2026.' },
  { category:'YouTube uploads', unit:'videos', answer:212, prompt:'How many videos did Zav’s YouTube channel list in the November snapshot?', source:'Zaviantee’s YouTube channel header, observed November 12, 2026. This is the channel’s displayed video count.' },
  { category:'Twitch variety', unit:'categories', answer:47, prompt:'How many distinct categories were in Zav’s November Twitch stats list?', source:'The supplied list contains 49 rows. Until Dawn and Among Us appear twice.' },
  { category:'Viewer leaderboard', unit:'accounts', answer:1299, prompt:'How many named accounts were on Zav’s original viewer leaderboard?', source:'The supplied leaderboard has 1,300 positions with one blank handle. Bot accounts count here.' },
  { category:'Channel age', unit:'days', answer:800, prompt:'How many days passed between Zav creating his Twitch account and November 12, 2026?', source:'TwitchTracker gives September 3, 2024 as the account creation date. The calendar difference is 800 days.' }
];
const size = 7;
const storageKey = 'dailyzav-estimate-v2';
const screen = document.querySelector('#screen');
const progress = document.querySelector('#progress');
const day = new Intl.DateTimeFormat('en-CA', {
  timeZone:'America/Chicago', year:'numeric', month:'2-digit', day:'2-digit'
}).format(new Date());
const dayNumber = Math.floor(Date.parse(day + 'T00:00:00Z') / 86400000);
const launchDay = Math.floor(Date.parse('2026-11-12T00:00:00Z') / 86400000);
const first = ((dayNumber - launchDay) % questions.length + questions.length) % questions.length;
const daily = Array.from({length:size}, (_, index) => questions[(first + index) % questions.length]);
const format = new Intl.NumberFormat('en-US', {maximumFractionDigits:2});
document.querySelector('#edition').textContent = 'No. '+Math.max(1, dayNumber - launchDay + 1);
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
  show('<h1>How close can you get?</h1><p>Estimate seven numbers from Zaviantee’s Twitch, YouTube, and community history. You get one guess per round. A perfect guess scores 1.00×. Lower is better.</p>'+
    '<p class="hint">The answers use a fixed channel stats snapshot from November 2026. The order rotates at midnight Central.</p>'+
    '<div class="actions"><button id="play">'+action+' →</button></div>');
  screen.querySelector('#play').onclick = () => guesses.length === size ? results() : prompt();
}
function prompt(){
  const index = guesses.length;
  const question = daily[index];
  progress.textContent = 'Q' + (index + 1) + ' / ' + size;
  show('<p class="kicker">'+question.category+'</p><h1>'+question.prompt+'</h1>'+
    '<p class="hint">Use the November 2026 snapshot.</p>'+
    '<form><label for="guess" class="sr-only">Your estimate</label><div class="input-row"><input id="guess" type="text" inputmode="decimal" autocomplete="off" maxlength="24" required placeholder="your guess"><span>'+question.unit+'</span></div>'+
    '<p class="error" id="error" role="status"></p><div class="actions prompt-actions"><button type="button" id="calculator" class="secondary" aria-label="Calculator" aria-expanded="false">▦</button><button>Lock it in ↵</button></div></form><div id="calculator-panel" hidden></div>');
  const field = screen.querySelector('#guess');
  field.focus();
  mountCalculator(field);
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
    '<div class="comparison"><div><small>Your guess</small><strong>'+format.format(guess)+' '+question.unit+'</strong></div>'+
    '<div><small>Recorded answer</small><strong>'+format.format(question.answer)+' h</strong></div></div>'+
    '<p class="hint">'+question.source+'</p>'+
    '<div class="actions"><button id="next">'+(guesses.length === size ? 'See results' : 'Next question')+' →</button></div></div>');
  screen.querySelector('#next').onclick = () => guesses.length === size ? results() : prompt();
}
function results(){
  progress.textContent = 'Daily results';
  const average = guesses.reduce((sum, guess, index) => sum + factor(guess, daily[index].answer) / size, 0);
  show('<h1 class="score">'+scoreLabel(average)+'</h1><p>Average error factor · Lower is better</p><ol class="recap">'+
    daily.map((question, index) => '<li><strong>'+question.category+' · '+scoreLabel(factor(guesses[index], question.answer))+
      '</strong><span>'+format.format(guesses[index])+' '+question.unit+' guessed · '+format.format(question.answer)+' recorded</span></li>').join('')+
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
function calculate(expression){
  const compact=expression.replace(/\s/g,'').replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
  const tokens=compact.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+*/-]/g)||[];
  if(!tokens.length||tokens.join('')!==compact||tokens.length>100)throw Error();
  let index=0;
  function operand(){
    const token=tokens[index++];
    if(token==='('){const value=sum();if(tokens[index++]!==')')throw Error();return value}
    if(token==='-'||token==='+')return (token==='-'?-1:1)*operand();
    if(!token||!/^\d|^\./.test(token))throw Error();
    return Number(token);
  }
  function product(){
    let value=operand();
    while(tokens[index]==='*'||tokens[index]==='/'){
      const operator=tokens[index++];
      const right=operand();
      value=operator==='*'?value*right:value/right;
    }
    return value;
  }
  function sum(){
    let value=product();
    while(tokens[index]==='+'||tokens[index]==='-'){
      const operator=tokens[index++];
      const right=product();
      value=operator==='+'?value+right:value-right;
    }
    return value;
  }
  const result=sum();
  if(index!==tokens.length||!Number.isFinite(result))throw Error();
  return Number(result.toPrecision(12));
}

function mountCalculator(guess){
  const panel=screen.querySelector('#calculator-panel');
  const toggle=screen.querySelector('#calculator');
  const keys=['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','=','+','(',')','⌫','Clear'];
  panel.innerHTML='<label for="expression">Calculator</label><input id="expression" autocomplete="off" maxlength="100" placeholder="e.g. 24 × 12">'+
    '<div class="calc-grid">'+keys.map(key=>'<button type="button" data-key="'+key+'">'+key+'</button>').join('')+'</div>'+
    '<p role="status" id="calc-error"></p><button type="button" id="use-result">Use as guess</button>';
  const expression=panel.querySelector('#expression');
  const message=panel.querySelector('#calc-error');
  toggle.onclick=()=>{
    panel.hidden=!panel.hidden;
    toggle.setAttribute('aria-expanded',String(!panel.hidden));
    if(!panel.hidden)expression.focus();
  };
  function evaluate(use=false){
    try {
      const value=calculate(expression.value);
      const formatted=new Intl.NumberFormat('en-US',{useGrouping:false,maximumSignificantDigits:12}).format(value);
      expression.value=formatted;
      message.textContent='';
      if(use){guess.value=formatted;toggle.click();guess.focus()}
    } catch {message.textContent='Check the expression and try again.'}
  }
  panel.querySelector('.calc-grid').onclick=event=>{
    const key=event.target.closest('button')?.dataset.key;
    if(!key)return;
    if(key==='=')evaluate();
    else if(key==='Clear')expression.value='';
    else if(key==='⌫')expression.value=expression.value.slice(0,-1);
    else expression.value=(expression.value+key).slice(0,100);
  };
  expression.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();evaluate()}};
  panel.querySelector('#use-result').onclick=()=>evaluate(true);
}
