const el=id=>document.getElementById(id);
const draftKey='dailyzav-question-draft-v1';
const fields=['category','prompt','source','answers'];
let data=[],published=[],current=0;

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
  if(!Array.isArray(ideas?.trivia)||ideas.trivia.length!==25||
     !Array.isArray(ideas?.estimate)||ideas.estimate.length!==25)throw Error('Expected 25 ideas per game.');
  const valid=group=>group.every(idea=>typeof idea.category==='string'&&
    typeof idea.prompt==='string'&&typeof idea.evidence==='string');
  if(!valid(ideas.trivia)||!valid(ideas.estimate))throw Error('Invalid question idea.');
  el('idea-count').textContent=(ideas.trivia.length+ideas.estimate.length)+' evidence-first prompts';
  el('trivia-count').textContent='('+ideas.trivia.length+')';
  el('estimate-count').textContent='('+ideas.estimate.length+')';
  el('trivia-ideas').replaceChildren(...ideas.trivia.map(idea=>ideaCard(idea,'trivia')));
  el('estimate-ideas').replaceChildren(...ideas.estimate.map(idea=>ideaCard(idea,'estimate')));
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
