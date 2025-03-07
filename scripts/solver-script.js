const urlParams = new URLSearchParams(window.location.search);
const reviewIndex = urlParams.get('review');

const loaderOverlay = document.getElementById('loaderOverlay');
const pdfFrame = document.getElementById('pdfFrame');
const questionsContainer = document.getElementById('questions-container');
const submitBtn = document.getElementById('submitAnswersBtn');
const scoreboard = document.getElementById('scoreboard');
const panelTitle = document.getElementById('panelTitle');
const checkReviewBtn = document.getElementById('checkReviewBtn');
const timerEl = document.getElementById('timer');
const timeUpOverlay = document.getElementById('timeUpOverlay');
const addTimeNowBtn = document.getElementById('addTimeNowBtn');
const addTimeBtn = document.getElementById('add-time-btn');
const pauseBtn = document.getElementById('pauseBtn');
const backHomeBtn = document.getElementById('backHomeBtn');
const duplicatesOverlay = document.getElementById('duplicatesOverlay');
const closeDuplicatesPopup = document.getElementById('closeDuplicatesPopup');
const toggleMenuBtn = document.getElementById('toggleMenuBtn');
const questionGrid = document.getElementById('questionGrid');

const answeredCountEl = document.getElementById('answeredCount');
const unansweredCountEl = document.getElementById('unansweredCount');
const flaggedCountEl = document.getElementById('flaggedCount');

// NEW RATING ELEMENTS:
const ratePaperOverlay = document.getElementById('ratePaperOverlay');
const confirmRateBtn = document.getElementById('confirmRateBtn');

let storedResults = JSON.parse(localStorage.getItem('solvrResults'))||[];

if (backHomeBtn) {
  backHomeBtn.addEventListener('click', ()=> {
    window.location.href='index.html';
  });
}
closeDuplicatesPopup.addEventListener('click', ()=>{
  duplicatesOverlay.style.display='none';
});

document.addEventListener('DOMContentLoaded', ()=>{
  setTimeout(()=>{
    if(loaderOverlay) loaderOverlay.remove();
  },500);
});

// imp vars
let subject, paperCode, msCode;
let totalQuestions=0;
let correctAnswers=[];
let userAnswers=[];
let flaggedSet=new Set();

// Timer
let paused=false;
let mainTimer=null;
let totalTime=45*60; // 45 min default
let audioElement=null; // french/spanish listening

function startTimer(){
  mainTimer = setInterval(()=>{
    if(paused) return;
    if(totalTime<=0){
      clearInterval(mainTimer);
      timeUpOverlay.style.display='flex';
    } else {
      totalTime--;
      const mins=Math.floor(totalTime/60);
      const secs=totalTime%60;
      timerEl.textContent=`${mins}:${secs.toString().padStart(2,'0')}`;
    }
  },1000);
}
addTimeNowBtn.addEventListener('click', ()=>{
  totalTime += 15*60;
  timeUpOverlay.style.display='none';
});
addTimeBtn.addEventListener('click', ()=>{
  totalTime += 15*60;
});

// Pause/resume
pauseBtn.style.backgroundImage="url('../assets/pause.png')"; // default
pauseBtn.addEventListener('click', ()=>{
  paused=!paused;
  if(paused){
    pauseBtn.style.backgroundImage="url('../assets/play.png')";
    // If French/Spanish listening is playing, pause it
    if((subject==='French' || subject==='Spanish') && audioElement && !audioElement.paused){
      audioElement.pause();
    }
  } else {
    pauseBtn.style.backgroundImage="url('../assets/pause.png')";
    // Resume if French/Spanish audio is paused
    if((subject==='French' || subject==='Spanish') && audioElement && audioElement.paused){
      audioElement.play();
    }
  }
});

// Toggle question grid
let menuOpen=true; // visible by default => up icon
toggleMenuBtn.classList.add('up-icon');
toggleMenuBtn.addEventListener('click', ()=>{
  menuOpen=!menuOpen;
  if(!menuOpen){
    questionGrid.style.display='none';
    toggleMenuBtn.classList.remove('up-icon');
    toggleMenuBtn.classList.add('down-icon');
  } else {
    questionGrid.style.display='flex';
    toggleMenuBtn.classList.remove('down-icon');
    toggleMenuBtn.classList.add('up-icon');
  }
});

// Q15–19 duplicates check
function checkQ15to19Duplicates(){
  const letters=[];
  for(let i=14;i<19;i++){
    if(userAnswers[i]) letters.push(userAnswers[i]);
  }
  const counts={};
  for(let l of letters){
    counts[l]=(counts[l]||0)+1;
    if(counts[l]>1)return false;
  }
  return true;
}

// calc marks (including partial credit for Q35–37)
function calculateMarks(i, ans, ca){
  if(!ca)return 0;
  if(!ans) ans=[];
  else if(typeof ans==='string') ans=[ans];
  if(Array.isArray(ca)){
    // Q35–37 partial credit
    let correctCount=0;
    for(let c of ca){
      if(ans.includes(c)) correctCount++;
    }
    return correctCount;
  } else {
    if(ans.includes(ca)) return 1;
    return 0;
  }
}

// update counters
function updateCounters(){
  let answered=0;
  for(let i=0;i<totalQuestions;i++){
    const ans=userAnswers[i];
    if(ans){
      if(Array.isArray(ans)&&ans.length>0) answered++;
      else if(typeof ans==='string') answered++;
    }
  }
  const flagged=flaggedSet.size;
  const unanswered=totalQuestions-answered;
  answeredCountEl.textContent=answered;
  unansweredCountEl.textContent=unanswered;
  flaggedCountEl.textContent=flagged;
  // update question grid
  for(let i=0;i<totalQuestions;i++){
    const btn=questionGrid.children[i];
    if(!btn) continue;
    btn.classList.remove('answered','flagged');
    let ans=userAnswers[i];
    if(ans){
      if(Array.isArray(ans) && ans.length>0) btn.classList.add('answered');
      else if(typeof ans==='string') btn.classList.add('answered');
    }
    if(flaggedSet.has(i)) btn.classList.add('flagged');
  }
}

// handle normal/french single or multi option
function handleOptionClick(i,opt,btn,qNum){
  let ans=userAnswers[i];
  if(subject==='French' && (qNum>=35&&qNum<=37)){
    // multi (2 max)
    if(!ans) ans=[];
    else if(!Array.isArray(ans)) ans=[ans];
    if(ans.includes(opt)){
      ans=ans.filter(x=>x!==opt);
      btn.classList.remove('selected');
    } else {
      if(ans.length<2) ans.push(opt);
      btn.classList.add('selected');
    }
    userAnswers[i]=ans;
  } else if(subject==='French' && (qNum>=15&&qNum<=19)){
    // single-answer
    const parent=btn.parentNode;
    parent.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    userAnswers[i]=opt;
  } else {
    // normal single-answer
    const parent=btn.parentNode;
    parent.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    userAnswers[i]=opt;
  }
  updateCounters();
}

// create question block
function createQuestionBlock(i){
  const qNum=i+1;
  const block=document.createElement('div');
  block.className='question-block';
  // title
  const title=document.createElement('h3');
  title.textContent=`Question ${qNum}`;
  block.appendChild(title);
  // flag btn
  const flagBtn=document.createElement('button');
  flagBtn.className='flag-btn';
  flagBtn.addEventListener('click',()=>{
    if(flaggedSet.has(i)){
      flaggedSet.delete(i);
      flagBtn.classList.remove('flagged');
    } else {
      flaggedSet.add(i);
      flagBtn.classList.add('flagged');
    }
    updateCounters();
  });
  block.appendChild(flagBtn);
  let options=['A','B','C','D'];
  // NEW: Accounting subject always uses ABCD
  if(subject==='French'){
    if(qNum>=1 && qNum<=14) options=['A','B','C','D'];
    else if(qNum>=15 && qNum<=19) options=['A','B','C','D','E','F'];
    else if(qNum>=20 && qNum<=28) options=['A','B','C'];
    else if(qNum>=29 && qNum<=34) options=['A','B','C','D'];
    else if(qNum>=35 && qNum<=37) options=['A','B','C','D','E'];
  } else if(subject==='Accounting'){
    options = ['A','B','C','D'];
  }
  const optsDiv=document.createElement('div');
  optsDiv.className='options';
  options.forEach(opt=>{
    const obtn=document.createElement('button');
    obtn.className='option-btn';
    obtn.textContent=opt;
    obtn.setAttribute('data-letter',opt);
    obtn.addEventListener('click',()=>handleOptionClick(i,opt,obtn,qNum));
    optsDiv.appendChild(obtn);
  });
  block.appendChild(optsDiv);
  return block;
}

// render question grid
function renderQuestionGrid(){
  questionGrid.innerHTML='';
  for(let i=0;i<totalQuestions;i++){
    const btn=document.createElement('div');
    btn.className='qnum-btn';
    btn.textContent=(i+1).toString();
    btn.addEventListener('click',()=>{
      questionsContainer.children[i].scrollIntoView({behavior:'smooth'});
    });
    questionGrid.appendChild(btn);
  }
  updateCounters();
}

// show scoreboard
function showResults(score,isReview=false,attemptObj=null,questionSubset=null){
  document.getElementById('mainContainer').style.display='none';
  scoreboard.style.display='block';
  const totalMax = (subject==='French' || subject==='Spanish') ? 37 : (subject==='Accounting' ? 35 : (subject==='Chemistry'||subject==='Biology'||subject==='Physics') ? 40 : totalQuestions);
  document.getElementById('userScore').textContent = score;
  document.getElementById('totalQuestions').textContent = totalQuestions;
  const percent = ((score/totalMax)*100).toFixed(2);
  document.getElementById('percentCorrect').textContent = percent;
  const answersBody = document.getElementById('answers-body');
  answersBody.innerHTML = '';
  let theseCorrect = correctAnswers;
  if(isReview && attemptObj && attemptObj.correctAnswers){
    theseCorrect = attemptObj.correctAnswers;
  }
  let indices = (questionSubset ? questionSubset : [...Array(totalQuestions).keys()]);
  indices.forEach(i=>{
    const tr = document.createElement('tr');
    const numTd = document.createElement('td');
    numTd.textContent = i+1;
    let ans = userAnswers[i];
    if(Array.isArray(ans)) ans = ans.join(',');
    const userTd = document.createElement('td');
    userTd.textContent = ans || '-';
    let ca = theseCorrect[i];
    if(Array.isArray(ca)) ca = ca.join(',');
    const correctTd = document.createElement('td');
    correctTd.textContent = ca || '-';
    let marks = calculateMarks(i,userAnswers[i],theseCorrect[i]);
    if(marks === 0) userTd.classList.add('user-wrong');
    tr.appendChild(numTd);
    tr.appendChild(userTd);
    tr.appendChild(correctTd);
    answersBody.appendChild(tr);
  });
  if(isReview && attemptObj){
    attemptObj.reviewScore = score;
    attemptObj.reviewPercent = percent;
    localStorage.setItem('solvrResults', JSON.stringify(storedResults));
  }
}

// submit
function submitAnswers(){
  if(subject==='French' && !reviewIndex){
    if(!checkQ15to19Duplicates()){
      duplicatesOverlay.style.display = 'flex';
      return;
    }
  }
  let score = 0;
  for(let i = 0; i < totalQuestions; i++){
    score += calculateMarks(i, userAnswers[i], correctAnswers[i]);
  }
  const totalMax = (subject==='French' || subject==='Spanish') ? 37 : (subject==='Accounting' ? 35 : (subject==='Chemistry'||subject==='Biology'||subject==='Physics') ? 40 : totalQuestions);
  const attempt = {
    subject, paperCode,
    score,
    percent: (score/totalMax)*100,
    userAnswers,
    correctAnswers,
    msCode,
    timestamp: Date.now()
  };
  attempt.attemptIndex = storedResults.length;
  storedResults.push(attempt);
  localStorage.setItem('solvrResults', JSON.stringify(storedResults));
  
//stop timer and audio
   clearInterval(mainTimer);
  mainTimer = null;
  if(audioElement){
    audioElement.pause();
    audioElement.currentTime = 0;
  }
  
  // interrupt- RATING.
  window.finalScoreForPaper = score;
  ratePaperOverlay.style.display = 'flex';
}

if(reviewIndex !== null){
  let attempt = storedResults[reviewIndex];
  subject = attempt.subject;
  paperCode = attempt.paperCode;
  correctAnswers = attempt.correctAnswers || [];
  if(subject==='Chemistry' || subject==='Biology' || subject==='Physics') totalQuestions = 40;
  else if(subject==='French' || subject==='Spanish') totalQuestions = 37;
  else if(subject==='Accounting') totalQuestions = 35;
  else totalQuestions = 30;
  userAnswers = new Array(totalQuestions).fill(null);
  pdfFrame.src = `/${paperCode.substring(0,4)}/${paperCode}.pdf`;
  panelTitle.textContent = 'Wrong Questions';
  submitBtn.style.display = 'none';
  checkReviewBtn.style.display = 'inline-block';
  renderQuestionGrid();
  const wrongIndices = [];
  for(let i = 0; i < attempt.userAnswers.length; i++){
    if(attempt.userAnswers[i] !== attempt.correctAnswers[i]) wrongIndices.push(i);
  }
  wrongIndices.forEach(i=>{
    questionsContainer.appendChild(createQuestionBlock(i));
  });
  checkReviewBtn.addEventListener('click', ()=>{
    let reviewScore = 0;
    wrongIndices.forEach(idx=>{
      reviewScore += calculateMarks(idx, userAnswers[idx], attempt.correctAnswers[idx]);
    });
    showResults(reviewScore, true, attempt, wrongIndices);
  });
}else{
  subject = localStorage.getItem('subject') || 'Economics';
  paperCode = localStorage.getItem('paperCode');
  msCode = localStorage.getItem('msCode');
  if(subject==='Chemistry' || subject==='Biology' || subject==='Physics') totalQuestions = 40;
  else if(subject==='French' || subject==='Spanish') totalQuestions = 37;
  else if(subject==='Accounting') totalQuestions = 35;
  else totalQuestions = 30;
  userAnswers = new Array(totalQuestions).fill(null);
  if(subject==='French' || subject==='Spanish'){
    const audioCode = paperCode.replace('_qp_','_sf_');
    const pdfViewer = document.querySelector('.pdf-viewer');
    const parent = pdfViewer.parentNode;
    const audioContainer = document.createElement('div');
    audioContainer.style.margin = '1rem';
    audioContainer.style.position = 'relative';
    audioElement = document.createElement('audio');
    audioElement.src = `../${paperCode.substring(0,4)}/${audioCode}.mp3`;
    audioElement.autoplay = true;
    audioContainer.appendChild(audioElement);
    parent.insertBefore(audioContainer, pdfViewer);
    audioElement.addEventListener('loadedmetadata', ()=>{
      let duration = audioElement.duration;
      if(isNaN(duration)) duration = 2700;
      totalTime = Math.floor(duration) + 10;
    });
    pdfFrame.src = `/${paperCode.substring(0,4)}/${paperCode}.pdf`;
    fetch(`/${subject}/answers.json`)
    .then(r => r.json())
    .then(data => {
      correctAnswers = data[msCode];
      renderQuestionGrid();
      for(let i = 0; i < totalQuestions; i++){
        questionsContainer.appendChild(createQuestionBlock(i));
      }
      submitBtn.addEventListener('click', submitAnswers);
      audioElement.addEventListener('loadedmetadata', ()=>{ startTimer(); });
    });
  } else if(subject==='Accounting'){
    // Accounting subject: 1h 15min, 35 questions, options: ABCD
    totalTime = 75 * 60;
    pdfFrame.src = `/${paperCode.substring(0,4)}/${paperCode}.pdf`;
    fetch(`/${subject}/answers.json`)
    .then(r => r.json())
    .then(data => {
      correctAnswers = data[msCode];
      renderQuestionGrid();
      for(let i = 0; i < totalQuestions; i++){
        questionsContainer.appendChild(createQuestionBlock(i));
      }
      submitBtn.addEventListener('click', submitAnswers);
      startTimer();
    });
  } else {
    pdfFrame.src = `/${paperCode.substring(0,4)}/${paperCode}.pdf`;
    fetch(`/${subject}/answers.json`)
    .then(r => r.json())
    .then(data => {
      correctAnswers = data[msCode];
      renderQuestionGrid();
      for(let i = 0; i < totalQuestions; i++){
        questionsContainer.appendChild(createQuestionBlock(i));
      }
      submitBtn.addEventListener('click', submitAnswers);
      startTimer();
    });
  }
}

// rating logic
confirmRateBtn.addEventListener('click', ()=>{
  let rating = null;
  ratePaperOverlay.querySelectorAll('input[name="paperDifficulty"]').forEach(r=>{
    if(r.checked) rating = r.value;
  });
  if(!rating){ alert("Pick a difficulty"); return; }
  let st = JSON.parse(localStorage.getItem("solvrResults"))||[];
  if(st.length > 0){
    let last = st[st.length-1];
    last.paperRating = rating;
    localStorage.setItem("solvrResults", JSON.stringify(st));
  }
  ratePaperOverlay.style.display = 'none';
  showResults(window.finalScoreForPaper || 0, false, null, null);
});

// NEW: Rating popup button logic for 3 colored buttons
document.addEventListener('DOMContentLoaded', ()=>{
  const ratePaperOverlay = document.getElementById('ratePaperOverlay');
  const ratingButtons = ratePaperOverlay.querySelectorAll('.rating-btn');
  ratingButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      let rating = btn.dataset.value;
      let st = JSON.parse(localStorage.getItem("solvrResults"))||[];
      if(st.length > 0){
        let last = st[st.length-1];
        last.paperRating = rating;
        localStorage.setItem("solvrResults", JSON.stringify(st));
      }
      ratePaperOverlay.style.display = 'none';
      showResults(window.finalScoreForPaper || 0, false, null, null);
    });
  });
}
)