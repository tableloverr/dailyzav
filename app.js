const stage=document.querySelector('#stage'), key='dailyzav-v6', seconds=25;
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const norm=s=>s.normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'').replace(/[^a-z0-9_]/g,'');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tiers={10:'On the Board',25:'Clear Signal',45:'Deep Cut',70:'Rare Find',100:'Perfect Signal'};
let bank,round,date,practice,log,tick,active=false,deadline;
function read(){try{return JSON.parse(localStorage.getItem(key))}catch{return null}}
function save(){if(!practice)try{localStorage.setItem(key,JSON.stringify({date,log,round}))}catch{}}
function paint(html,focus){stage.innerHTML=html;document.body.dataset.screen=stage.querySelector('form')?'play':stage.querySelector('.reveal')?'reveal':stage.querySelector('.review')?'results':'home';if(focus){const el=stage.querySelector(focus);if(el){if(el.tagName==='H2')el.tabIndex=-1;el.focus()}}}
function score(){return log.reduce((n,x)=>n+x.points,0)}
function maxScore(){return round.length*100}
function signal(){document.querySelector('#beam').style.width=score()/maxScore()*100+'%';document.querySelector('#signal').textContent=score()+' / '+maxScore()+' SIGNAL'}
function home(){const saved=read(), played=saved?.date===day();paint('<div class="meta"><span>THE ZAVIANTEE DAILY</span></div><h1>DAILY <em>ZAV</em></h1><p class="muted">Name a Zaviantee viewer or something he streamed. Deeper cuts score more.</p><div class="actions"><button id="daily">'+(played?(saved.log.length===saved.round.length?'View today’s results':'Resume today’s run'):'Start today’s run')+' →</button><button id="practice" class="alt">Practice</button></div><p class="muted">25 seconds · Wrong guesses can be retried</p>');stage.querySelector('#daily').onclick=()=>start(false);stage.querySelector('#practice').onclick=()=>start(true)}
function start(p){playCue('start');practice=p;date=day();const saved=read();const offset=p?Math.floor(Math.random()*bank.length):Math.floor(Date.parse(date)/86400000)%bank.length;round=Array.from({length:Math.min(7,bank.length)},(_,i)=>bank[(offset+i+bank.length)%bank.length]);log=[];if(!p&&saved?.date===date){log=saved.log;round=saved.round}save();signal();if(log.length>=round.length)results();else question()}
function question(){clearInterval(tick);const q=round[log.length];paint('<div class="meta"><span>'+ (practice?'PRACTICE':'DAILY')+' · '+(log.length+1)+' / '+round.length+'</span><span id="time">25s</span></div><div class="clock"><div id="bar"></div></div><div class="dots" aria-hidden="true">'+round.map((_,i)=>'<b class="'+(i<log.length?'past':i===log.length?'now':'')+'"></b>').join('')+'</div><p class="meta">'+esc(q.category)+'</p><h2>'+esc(q.prompt)+'</h2><form><input aria-label="Your answer" required maxlength="100" placeholder="Type your answer…" autocomplete="off"><button>Lock in ↵</button></form><p id="answer-status" role="status"></p><p><button id="skip" class="alt">Skip</button></p>','input');
active=true;deadline=Date.now()+seconds*1000;let lastTick, suggestion;const update=()=>{const left=Math.max(0,deadline-Date.now());const bar=document.querySelector('#bar');bar.style.width=(left/250)+'%';bar.classList.toggle('low',left<=5000);document.querySelector('#time').textContent=Math.ceil(left/1000)+'s';if(left>0&&left<=5000&&Math.ceil(left/1000)!==lastTick){lastTick=Math.ceil(left/1000);playCue('tick')}if(!left)finish('','Time’s up')};stage.querySelector('form').onsubmit=e=>{e.preventDefault();const s=stage.querySelector('input').value.trim();if(!s)return;
  if(Date.now()>=deadline){finish('','Time’s up');return}
  if(suggestion?.guess===s){finish(suggestion.answer,'');return}
  const names=q.answers.flatMap(row=>row.split('|').slice(1).map(x=>x.trim()));
  if(!names.some(name=>norm(name)===norm(s))){
    const answer=closestAnswer(s,q.answers);
    if(answer){
      suggestion={guess:s,answer};
      stage.querySelector('#answer-status').textContent='Did you mean '+answer+'? Press Enter again to lock it in.';
      playCue('hint');
      return;
    }
  }
  finish(s,'');};stage.querySelector('input').oninput=event=>{
  suggestion=null;
  event.target.removeAttribute('aria-invalid');
  stage.querySelector('#answer-status').textContent='';
};
stage.querySelector('#skip').onclick=()=>finish('','Skipped');tick=setInterval(update,50);update()}
function finish(input,reason){if(!active)return;if(Date.now()>=deadline){input='';reason='Time’s up'}const q=round[log.length];const rows=q.answers.map(s=>s.split('|').map(x=>x.trim()));const hit=rows.find(r=>r.slice(1).some(a=>norm(a)===norm(input)));if(input&&!hit){const field=stage.querySelector('input');field.setAttribute('aria-invalid','true');stage.querySelector('#answer-status').textContent='Not on the board. Try another answer.';field.focus();field.select();playCue('reject');return}active=false;clearInterval(tick);const points=hit?Number(hit[0]):0;const name=hit?tiers[points]:reason||'Not on the board';playCue(points===100?'jackpot':points>=70?'rare':points?'hit':'timeout');log.push({input,points,name});save();signal();const rare=rows.reduce((best,row)=>+row[0]>+best[0]?row:best,rows[0]);paint('<div class="meta"><span>ROUND '+log.length+' / '+round.length+' · ANSWER REVEAL</span><span>'+score()+' PTS TOTAL</span></div><div class="reveal '+(points===100?'jackpot':points>=70?'rare':'')+'"><h2>'+esc(name)+'</h2><div class="points">+'+points+'</div><p>'+esc(hit?hit[1]:input||'No answer locked in')+'</p></div><p class="muted">Top pick: '+esc(rare[1])+' · '+rare[0]+' pts</p><button id="next">'+(log.length===round.length?'See results':'Next prompt')+' →</button>','#next');stage.querySelector('#next').onclick=()=>log.length===round.length?results():question()}
function results(){paint('<div class="meta">'+(practice?'PRACTICE':'DAILY')+' · '+esc(date)+'</div><h2>That’s a wrap.</h2><div class="points">'+score()+' / '+round.length+'00</div><ol class="review">'+log.map((r,i)=>'<li><span><small>'+esc(round[i].prompt)+'</small>'+esc(r.input||'—')+' · '+esc(r.name)+'</span><b>+'+r.points+'</b></li>').join('')+'</ol><div class="actions"><button id="share">Copy score</button><button id="home" class="alt">Back to studio</button></div><p id="share-status" role="status"></p>','h2');stage.querySelector('#home').onclick=home;stage.querySelector('#share').onclick=async()=>{const s='Daily Zav · '+date+(practice?' (practice)':'')+' · '+score()+'/'+maxScore()+'\n'+log.map(r=>r.points===100?'🟨':r.points>=70?'🟩':r.points?'🟪':'⬛').join('')+'\n'+location.href;try{await navigator.clipboard.writeText(s);stage.querySelector('#share-status').textContent='Score copied.'}catch{stage.querySelector('#share-status').textContent=s}}}
fetch('questions.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{if(!Array.isArray(data)||data.length<1||!data.every(q=>q?.category&&q?.prompt&&Array.isArray(q.answers)&&q.answers.length>0&&q.answers.every(a=>typeof a==='string'&&/^(10|25|45|70|100)\s*\|\s*\S/.test(a))))throw Error();bank=data;home()}).catch(()=>paint('<h2>Off air</h2><p>The question bank couldn’t load. Refresh to try again.</p>'));
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
    const notes={start:[196,294,392],hint:[294,440],rare:[330,440,554,740,880],reject:[185,130],tick:[415],hit:[330,494,659],jackpot:[392,523,659,784,1047],timeout:[247,165]}[kind];
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
function typoDistance(a,b){
  const grid=Array.from({length:a.length+1},(_,i)=>Array.from({length:b.length+1},(_,j)=>i===0?j:j===0?i:0));
  for(let i=1;i<=a.length;i++){
    for(let j=1;j<=b.length;j++){
      const mismatch=Number(a[i-1]!==b[j-1]);
      grid[i][j]=Math.min(grid[i-1][j]+1,grid[i][j-1]+1,grid[i-1][j-1]+mismatch);
      if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]){
        grid[i][j]=Math.min(grid[i][j],grid[i-2][j-2]+1);
      }
    }
  }
  return grid[a.length][b.length];
}
function answerForms(name){
  const words=name.toLowerCase().match(/[a-z]+|[0-9]+/g)||[];
  const numbers={ii:'2',iii:'3',iv:'4',two:'2',three:'3',four:'4'};
  const converted=words.map(word=>numbers[word]||word);
  const initials=converted.filter(word=>!['a','an','the','at','and','of','to','with'].includes(word))
    .map(word=>/^[0-9]+$/.test(word)?word:word[0]).join('');
  return { compact:norm(name), converted:converted.join(''), initials:words.length>=3?initials:'', words:converted };
}
function closestAnswer(guess,rows){
  const typed=norm(guess);
  if(typed.length<2)return null;
  const input=answerForms(guess);
  const limit=typed.length>=9?2:1;
  let best=null, bestScore=Infinity, tied=false;
  for(const row of rows){
    const [,canonical,...aliases]=row.split('|').map(value=>value.trim());
    let candidateScore=Infinity;
    for(const name of [canonical,...aliases]){
      const form=answerForms(name);
      if(input.converted===form.converted||typed===form.initials){
        candidateScore=Math.min(candidateScore,0);
      }else if(typed.length>=4&&(form.compact.startsWith(typed)||form.converted.startsWith(input.converted))){
        candidateScore=Math.min(candidateScore,1);
      }else if(typed.length>=4&&(form.words.includes(input.converted)||(typed.length>=6&&form.compact.includes(typed)))){
        candidateScore=Math.min(candidateScore,2);
      }else if(typed.length>=4&&Math.abs(typed.length-form.compact.length)<=limit){
        const edits=typoDistance(typed,form.compact);
        if(edits<=limit)candidateScore=Math.min(candidateScore,2+edits);
      }
    }
    if(candidateScore<bestScore){best=canonical;bestScore=candidateScore;tied=false}
    else if(candidateScore===bestScore&&best!==canonical){tied=true}
  }
  return tied?null:best;
}
