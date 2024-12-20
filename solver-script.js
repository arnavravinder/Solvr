const urlParams=new URLSearchParams(window.location.search);
const reviewIndex=urlParams.get('review');
const paperCode=localStorage.getItem('paperCode');
const msCode=localStorage.getItem('msCode');
const subject=localStorage.getItem('subject')||'Economics';
const subjectCode=paperCode.substring(0,4);

const loaderOverlay=document.getElementById('loaderOverlay');
const pdfFrame=document.getElementById('pdfFrame');
pdfFrame.src=`./${subjectCode}/${paperCode}.pdf`;

let totalQuestions;
if(subject==='Chemistry'||subject==='Biology'||subject==='Physics'){
    totalQuestions=40;
}else if(subject==='French'){
    totalQuestions=37; 
}else{
    totalQuestions=30;
}

let totalTime=45*60;
if(subject==='French')totalTime=0; 

let audioElement=null;
let paused=false;
let mainTimer=null;

document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>{
        if(loaderOverlay) loaderOverlay.remove();
        if(!reviewIndex) startTimer();
    },500);
});

if(subject==='French'){
    const audioCode=paperCode.replace('_qp_','_sf_');
    const pdfViewer=document.querySelector('.pdf-viewer');
    const parent=pdfViewer.parentNode;
    const container=document.createElement('div');
    container.style.margin='1rem';
    container.style.position='relative';
    audioElement=document.createElement('audio');
    audioElement.src=`./${subjectCode}/${audioCode}.mp3`;
    audioElement.autoplay=true;
    container.appendChild(audioElement);
    parent.insertBefore(container,pdfViewer);
    audioElement.addEventListener('loadedmetadata',()=>{
        let duration=audioElement.duration;
        if(isNaN(duration))duration=3000;
        totalTime=Math.floor(duration)+5; 
    });
}

let correctAnswers=[];
let userAnswers=new Array(totalQuestions).fill(null);
let storedResults=JSON.parse(localStorage.getItem('solvrResults'))||[];

const questionsContainer=document.getElementById('questions-container');
const submitBtn=document.getElementById('submitAnswersBtn');
const scoreboard=document.getElementById('scoreboard');
const panelTitle=document.getElementById('panelTitle');
const checkReviewBtn=document.getElementById('checkReviewBtn');
const reviewResultOverlay=document.getElementById('reviewResultOverlay');
const reviewResultContent=document.getElementById('reviewResultContent');
const timerEl=document.getElementById('timer');
const timeUpOverlay=document.getElementById('timeUpOverlay');
const addTimeNowBtn=document.getElementById('addTimeNowBtn');
const addTimeBtn=document.getElementById('add-time-btn');
const pauseBtn=document.getElementById('pauseBtn');
const backHomeBtn=document.getElementById('backHomeBtn');
const duplicatesOverlay=document.getElementById('duplicatesOverlay');
const closeDuplicatesPopup=document.getElementById('closeDuplicatesPopup');

if(backHomeBtn){
    backHomeBtn.addEventListener('click',()=>{
        window.location.href='index.html';
    });
}

closeDuplicatesPopup.addEventListener('click',()=>{
    duplicatesOverlay.style.display='none';
});

function startTimer(){
    if(reviewIndex!==null)return;
    addTimeBtn.addEventListener('click',()=>{
        totalTime+=15*60;
    });

    function updateTimer(){
        if(!paused){
            if(totalTime<=0){
                clearInterval(mainTimer);
                timeUpOverlay.style.display='flex';
            }else{
                totalTime--;
                const mins=Math.floor(totalTime/60);
                const secs=totalTime%60;
                timerEl.textContent=`${mins}:${secs.toString().padStart(2,'0')}`;
            }
        }
    }
    mainTimer=setInterval(updateTimer,1000);
    addTimeNowBtn.addEventListener('click',()=>{
        totalTime+=15*60;
        timeUpOverlay.style.display='none';
    });
    if(pauseBtn){
        pauseBtn.addEventListener('click',()=>{
            if(!paused){
                paused=true;
                if(subject==='French' && audioElement && !audioElement.paused){
                    audioElement.pause();
                }
                pauseBtn.textContent='Resume';
            }else{
                paused=false;
                if(subject==='French' && audioElement && audioElement.paused){
                    audioElement.play();
                }
                pauseBtn.textContent='Pause';
            }
        });
    }
}

function getFrenchOptions(qNum){
    if(qNum>=1&&qNum<=14)return['A','B','C','D'];
    if(qNum>=15&&qNum<=19)return['A','B','C','D','E','F']; // now single-answer
    if(qNum>=20&&qNum<=28)return['A','B','C'];
    if(qNum>=29&&qNum<=34)return['A','B','C','D'];
    if(qNum>=35&&qNum<=37)return['A','B','C','D','E'];
    return['A','B','C','D'];
}

function createOptionButton(opt,qNum,i){
    const btn=document.createElement('button');
    btn.className='option-btn';
    btn.textContent=opt;
    btn.setAttribute('data-letter',opt);
    btn.addEventListener('click',()=>{
        let ans=userAnswers[i];
        if(subject==='French' && (qNum>=35&&qNum<=37)){
            // multi (2 max)
            if(!ans)ans=[];
            else if(!Array.isArray(ans))ans=[ans];
            if(ans.includes(opt)){
                ans=ans.filter(x=>x!==opt);
                btn.classList.remove('selected');
            }else{
                if(ans.length<2){
                    ans.push(opt);
                    btn.classList.add('selected');
                }
            }
            userAnswers[i]=ans;
        } else if(subject==='French' && (qNum>=15&&qNum<=19)){
            // single-answer now
            handleSingleAnswer(i,opt,btn);
        } else {
            // single-answer normal
            handleSingleAnswer(i,opt,btn);
        }
    });
    return btn;
}

function handleSingleAnswer(i,opt,btn){
    const qDiv=btn.parentNode;
    qDiv.querySelectorAll('.option-btn').forEach(o=>o.classList.remove('selected'));
    btn.classList.add('selected');
    userAnswers[i]=opt;
}

function renderQuestion(i){
    const qNum=i+1;
    const qDiv=document.createElement('div');
    qDiv.className='question-block';
    const qTitle=document.createElement('h3');
    qTitle.textContent=`Question ${qNum}`;
    qDiv.appendChild(qTitle);
    let options=['A','B','C','D'];
    if(subject==='French')options=getFrenchOptions(qNum);
    const optionsDiv=document.createElement('div');
    optionsDiv.className='options';
    options.forEach(opt=>{
        const btn=createOptionButton(opt,qNum,i);
        optionsDiv.appendChild(btn);
    });
    qDiv.appendChild(optionsDiv);
    questionsContainer.appendChild(qDiv);
}

if(reviewIndex!==null){
    const attempt=storedResults[reviewIndex];
    panelTitle.textContent='Wrong Questions';
    submitBtn.style.display='none';
    checkReviewBtn.style.display='inline-block';
    const wrongIndices=[];
    for(let i=0;i<attempt.userAnswers.length;i++){
        if(attempt.userAnswers[i]!==attempt.correctAnswers[i])wrongIndices.push(i);
    }
    const reviewQuestions=[];
    wrongIndices.forEach(i=>{
        const qNum=i+1;
        const qDiv=document.createElement('div');
        qDiv.className='question-block';
        const qTitle=document.createElement('h3');
        qTitle.textContent=`Question ${qNum}`;
        qDiv.appendChild(qTitle);
        let options=['A','B','C','D'];
        if(subject==='French')options=getFrenchOptions(qNum);
        const optionsDiv=document.createElement('div');
        optionsDiv.className='options';
        options.forEach(opt=>{
            const btn=createOptionButton(opt,qNum,i);
            optionsDiv.appendChild(btn);
        });
        qDiv.appendChild(optionsDiv);
        questionsContainer.appendChild(qDiv);
        reviewQuestions.push({index:i,qNum:qNum});
    });

    checkReviewBtn.addEventListener('click',()=>{
        let score=0;
        for(let rq of reviewQuestions){
            let ans=userAnswers[rq.index];
            let ca=attempt.correctAnswers[rq.index];
            score+=calculateMarks(rq.index,ans,ca);
        }
        showResults(score);
    });

}else{
    fetch(`./${subject}/answers.json`)
    .then(res=>res.json())
    .then(data=>{
        correctAnswers=data[msCode];
    });

    for(let i=0;i<totalQuestions;i++){
        renderQuestion(i);
    }

    submitBtn.addEventListener('click',submitAnswers);

    function submitAnswers(){
        if(subject==='French'&&audioElement&&!audioElement.paused){
            audioElement.pause();
        }
        if(subject==='French'){
            if(!checkQ15to19Duplicates()){
                duplicatesOverlay.style.display='flex';
                return;
            }
        }

        let score=0;
        for(let i=0;i<totalQuestions;i++){
            let ans=userAnswers[i];
            let ca=correctAnswers[i];
            score+=calculateMarks(i,ans,ca);
        }
        showResults(score);
    }
}

function checkQ15to19Duplicates(){
    // Q15–19: single-answer, just ensure no letter repeats across them
    const letters=[];
    for(let i=14;i<19;i++){
        let ans=userAnswers[i];
        if(!ans) continue;
        // ans should be a string or null now (single-answer)
        letters.push(ans);
    }
    const counts = {};
    for(let l of letters){
        counts[l]=(counts[l]||0)+1;
        if(counts[l]>1){
            return false; 
        }
    }
    return true;
}

function calculateMarks(i,ans,ca){
    if(!ca)return 0;
    if(!ans) ans=[];
    else if(typeof ans==='string') ans=[ans];

    if(Array.isArray(ca)){
        // Q35–37 multi correct
        let correctCount=0;
        for(let c of ca){
            if(ans.includes(c)) correctCount++;
        }
        return correctCount; 
    } else {
        // single correct letter scenario
        if(ans.includes(ca)) return 1;
        return 0;
    }
}

function showResults(score){
    document.getElementById('mainContainer').style.display='none';
    scoreboard.style.display='block';
    const totalMax = (subject==='French'?40:totalQuestions);
    document.getElementById('userScore').textContent=score;
    document.getElementById('totalQuestions').textContent=totalQuestions;
    const percent=((score/totalMax)*100).toFixed(2);
    document.getElementById('percentCorrect').textContent=percent;
    const answersBody=document.getElementById('answers-body');
    answersBody.innerHTML='';
    for(let i=0;i<totalQuestions;i++){
        const tr=document.createElement('tr');
        const numTd=document.createElement('td');
        numTd.textContent=i+1;
        let ans=userAnswers[i];
        if(Array.isArray(ans)) ans=ans.join(',');
        const userTd=document.createElement('td');
        userTd.textContent=ans||'-';
        let ca=correctAnswers[i];
        if(Array.isArray(ca)) ca=ca.join(',');
        const correctTd=document.createElement('td');
        correctTd.textContent=ca;
        let marks=calculateMarks(i,userAnswers[i],correctAnswers[i]);
        if(marks===0){
            userTd.classList.add('user-wrong');
        }
        tr.appendChild(numTd);
        tr.appendChild(userTd);
        tr.appendChild(correctTd);
        answersBody.appendChild(tr);
    }
    let storedResults=JSON.parse(localStorage.getItem('solvrResults'))||[];
    storedResults.push({
        subject:subject,
        paperCode:paperCode,
        score:score,
        percent:(score/(subject==='French'?40:totalQuestions))*100,
        userAnswers:userAnswers,
        correctAnswers:correctAnswers,
        timestamp:Date.now()
    });
    localStorage.setItem('solvrResults',JSON.stringify(storedResults));
}
