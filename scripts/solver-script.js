const urlParams = new URLSearchParams(window.location.search);
const reviewIndex = urlParams.get('review');

const loaderOverlay = document.getElementById('loaderOverlay');
const pdfCanvas = document.getElementById('pdf-canvas');
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
  
  const pdfContainerElement = document.querySelector('.pdf-canvas-container');
  if (pdfContainerElement) {
    pdfContainer = pdfContainerElement;
  }
  
  initPdfControls();
  
  window.addEventListener('resize', () => {
    if (pdfDoc && currentPage) {
      renderPage(currentPage);
    }
  });
});

let subject, paperCode, msCode;
let totalQuestions=0;
let correctAnswers=[];
let userAnswers=[];
let flaggedSet=new Set();

let pdfDoc = null;
let pdfContainer = null;
let currentPage = 1;
let totalPages = 1;
let currentScale = 1.8;
let prevPageBtn, nextPageBtn, currentPageEl, totalPagesEl, zoomInBtn, zoomOutBtn;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

function initPdfControls() {
  prevPageBtn = document.getElementById('prevPageBtn');
  nextPageBtn = document.getElementById('nextPageBtn');
  currentPageEl = document.getElementById('currentPage');
  totalPagesEl = document.getElementById('totalPages');
  zoomInBtn = document.getElementById('zoomInBtn');
  zoomOutBtn = document.getElementById('zoomOutBtn');
  
  if (prevPageBtn && nextPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
      }
    });
    
    nextPageBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderPage(currentPage);
      }
    });
    
    zoomInBtn.addEventListener('click', () => {
      currentScale += 0.1;
      renderPage(currentPage);
    });
    
    zoomOutBtn.addEventListener('click', () => {
      if (currentScale > 0.5) {
        currentScale -= 0.1;
        renderPage(currentPage);
      }
    });
    
    console.log("PDF controls initialized successfully");
  } else {
    console.log("PDF controls not found in the DOM");
  }
}

let paused=false;
let mainTimer=null;
let totalTime=45*60;
let audioElement=null;

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

pauseBtn.style.backgroundImage="url('../assets/pause.png')";
pauseBtn.addEventListener('click', ()=>{
  paused=!paused;
  if(paused){
    pauseBtn.style.backgroundImage="url('../assets/play.png')";
    if((subject==='French' || subject==='Spanish') && audioElement && !audioElement.paused){
      audioElement.pause();
    }
  } else {
    pauseBtn.style.backgroundImage="url('../assets/pause.png')";
    if((subject==='French' || subject==='Spanish') && audioElement && audioElement.paused){
      audioElement.play();
    }
  }
});

let menuOpen=true;
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

function loadPdf(url) {
  try {
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then(arrayBuffer => {
        return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      })
      .then(pdf => {
        console.log("PDF loaded successfully");
        pdfDoc = pdf;
        totalPages = pdf.numPages;
        
        if (totalPagesEl) {
          totalPagesEl.textContent = totalPages;
        }
        
        renderPage(1);
      })
      .catch(error => {
        console.error("Error loading PDF:", error);
      });
  } catch (error) {
    console.error("Error in loadPdf:", error);
  }
}

function renderPage(pageNumber) {
  if (!pdfDoc || !pdfCanvas) return;
  
  try {
    pdfDoc.getPage(pageNumber).then(page => {
      let containerWidth = 800;
      let containerHeight = 600;
      
      if (pdfContainer) {
        containerWidth = pdfContainer.clientWidth || containerWidth;
        containerHeight = pdfContainer.clientHeight || containerHeight;
      }
      
      const viewport = page.getViewport({ scale: 1.0 });
      
      const scaleToFit = (containerHeight * 0.95) / viewport.height;
      const finalScale = scaleToFit * currentScale;
      
      const scaledViewport = page.getViewport({ scale: finalScale });
      
      pdfCanvas.height = scaledViewport.height;
      pdfCanvas.width = scaledViewport.width;
      
      const renderContext = {
        canvasContext: pdfCanvas.getContext('2d'),
        viewport: scaledViewport
      };
      
      page.render(renderContext);
      
      currentPage = pageNumber;
      if (currentPageEl) {
        currentPageEl.textContent = pageNumber;
      }
      
      if (prevPageBtn) {
        prevPageBtn.disabled = pageNumber <= 1;
        prevPageBtn.style.opacity = pageNumber <= 1 ? "0.5" : "1";
      }
      
      if (nextPageBtn) {
        nextPageBtn.disabled = pageNumber >= totalPages;
        nextPageBtn.style.opacity = pageNumber >= totalPages ? "0.5" : "1";
      }
    });
  } catch (error) {
    console.error("Error in renderPage:", error);
  }
}

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

function calculateMarks(i, ans, ca){
  if(!ca)return 0;
  if(!ans) ans=[];
  else if(typeof ans==='string') ans=[ans];
  if(Array.isArray(ca)){
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

function handleOptionClick(i,opt,btn,qNum){
  let ans=userAnswers[i];
  if(subject==='French' || subject==='Spanish') {
    if (qNum>=35&&qNum<=37){
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
    } else if(qNum>=15&&qNum<=19){
      const parent=btn.parentNode;
      parent.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      userAnswers[i]=opt;
    } else {
      const parent=btn.parentNode;
      parent.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      userAnswers[i]=opt;
    }
  } else {
    const parent=btn.parentNode;
    parent.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    userAnswers[i]=opt;
  }
  updateCounters();
}

function createQuestionBlock(i){
  const qNum=i+1;
  const block=document.createElement('div');
  block.className='question-block';
  const title=document.createElement('h3');
  title.textContent=`Question ${qNum}`;
  block.appendChild(title);
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
  if(subject==='French' || subject==='Spanish'){
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

function submitAnswers(){
  if(subject==='French' || subject==='Spanish' && !reviewIndex){
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
  
  clearInterval(mainTimer);
  mainTimer = null;
  if(audioElement){
    audioElement.pause();
    audioElement.currentTime = 0;
  }
  
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
  
  const pdfUrl = `/${paperCode.substring(0,4)}/${paperCode}.pdf`;
  loadPdf(pdfUrl);
  
  panelTitle.textContent = 'Wrong Questions';
  submitBtn.style.display='none';
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
} else {
  subject = localStorage.getItem('subject') || 'Economics';
  paperCode = localStorage.getItem('paperCode');
  msCode = localStorage.getItem('msCode');
  if(subject==='Chemistry' || subject==='Biology' || subject==='Physics') totalQuestions = 40;
  else if(subject==='French' || subject==='Spanish') totalQuestions = 37;
  else if(subject==='Accounting') totalQuestions = 35;
  else totalQuestions = 30;
  userAnswers = new Array(totalQuestions).fill(null);
  
  const pdfUrl = `/${paperCode.substring(0,4)}/${paperCode}.pdf`;
  
  if(subject==='French' || subject==='Spanish'){
    const audioCode = paperCode.replace('_qp_','_sf_');
    const pdfViewer = document.querySelector('.pdf-viewer');
    const parent = pdfViewer.parentNode;
    
    // Create audio element only if parent exists
    if (parent) {
      const audioContainer = document.createElement('div');
      audioContainer.style.margin = '1rem';
      audioContainer.style.position = 'relative';
      audioElement = document.createElement('audio');
      audioElement.src = `../${paperCode.substring(0,4)}/${audioCode}.mp3`;
      audioElement.controls = true; // Add controls for debugging
      audioContainer.appendChild(audioElement);
      parent.insertBefore(audioContainer, pdfViewer);
      
      if (audioElement) {
        audioElement.addEventListener('loadedmetadata', ()=>{
          let duration = audioElement.duration;
          if(isNaN(duration)) duration = 2700;
          totalTime = Math.floor(duration) + 10;
        });
        
        try {
          audioElement.play().catch(e => console.error("Audio play error:", e));
        } catch (e) {
          console.error("Audio play exception:", e);
        }
      }
    }
    
    loadPdf(pdfUrl);
    
    fetch(`/${subject}/answers.json`)
    .then(r => r.json())
    .then(data => {
      correctAnswers = data[msCode];
      renderQuestionGrid();
      for(let i = 0; i < totalQuestions; i++){
        questionsContainer.appendChild(createQuestionBlock(i));
      }
      submitBtn.addEventListener('click', submitAnswers);
      if (audioElement) {
        audioElement.addEventListener('loadedmetadata', ()=>{ startTimer(); });
      } else {
        startTimer();
      }
    });
  } else if(subject==='Accounting'){
    totalTime = 75 * 60;
    
    loadPdf(pdfUrl);
    
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
    loadPdf(pdfUrl);
    
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

if (confirmRateBtn) {
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
}

document.addEventListener('DOMContentLoaded', ()=>{
  const ratePaperOverlay = document.getElementById('ratePaperOverlay');
  if (ratePaperOverlay) {
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
});
