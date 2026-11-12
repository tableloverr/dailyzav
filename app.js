const stage=document.querySelector('#stage'), key='dailyzav-v15', seconds=25;
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const norm=s=>s.normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'').replace(/[^a-z0-9_]/g,'');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tiers={10:'On the Board',25:'Clear Signal',45:'Deep Cut',70:'Rare Find',100:'One in a Shower'};
let bank,round,date,practice,log,tick,active=false,deadline;
function read(){try{return JSON.parse(localStorage.getItem(key))}catch{return null}}
function save(){if(!practice)try{localStorage.setItem(key,JSON.stringify({date,log,round}))}catch{}}
function paint(html,focus){stage.innerHTML=html;document.body.dataset.screen=stage.querySelector('form')?'play':stage.querySelector('.reveal')?'reveal':stage.querySelector('.review')?'results':'home';if(focus){const el=stage.querySelector(focus);if(el){if(el.tagName==='H2')el.tabIndex=-1;el.focus()}}}
function score(){return log.reduce((n,x)=>n+x.points,0)}
function maxScore(){return round.length*100}
function signal(){renderHud();document.querySelector('#beam').style.width=score()/maxScore()*100+'%';document.querySelector('#signal').textContent=score()+' / '+maxScore()+' SIGNAL'}
function home(){document.querySelector('#round-hud').replaceChildren();document.querySelector('#signal').textContent='SIGNAL STANDBY';document.querySelector('#beam').style.width='0%';const saved=read(), played=saved?.date===day();paint('<div class="meta"><span>THE ZAVIANTEE DAILY</span></div><h1>DAILY <em>ZAV</em></h1><p class="muted">Seven rounds of Zaviantee trivia, from Twitch deep cuts to YouTube Shorts.</p><div class="actions"><button id="daily">'+(played?(saved.log.length===saved.round.length?'View today’s results':'Resume today’s run'):'Start today’s run')+' →</button><a class="estimate-action" href="estimate.html?v=clean">Zav Estimate →</a></div><p class="muted">7 rounds · 25 seconds each · Retry wrong guesses</p>');stage.querySelector('#daily').onclick=()=>start(false)}
function start(p){playCue('start');practice=p;date=day();const saved=read();const offset=p?Math.floor(Math.random()*bank.length):Math.floor(Date.parse(date)/86400000)%bank.length;round=Array.from({length:Math.min(7,bank.length)},(_,i)=>bank[(offset+i+bank.length)%bank.length]);log=[];if(!p&&saved?.date===date){log=saved.log;round=saved.round}save();signal();if(log.length>=round.length)results();else question()}
function question(){renderHud(true);clearInterval(tick);const q=round[log.length];paint('<div class="meta"><span>'+ (practice?'PRACTICE':'DAILY')+' · '+(log.length+1)+' / '+round.length+'</span><span id="time">25s</span></div><div class="clock"><div id="bar"></div></div><div class="dots" aria-hidden="true">'+round.map((_,i)=>'<b class="'+(i<log.length?'past':i===log.length?'now':'')+'"></b>').join('')+'</div><p class="meta">'+esc(q.category)+'</p><h2>'+esc(q.prompt)+'</h2><form><input aria-label="Your answer" required maxlength="100" placeholder="Type your answer…" autocomplete="off"><button>Lock in ↵</button></form><p id="answer-status" role="status"></p><p><button id="skip" class="alt">Skip</button></p>','input');
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
function finish(input,reason){if(!active)return;if(Date.now()>=deadline){input='';reason='Time’s up'}const q=round[log.length];const rows=q.answers.map(s=>s.split('|').map(x=>x.trim()));const hit=rows.find(r=>r.slice(1).some(a=>norm(a)===norm(input)));if(input&&!hit){const field=stage.querySelector('input');field.setAttribute('aria-invalid','true');stage.querySelector('#answer-status').textContent='Not on the board. Try another answer.';field.focus();field.select();playCue('reject');return}active=false;clearInterval(tick);const points=hit?Number(hit[0]):0;const name=hit?tiers[points]:reason||'Not on the board';playCue(points===100?'jackpot':points>=70?'rare':points?'hit':'timeout');log.push({input,points,name,canonical:hit?.[1]});save();signal();paint('<div class="meta"><span>ROUND '+log.length+' / '+round.length+' · ANSWER REVEAL</span><span>'+score()+' PTS TOTAL</span></div><div class="reveal '+(points===100?'jackpot':points>=70?'rare':'')+'"><h2>'+esc(name)+'</h2><div class="points">+'+points+'</div><p>'+esc(hit?hit[1]:input||'No answer locked in')+'</p></div><button id="next">'+(log.length===round.length?'See results':'Next prompt')+' →</button>','#next');stage.querySelector('#next').onclick=()=>{playCue('advance');log.length===round.length?results():question()};animateReveal(points);}
function results(){paint('<div class="meta">'+(practice?'PRACTICE':'DAILY')+' · '+esc(date)+'</div><h2>That’s a wrap.</h2><div class="points">'+score()+' / '+round.length+'00</div>'+scoreTrack()+'<ol class="review">'+log.map((r,i)=>'<li><span><small>'+esc(round[i].prompt)+'</small>'+esc(r.input||'—')+' · '+esc(r.name)+'</span><b>+'+r.points+'</b></li>').join('')+'</ol><div class="actions"><button id="share">Copy score</button><button id="home" class="alt">Back to studio</button></div><p id="share-status" role="status"></p>','h2');if(log.length===round.length)round.forEach((question,i)=>mountAnswerBoard(stage,question,log[i].canonical||log[i].input,stage.querySelector('.actions')));stage.querySelector('#home').onclick=home;stage.querySelector('#share').onclick=async()=>{const s='Daily Zav · '+date+(practice?' (practice)':'')+' · '+score()+'/'+maxScore()+'\n'+log.map(r=>r.points===100?'🟨':r.points>=70?'🟩':r.points?'🟪':'⬛').join('')+'\n'+location.href;try{await navigator.clipboard.writeText(s);stage.querySelector('#share-status').textContent='Score copied.'}catch{stage.querySelector('#share-status').textContent=s}}}
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
    const notes={start:[196,294,392],advance:[262,392],hint:[294,440],rare:[330,440,554,740,880],reject:[185,130],tick:[415],hit:[330,494,659],jackpot:[392,523,659,784,1047],timeout:[247,165]}[kind];
    notes.forEach((frequency,index)=>{
      const start=audioContext.currentTime+index*.074;
      const oscillator=audioContext.createOscillator();
      const gain=audioContext.createGain();
      oscillator.type=kind==='reject'?'sine':'triangle';
      oscillator.frequency.setValueAtTime(frequency,start);
      if(kind==='jackpot')oscillator.frequency.exponentialRampToValueAtTime(frequency*1.06,start+.18);
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
function closestAnswer(guess, rows){
  const typed=norm(guess).replace(/_/g,'');
  if(typed.length<2)return null;
  const input=answerForms(guess);
  let best=null, highest=0, runnerUp=0;
  for(const row of rows){
    const [,canonical,...aliases]=row.split('|').map(value=>value.trim());
    const confidence=Math.max(...[canonical,...aliases].map(name=>matchConfidence(typed,input,name)));
    if(confidence>highest){runnerUp=highest;highest=confidence;best=canonical}
    else if(canonical!==best)runnerUp=Math.max(runnerUp,confidence);
  }
  return highest>=.72&&highest-runnerUp>=.045?best:null;
}

function matchConfidence(typed, input, name){
  const form=answerForms(name);
  const target=form.compact.replace(/_/g,'');
  if(typed===target||input.converted===form.converted)return 1;
  if(typed===form.initials)return .98;
  if(typed.length<3)return 0;
  const meaningful=words=>words.filter(word=>!['the','a','an','of','and','at','to','with'].includes(word));
  const sourceWords=meaningful(input.words), targetWords=meaningful(form.words);
  if(sourceWords.length>1&&sourceWords.every(word=>targetWords.includes(word)))return .93;
  if(typed.length>=4&&(target.startsWith(typed)||form.converted.startsWith(input.converted)))return .96;
  if(typed.length>=4&&(targetWords.includes(typed)||(typed.length>=6&&target.includes(typed))))return .91;

  const size=Math.max(typed.length,target.length);
  const distance=typoDistance(typed,target);
  const allowed=typed.length<=4?1:typed.length<=8?2:typed.length<=13?3:4;
  let score=distance<=allowed ? .99-distance/size*.86 : 0;

  if(typed.length>=5&&typed.length<target.length){
    // Compare an incomplete guess against prefixes, allowing typos within it.
    for(let len=typed.length-1;len<=Math.min(target.length-1,typed.length+1);len++){
      const edits=typoDistance(typed,target.slice(0,len));
      if(edits<=Math.min(2,allowed))score=Math.max(score,.94-edits/Math.max(typed.length,len)*.9);
    }
  }

  if(sourceWords.length>=2&&targetWords.length>=2){
    const used=new Set();
    let matched=0;
    for(const word of sourceWords){
      let bestIndex=-1, bestWord=0;
      targetWords.forEach((other,index)=>{
        if(used.has(index))return;
        const ratio=word===other?1:Math.min(word.length,other.length)>=3?
          1-typoDistance(word,other)/Math.max(word.length,other.length):0;
        if(ratio>bestWord){bestWord=ratio;bestIndex=index}
      });
      if(bestWord>=.6){used.add(bestIndex);matched+=bestWord}
    }
    score=Math.max(score,.94*matched/sourceWords.length);
  }
  return score;
}

function scoreTrack(){
  return '<div class="score-track" aria-label="Points per round">'+log.map((entry,index)=>
    '<div class="score-column"><div class="score-rail"><i style="--level:'+entry.points+'%"></i></div><b>'+entry.points+'</b><small>R'+(index+1)+'</small></div>'
  ).join('')+'</div>';
}

function mountAnswerBoard(parent, question, picked, before=null){
  const rows=question.answers.map(line=>{
    const [points,name,...aliases]=line.split('|').map(part=>part.trim());
    return {points:Number(points),name,aliases};
  }).sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name));
  const board=document.createElement('details');
  board.className='answer-board';
  board.innerHTML='<summary><span>Explore answers</span><small>'+rows.length+' accepted</small></summary>'+
    '<div class="board-content"><h3>'+esc(question.prompt)+'</h3>'+
    '<div class="board-controls"><label>Search answers<input type="search" placeholder="Search names or titles"></label>'+
    '<label>Rarity<select><option value="">All tiers</option>'+
    Object.keys(tiers).reverse().filter(points=>rows.some(row=>row.points===Number(points))).map(points=>
      '<option value="'+points+'">'+esc(tiers[points])+' · '+points+' pts</option>'
    ).join('')+'</select></label></div>'+
    '<p class="board-count" role="status"></p>'+
    '<ul class="answer-scroll" tabindex="0" aria-label="Accepted answers"></ul></div>';
  parent.insertBefore(board,before);
  if(question.source?.startsWith('https://')){
    const source=document.createElement('a');
    source.href=question.source;
    source.target='_blank';
    source.rel='noopener noreferrer';
    source.textContent='Source ↗';
    source.className='board-source';
    board.querySelector('.board-content').append(source);
  }
  const search=board.querySelector('input'), filter=board.querySelector('select');
  const list=board.querySelector('ul');
  function render(){
    const query=norm(search.value);
    const matches=rows.filter(row=>(!filter.value||row.points===Number(filter.value))&&
      (!query||[row.name,...row.aliases].some(value=>norm(value).includes(query))));
    list.innerHTML=matches.map(row=>
      '<li><span>'+esc(row.name)+(picked&&norm(picked)===norm(row.name)?' <small class="your-pick">Your answer</small>':'')+
      '</span><strong data-tier="'+row.points+'">'+row.points+' pts</strong></li>'
    ).join('');
    board.querySelector('.board-count').textContent=matches.length?
      matches.length+' '+(matches.length===1?'answer':'answers'):'No matching answers';
    list.scrollTop=0;
  }
  search.oninput=filter.onchange=render;
  board.addEventListener('toggle',()=>{if(board.open)render()});
}
function animateReveal(points){
  if(!points||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const reveal=stage.querySelector('.reveal');
  const value=reveal.querySelector('.points');
  const burst=document.createElement('span');
  burst.className='signal-burst';
  burst.setAttribute('aria-hidden','true');
  const count=points===100?28:points>=70?18:10;
  for(let i=0;i<count;i++){
    const spark=document.createElement('i');
    const angle=i/count*Math.PI*2;
    const radius=(points===100?120:72)+(i%5)*12;
    spark.style.setProperty('--x',Math.cos(angle)*radius+'px');
    spark.style.setProperty('--y',Math.sin(angle)*radius+'px');
    spark.style.setProperty('--delay',i%4*25+'ms');
    burst.append(spark);
  }
  reveal.append(burst);
  const duration=points===100?780:460;
  const start=performance.now();
  value.textContent='+0';
  function countUp(now){
    if(!value.isConnected)return;
    const time=Math.min(1,(now-start)/duration);
    value.textContent='+'+Math.round(points*(1-(1-time)**3));
    if(time<1)requestAnimationFrame(countUp);
  }
  requestAnimationFrame(countUp);
}


function renderHud(current=false){
  const hud=document.querySelector('#round-hud');
  hud.replaceChildren(...round.map((_,index)=>{
    const cell=document.createElement('span');
    cell.textContent=String(index+1).padStart(2,'0');
    const result=log[index];
    cell.className=result?(result.points>=70?'rare-hit':result.points?'hit':'miss'):current&&index===log.length?'current':'';
    cell.setAttribute('aria-label','Round '+(index+1)+(result?', '+result.points+' points':current&&index===log.length?', current':''));
    return cell;
  }));
}
