const el=id=>document.getElementById(id);
const draftKey='dailyzav-question-draft-v1';
const fields=['category','prompt','source','answers'];
let data=[],published=[],current=0;

function validQuestionShape(question){
  return question&&typeof question==='object'&&typeof question.category==='string'&&
    typeof question.prompt==='string'&&Array.isArray(question.answers)&&
    question.answers.every(answer=>typeof answer==='string')&&
    (question.source===undefined||typeof question.source==='string');
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
    const canonical=parsed.map(row=>row.names[0].toLocaleLowerCase());
    if(new Set(canonical).size<5)return {index,message:'Add at least five distinct answers.'};
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
  data=readDraft()||JSON.parse(JSON.stringify(published));
  show();
  if(data!==published)el('status').textContent='Saved draft restored from this browser.';
  setBusy(false);
}).catch(()=>{
  el('status').textContent='Could not load a valid question bank. Refresh to try again.';
});

el('pick').onchange=()=>{
  capture();
  current=Number(el('pick').value);
  show();
};
el('add').onclick=()=>{
  capture();
  current=data.push({category:'',prompt:'',source:'',answers:[]})-1;
  saveDraft();
  show();
  el('category').focus();
};
for(const id of fields){
  el(id).addEventListener('input',capture);
}
document.querySelector('.idea-list').onclick=event=>{
  const button=event.target.closest('button[data-category][data-prompt]');
  if(!button)return;
  capture();
  current=data.push({
    category:button.dataset.category,
    prompt:button.dataset.prompt,
    source:'',
    answers:[]
  })-1;
  saveDraft();
  show();
  el('source').focus();
  el('status').textContent='Idea added. Add an evidence URL and at least five verified answers.';
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
  try{localStorage.removeItem(draftKey)}catch{}
  show();
  el('status').textContent='Local draft discarded.';
};
