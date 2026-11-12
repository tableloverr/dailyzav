const el=id=>document.getElementById(id);
const draftKey='dailyzav-question-draft-v1';
const weekDraftKey='dailyzav-week-plan-v2';
const weekTimeZone='America/Chicago';
const fields=['category','prompt','source','answers'];
let data=[],published=[],current=0;
let ideaBank,weekDates=[],weekDays=[];

function validQuestionShape(question){
  return question&&typeof question==='object'&&typeof question.category==='string'&&
    typeof question.prompt==='string'&&Array.isArray(question.answers)&&
    question.answers.every(answer=>typeof answer==='string')&&
    (question.source===undefined||typeof question.source==='string')&&
    (question.answerTarget===undefined||question.answerTarget===30);
}
function readDraft(){
  try{
    const saved=JSON.parse(localStorage.getItem(draftKey));
    if(Array.isArray(saved)&&saved.length&&saved.every(validQuestionShape))return saved;
  }catch{}
  return null;
}
function saveDraft(){
  try{localStorage.setItem(draftKey,JSON.stringify(data))}
  catch{el('status').textContent='Could not save this draft in browser storage.'}
}
function capture(){
  Object.assign(data[current],{
    category:el('category').value.trim(),
    prompt:el('prompt').value.trim(),
    source:el('source').value.trim(),
    answers:el('answers').value.split('\n').map(line=>line.trim()).filter(Boolean)
  });
  saveDraft();
}
function show(){
  el('pick').replaceChildren(...data.map((question,index)=>
    new Option((index+1)+'. '+(question.prompt||'New question'),index)
  ));
  el('pick').value=String(current);
  const question=data[current];
  el('category').value=question.category;
  el('prompt').value=question.prompt;
  el('source').value=question.source||'';
  el('answers').value=question.answers.join('\n');
}
function setBusy(busy){
  for(const id of ['add','copy','download','reset','pick'])el(id).disabled=busy;
}
function ideaCard(idea,type){
  const card=document.createElement('article');
  const content=document.createElement('div');
  const category=document.createElement('strong');
  const prompt=document.createElement('p');
  const evidence=document.createElement('small');
  const button=document.createElement('button');
  category.textContent=idea.category;
  prompt.textContent=idea.prompt;
  evidence.textContent=type==='trivia'?
    idea.evidence+' Board target: 30–50 distinct answers.':idea.evidence;
  button.type='button';
  button.textContent=type==='trivia'?'Use idea':'Copy prompt';
  button.dataset.prompt=idea.prompt;
  if(type==='trivia'){
    button.dataset.category=idea.category;
    button.dataset.answerTarget='30';
  }
  content.append(category,prompt,evidence);
  card.append(content,button);
  card.dataset.search=(idea.category+' '+idea.prompt+' '+idea.evidence).toLowerCase();
  return card;
}
function renderIdeas(ideas){
  if(!Array.isArray(ideas?.trivia)||!ideas.trivia.length||
     !Array.isArray(ideas?.estimate)||!ideas.estimate.length)throw Error('Question ideas are empty.');
  const valid=group=>group.every(idea=>typeof idea.category==='string'&&
    typeof idea.prompt==='string'&&typeof idea.evidence==='string');
  if(!valid(ideas.trivia)||!valid(ideas.estimate))throw Error('Invalid question idea.');
  ideaBank=ideas;
  el('idea-count').textContent=(ideas.trivia.length+ideas.estimate.length)+' evidence-first prompts';
  el('trivia-count').textContent='('+ideas.trivia.length+')';
  el('estimate-count').textContent='('+ideas.estimate.length+')';
  el('trivia-ideas').replaceChildren(...ideas.trivia.map(idea=>ideaCard(idea,'trivia')));
  el('estimate-ideas').replaceChildren(...ideas.estimate.map(idea=>ideaCard(idea,'estimate')));
  renderWeekPlanner();
}
function centralToday(){
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:weekTimeZone,year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(new Date());
  const part=name=>parts.find(value=>value.type===name).value;
  return new Date(Date.UTC(Number(part('year')),Number(part('month'))-1,Number(part('day'))));
}
function getNextWeekDates(){
  const today=centralToday();
  const daysUntilMonday=(8-today.getUTCDay())%7||7;
  const monday=new Date(today.getTime()+daysUntilMonday*86400000);
  return Array.from({length:7},(_,index)=>
    new Date(monday.getTime()+index*86400000).toISOString().slice(0,10)
  );
}
function formatWeekDate(date){
  return new Intl.DateTimeFormat('en-US',{
    timeZone:'UTC',weekday:'long',month:'short',day:'numeric'
  }).format(new Date(date+'T00:00:00Z'));
}
function emptyWeekDays(dates){
  return dates.map(date=>({date,trivia:Array(7).fill(''),estimate:Array(7).fill('')}));
}
function readWeekDraft(dates){
  try{
    const saved=JSON.parse(localStorage.getItem(weekDraftKey));
    const available={
      trivia:new Set(ideaBank.trivia.map(idea=>idea.prompt)),
      estimate:new Set(ideaBank.estimate.map(idea=>idea.prompt))
    };
    const validPicks=(picks,availableIdeas)=>Array.isArray(picks)&&picks.length===7&&
      picks.every(prompt=>prompt===''||availableIdeas.has(prompt))&&
      new Set(picks.filter(Boolean)).size===picks.filter(Boolean).length;
    if(saved?.startDate===dates[0]&&Array.isArray(saved.days)&&saved.days.length===7&&
       saved.days.every((day,index)=>day?.date===dates[index]&&
         validPicks(day.trivia,available.trivia)&&validPicks(day.estimate,available.estimate))){
      return saved.days.map(day=>({
        date:day.date,trivia:[...day.trivia],estimate:[...day.estimate]
      }));
    }
  }catch{}
  return emptyWeekDays(dates);
}
function saveWeekDraft(){
  try{
    localStorage.setItem(weekDraftKey,JSON.stringify({startDate:weekDates[0],days:weekDays}));
  }catch{
    el('week-status').textContent='Could not save this plan in browser storage.';
  }
}
function createIdeaSelect(dayIndex,type,questionIndex,ideas){
  const select=document.createElement('select');
  select.dataset.game=type;
  select.dataset.day=String(dayIndex);
  select.dataset.question=String(questionIndex);
  const placeholder=document.createElement('option');
  placeholder.value='';
  placeholder.textContent='Choose an idea…';
  select.append(placeholder);
  const groups=new Map();
  for(const idea of ideas){
    if(!groups.has(idea.category)){
      const group=document.createElement('optgroup');
      group.label=idea.category;
      groups.set(idea.category,group);
      select.append(group);
    }
    const option=document.createElement('option');
    option.value=idea.prompt;
    option.textContent=idea.prompt;
    groups.get(idea.category).append(option);
  }
  select.value=weekDays[dayIndex][type][questionIndex];
  select.setAttribute('aria-label',(type==='trivia'?'Trivia':'Zav Estimate')+
    ' question '+(questionIndex+1)+' for '+formatWeekDate(weekDays[dayIndex].date));
  select.addEventListener('change',()=>{
    weekDays[dayIndex][type][questionIndex]=select.value;
    saveWeekDraft();
    refreshWeekChoices(type,dayIndex);
    updateWeekProgress();
    el('week-status').textContent='Week plan saved in this browser.';
  });
  return select;
}
function refreshWeekChoices(type,dayIndex){
  const selects=el('week-days').querySelectorAll(
    'select[data-game="'+type+'"][data-day="'+dayIndex+'"]'
  );
  const selected=new Set(Array.from(selects,select=>select.value).filter(Boolean));
  for(const select of selects){
    for(const option of select.options){
      option.disabled=Boolean(option.value&&option.value!==select.value&&selected.has(option.value));
    }
  }
}
function updateWeekProgress(){
  const triviaCount=weekDays.reduce((total,day)=>total+day.trivia.filter(Boolean).length,0);
  const estimateCount=weekDays.reduce((total,day)=>total+day.estimate.filter(Boolean).length,0);
  el('week-progress').textContent='Trivia '+triviaCount+'/49 · Estimate '+estimateCount+'/49';
  weekDays.forEach((day,index)=>{
    const counter=el('week-days').querySelector('[data-day-progress="'+index+'"]');
    counter.textContent='Trivia '+day.trivia.filter(Boolean).length+'/7 · Estimate '+
      day.estimate.filter(Boolean).length+'/7';
  });
  const complete=triviaCount===49&&estimateCount===49;
  el('copy-week').disabled=!complete;
  el('download-week').disabled=!complete;
}
function renderWeekPlanner(){
  weekDates=getNextWeekDates();
  weekDays=readWeekDraft(weekDates);
  el('week-range').textContent=formatWeekDate(weekDates[0])+' – '+formatWeekDate(weekDates[6])+' · Central time';
  el('week-days').replaceChildren(...weekDays.map((day,index)=>{
    const card=document.createElement('details');
    const summary=document.createElement('summary');
    const date=document.createElement('strong');
    const progress=document.createElement('span');
    const games=document.createElement('div');
    card.className='week-day';
    card.open=index===0;
    date.textContent=formatWeekDate(day.date);
    progress.dataset.dayProgress=String(index);
    games.className='week-day-games';
    summary.append(date,progress);
    for(const [type,title,ideas] of [
      ['trivia','Trivia',ideaBank.trivia],
      ['estimate','Zav Estimate',ideaBank.estimate]
    ]){
      const fieldset=document.createElement('fieldset');
      const legend=document.createElement('legend');
      fieldset.className='week-day-game';
      legend.textContent=title+' · choose 7';
      fieldset.append(legend);
      for(let questionIndex=0;questionIndex<7;questionIndex++){
        const label=document.createElement('label');
        label.textContent='Question '+(questionIndex+1);
        label.append(createIdeaSelect(index,type,questionIndex,ideas));
        fieldset.append(label);
      }
      games.append(fieldset);
    }
    card.append(summary,games);
    return card;
  }));
  weekDays.forEach((_,index)=>{
    refreshWeekChoices('trivia',index);
    refreshWeekChoices('estimate',index);
  });
  updateWeekProgress();
  if(weekDays.some(day=>day.trivia.some(Boolean)||day.estimate.some(Boolean))){
    el('week-status').textContent='Saved week plan restored from this browser.';
  }
}
function weekPlanData(){
  const findIdea=(type,prompt)=>ideaBank[type].find(idea=>idea.prompt===prompt);
  return {
    weekStart:weekDates[0],
    weekEnd:weekDates[6],
    timeZone:weekTimeZone,
    days:weekDays.map(day=>({
      date:day.date,
      trivia:day.trivia.map(prompt=>findIdea('trivia',prompt)),
      estimate:day.estimate.map(prompt=>findIdea('estimate',prompt))
    }))
  };
}
function completeWeekPlan(){
  if(weekDays.length===7&&weekDays.every(day=>
    day.trivia.length===7&&day.trivia.every(Boolean)&&
    day.estimate.length===7&&day.estimate.every(Boolean)))return true;
  el('week-status').textContent='Choose seven ideas for every day in both games before exporting.';
  const firstMissing=Array.from(el('week-days').querySelectorAll('select')).find(select=>!select.value);
  if(firstMissing)firstMissing.focus();
  return false;
}
function downloadWeekPlan(){
  const file=new Blob([JSON.stringify(weekPlanData(),null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(file);
  const link=document.createElement('a');
  link.href=url;
  link.download='dailyzav-week-'+weekDates[0]+'.json';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function filterIdeas(inputId,containerId){
  const query=el(inputId).value.trim().toLowerCase();
  for(const card of el(containerId).querySelectorAll('article')){
    card.hidden=!card.dataset.search.includes(query);
  }
}
function answerParts(line){
  const [points,...names]=line.split('|').map(value=>value.trim());
  return {points,names};
}
function validate(){
  for(let index=0;index<data.length;index++){
    const question=data[index];
    if(!question.category||!question.prompt)return {index,message:'Add a category and prompt.'};
    const parsed=question.answers.map(answerParts);
    if(parsed.some(({points,names})=>
      !['10','25','45','70','100'].includes(points)||!names.length||names.some(name=>!/[a-z0-9]/i.test(name))
    ))return {index,message:'Check every answer row and its point tier.'};
    const distinctCount=new Set(parsed.map(row=>row.names[0].toLowerCase())).size;
    const minimum=question.answerTarget||5;
    if(distinctCount<minimum)return {index,message:'Add '+minimum+'–50 distinct, verified answers.'};
    if(question.answerTarget&&distinctCount>50)return {index,message:'Keep this board between 30 and 50 distinct answers.'};
    if(question.answerTarget&&distinctCount!==parsed.length)return {index,message:'Remove duplicate primary answers; aliases belong on the same row.'};
    if(parsed.filter(row=>row.points==='100').length!==1)return {index,message:'Each question needs exactly one 100-point answer.'};
    if(question.source){
      try{
        const source=new URL(question.source);
        if(source.protocol!=='https:')throw Error();
      }catch{return {index,message:'Use a valid HTTPS evidence URL, or leave it blank.'}}
    }
  }
  return null;
}
function download(){
  const file=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(file);
  const link=document.createElement('a');
  link.href=url;
  link.download='questions.json';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function publishableData(){
  capture();
  const error=validate();
  if(error){
    current=error.index;
    show();
    el('status').textContent=error.message+' Check question '+(error.index+1)+'.';
    return false;
  }
  return true;
}

setBusy(true);
fetch('questions.json',{cache:'no-cache'}).then(response=>{
  if(!response.ok)throw Error('Question bank request failed.');
  return response.json();
}).then(questions=>{
  if(!Array.isArray(questions)||!questions.length||!questions.every(validQuestionShape)){
    throw Error('Question bank has an invalid format.');
  }
  published=JSON.parse(JSON.stringify(questions));
  const draft=readDraft();
  data=draft||JSON.parse(JSON.stringify(published));
  show();
  if(draft)el('status').textContent='Saved draft restored from this browser.';
  setBusy(false);
}).catch(()=>{
  el('status').textContent='Could not load a valid question bank. Refresh to try again.';
});
fetch('question-ideas.json',{cache:'no-cache'}).then(response=>{
  if(!response.ok)throw Error('Question ideas request failed.');
  return response.json();
}).then(renderIdeas).catch(()=>{
  el('idea-count').textContent='Ideas unavailable';
  el('trivia-ideas').textContent='Could not load trivia ideas.';
  el('estimate-ideas').textContent='Could not load Estimate ideas.';
});

el('pick').onchange=()=>{
  capture();
  current=Number(el('pick').value);
  show();
};
el('add').onclick=()=>{
  capture();
  current=data.push({category:'',prompt:'',source:'',answers:[],answerTarget:30})-1;
  saveDraft();
  show();
  el('category').focus();
};
for(const id of fields){
  el(id).addEventListener('input',capture);
}
el('trivia-ideas').onclick=event=>{
  const button=event.target.closest('button[data-category][data-prompt]');
  if(!button)return;
  capture();
  current=data.push({
    category:button.dataset.category,
    prompt:button.dataset.prompt,
    source:'',
    answers:[],
    answerTarget:Number(button.dataset.answerTarget)
  })-1;
  saveDraft();
  show();
  el('source').focus();
  el('status').textContent='Idea added. Add an evidence URL and 30–50 distinct verified answers.';
};
el('estimate-ideas').onclick=async event=>{
  const button=event.target.closest('button[data-prompt]');
  if(!button)return;
  try{
    await navigator.clipboard.writeText(button.dataset.prompt);
    el('status').textContent='Estimate prompt copied.';
  }catch{
    el('status').textContent='Copy unavailable. Prompt: '+button.dataset.prompt;
  }
};
el('trivia-filter').oninput=()=>filterIdeas('trivia-filter','trivia-ideas');
el('estimate-filter').oninput=()=>filterIdeas('estimate-filter','estimate-ideas');
el('copy-week').onclick=async()=>{
  if(!completeWeekPlan())return;
  try{
    await navigator.clipboard.writeText(JSON.stringify(weekPlanData(),null,2)+'\n');
    el('week-status').textContent='Week plan copied as JSON.';
  }catch{
    downloadWeekPlan();
    el('week-status').textContent='Clipboard unavailable; downloaded the week plan instead.';
  }
};
el('download-week').onclick=()=>{
  if(!completeWeekPlan())return;
  downloadWeekPlan();
  el('week-status').textContent='Week plan downloaded.';
};
el('clear-week').onclick=()=>{
  if(!window.confirm('Clear all 98 choices for this week?'))return;
  weekDays=emptyWeekDays(weekDates);
  saveWeekDraft();
  renderWeekPlanner();
  el('week-status').textContent='Week plan cleared.';
};
el('copy').onclick=async()=>{
  if(!publishableData())return;
  try{
    await navigator.clipboard.writeText(JSON.stringify(data,null,2)+'\n');
    el('status').textContent='JSON copied. Open GitHub to publish it.';
  }catch{
    download();
    el('status').textContent='Clipboard unavailable; downloaded questions.json instead.';
  }
};
el('download').onclick=()=>{
  if(!publishableData())return;
  download();
  el('status').textContent='Downloaded questions.json.';
};
el('reset').onclick=()=>{
  if(!window.confirm('Discard this browser’s question draft and restore the published bank?'))return;
  data=JSON.parse(JSON.stringify(published));
  current=0;
  try{localStorage.removeItem(draftKey)}
  catch{el('status').textContent='Could not remove the saved draft from browser storage.';return}
  show();
  el('status').textContent='Local draft discarded.';
};
