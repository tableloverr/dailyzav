const stage=document.querySelector('#stage'), key='dailyzav-v3', seconds=25;
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const norm=s=>s.normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'').replace(/[^a-z0-9]/g,'');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tiers={10:'On the Board',25:'Clear Signal',45:'Deep Cut',70:'Rare Find',100:'Perfect Signal'};
let bank,round,date,practice,log,tick,active=false,deadline;
function read(){try{return JSON.parse(localStorage.getItem(key))}catch{return null}}
function save(){if(!practice)try{localStorage.setItem(key,JSON.stringify({date,log,round}))}catch{}}
function paint(html,focus){stage.innerHTML=html;document.body.dataset.screen=stage.querySelector('form')?'play':stage.querySelector('.reveal')?'reveal':stage.querySelector('.review')?'results':'home';if(focus){const el=stage.querySelector(focus);if(el){if(el.tagName==='H2')el.tabIndex=-1;el.focus()}}}
function score(){return log.reduce((n,x)=>n+x.points,0)}
function signal(){document.querySelector('#beam').style.width=score()/7+'%';document.querySelector('#signal').textContent=score()+' / 700 SIGNAL'}
function home(){const saved=read(), played=saved?.date===day();paint('<div class="meta"><span>THE ZAVIANTEE DAILY</span></div><h1>DAILY <em>ZAV</em></h1><p class="muted">Seven prompts from Zaviantee’s streams and clips. Hunt for the deep cuts.</p><div class="actions"><button id="daily">'+(played?(saved.log.length===7?'View today’s results':'Resume today’s run'):'Start today’s run')+' →</button><button id="practice" class="alt">Practice</button></div><p class="muted">25 seconds per prompt · Wrong guesses can be retried</p>');stage.querySelector('#daily').onclick=()=>start(false);stage.querySelector('#practice').onclick=()=>start(true)}
function start(p){playCue('start');practice=p;date=day();const saved=read();const offset=p?Math.floor(Math.random()*bank.length):Math.floor(Date.parse(date)/86400000)%bank.length;round=Array.from({length:7},(_,i)=>bank[(offset+i+bank.length)%bank.length]);log=[];if(!p&&saved?.date===date){log=saved.log;round=saved.round}save();signal();if(log.length>=7)results();else question()}
function question(){clearInterval(tick);const q=round[log.length];paint('<div class="meta"><span>'+ (practice?'PRACTICE':'DAILY')+' · '+(log.length+1)+' / 7</span><span id="time">25s</span></div><div class="clock"><div id="bar"></div></div><div class="dots" aria-hidden="true">'+round.map((_,i)=>'<b class="'+(i<log.length?'past':i===log.length?'now':'')+'"></b>').join('')+'</div><p class="meta">'+esc(q.category)+'</p><h2>'+esc(q.prompt)+'</h2><form><input aria-label="Your answer" required maxlength="100" placeholder="Type your answer…" autocomplete="off"><button>Lock in ↵</button></form><p id="answer-status" role="status"></p><p><button id="skip" class="alt">Skip</button></p>','input');
active=true;deadline=Date.now()+seconds*1000;let lastTick;const update=()=>{const left=Math.max(0,deadline-Date.now());const bar=document.querySelector('#bar');bar.style.width=(left/250)+'%';bar.classList.toggle('low',left<=5000);document.querySelector('#time').textContent=Math.ceil(left/1000)+'s';if(left>0&&left<=5000&&Math.ceil(left/1000)!==lastTick){lastTick=Math.ceil(left/1000);playCue('tick')}if(!left)finish('','Time’s up')};stage.querySelector('form').onsubmit=e=>{e.preventDefault();const s=stage.querySelector('input').value.trim();if(s)finish(s,'')};stage.querySelector('#skip').onclick=()=>finish('','Skipped');tick=setInterval(update,50);update()}
function finish(input,reason){if(!active)return;if(Date.now()>=deadline){input='';reason='Time’s up'}const q=round[log.length];const rows=q.answers.map(s=>s.split('|').map(x=>x.trim()));const hit=rows.find(r=>r.slice(1).some(a=>norm(a)===norm(input)));if(input&&!hit){const field=stage.querySelector('input');field.setAttribute('aria-invalid','true');stage.querySelector('#answer-status').textContent='Not on the board. Try another answer.';field.focus();field.select();playCue('reject');return}active=false;clearInterval(tick);const points=hit?Number(hit[0]):0;const name=hit?tiers[points]:reason||'Not on the board';playCue(points===100?'jackpot':points?'hit':'timeout');log.push({input,points,name});save();signal();const rare=rows.reduce((best,row)=>+row[0]>+best[0]?row:best,rows[0]);paint('<div class="meta"><span>ROUND '+log.length+' / 7 · ANSWER REVEAL</span><span>'+score()+' PTS TOTAL</span></div><div class="reveal '+(points===100?'jackpot':'')+'"><h2>'+esc(name)+'</h2><div class="points">+'+points+'</div><p>'+esc(hit?hit[1]:input||'No answer locked in')+'</p></div><p class="muted">Top pick: '+esc(rare[1])+' · '+rare[0]+' pts</p><button id="next">'+(log.length===7?'See results':'Next prompt')+' →</button>','#next');stage.querySelector('#next').onclick=()=>log.length===7?results():question()}
function results(){paint('<div class="meta">'+(practice?'PRACTICE':'DAILY')+' · '+esc(date)+'</div><h2>That’s a wrap.</h2><div class="points">'+score()+' / 700</div><ol class="review">'+log.map((r,i)=>'<li><span><small>'+esc(round[i].prompt)+'</small>'+esc(r.input||'—')+' · '+esc(r.name)+'</span><b>+'+r.points+'</b></li>').join('')+'</ol><div class="actions"><button id="share">Copy score</button><button id="home" class="alt">Back to studio</button></div><p id="share-status" role="status"></p>','h2');stage.querySelector('#home').onclick=home;stage.querySelector('#share').onclick=async()=>{const s='Daily Zav · '+date+(practice?' (practice)':'')+' · '+score()+'/700\n'+log.map(r=>r.points===100?'🟨':r.points>=70?'🟩':r.points?'🟪':'⬛').join('')+'\n'+location.href;try{await navigator.clipboard.writeText(s);stage.querySelector('#share-status').textContent='Score copied.'}catch{stage.querySelector('#share-status').textContent=s}}}
fetch('questions.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{if(!Array.isArray(data)||data.length<7||!data.every(q=>q?.category&&q?.prompt&&Array.isArray(q.answers)&&q.answers.length&&q.answers.every(a=>typeof a==='string'&&/^(10|25|45|70|100)\s*\|\s*\S/.test(a))))throw Error();bank=data;home()}).catch(()=>paint('<h2>Off air</h2><p>The question bank couldn’t load. Refresh to try again.</p>'));
const soundButton=document.querySelector('#sound');
let audioContext, muted=false;
try { muted=localStorage.getItem('dailyzav-muted')==='true'; } catch {}
function updateSoundLabel(){
  soundButton.textContent=muted?'Sound off':'Sound on';
  soundButton.setAttribute('aria-pressed',String(!muted));
}
function playCue(kind){
  if(muted || !window.AudioContext)return;
  try{
    audioContext ||= new AudioContext();
    if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
    const notes={start:[196,294,392],reject:[185,130],tick:[415],hit:[330,494,659],jackpot:[392,523,659,784,1047],timeout:[247,165]}[kind];
    notes.forEach((frequency,index)=>{
      const start=audioContext.currentTime+index*.074;
      const oscillator=audioContext.createOscillator();
      const gain=audioContext.createGain();
      oscillator.type=kind==='reject'?'sine':'triangle';
      oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(.001,start);
      gain.gain.exponentialRampToValueAtTime(kind==='tick'?.023:.075,start+.012);
      gain.gain.exponentialRampToValueAtTime(.001,start+.22);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start+.23);
    });
  }catch{}
}
soundButton.onclick=()=>{
  muted=!muted;
  try{localStorage.setItem('dailyzav-muted',String(muted))}catch{}
  updateSoundLabel();
  if(!muted)playCue('start');
};
updateSoundLabel();
