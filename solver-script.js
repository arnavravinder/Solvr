const urlParams = new URLSearchParams(window.location.search);
const reviewIndex = urlParams.get('review');
const paperCode = localStorage.getItem('paperCode');
const msCode = localStorage.getItem('msCode');
const subject = localStorage.getItem('subject') || 'Economics';
const subjectCode = paperCode.substring(0,4);

const loaderOverlay = document.getElementById('loaderOverlay');
const pdfFrame = document.getElementById('pdfFrame');
pdfFrame.src = `./${subjectCode}/${paperCode}.pdf`;

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
let audioLoaded=false;
let pdfLoaded=false;
let timerStarted=false; // Ensure we only start timer once

function hideLoader(){
    loaderOverlay.style.display='none';
    clearTimeout(mediaLoadTimeout);
    if(!reviewIndex && !timerStarted){
        startTimer();
        timerStarted=true;
    }
}

let mediaLoadTimeout=setTimeout(()=>{
    // If media events are slow, still hide loader after 10s
    hideLoader();
},10000);

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
        audioLoaded=true;
        checkMediaLoaded();
        audioElement.play().catch(()=>{});
    });
} else {
    // Non-French: no audio loading needed
    audioLoaded=true;
}

pdfFrame.addEventListener('load',()=>{
    pdfLoaded=true;
    checkMediaLoaded();
});

function checkMediaLoaded(){
    if(pdfLoaded && audioLoaded){
        hideLoader();
    }
}

let correctAnswers=[];
let userAnswers=new Array(totalQuestions).fill(null);
let storedResults=JSON.parse(localStorage.getItem('solvrResults'))||[];
let chosenLettersFor15to19=new Set();

const questionsContainer=document.getElementById('questions-container');
const submitBtn=document.getElementById('submitAnswersBtn');
const scoreboard=document.getElementById('scoreboard');
const panelTitle=document.getElementById('panelTitle');
const checkReviewBtn=document.getElementById('checkReviewBtn');
const reviewResultOverlay=document.getElementById('reviewResultOverlay');
const reviewResultContent=document.getElementById('reviewResultContent');

const frenchDuplicatePopup=document.createElement('div');
frenchDuplicatePopup.className='popup-overlay';
frenchDuplicatePopup.style.display='none';
const frenchPopupContent=document.createElement('div');
frenchPopupContent.className='popup-content';
frenchPopupContent.innerHTML=`<h3>Duplicate Letter</h3><p>You have already chosen this letter in Q15–19 set.</p><button class="close-popup" id="closeFrenchDup">OK</button>`;
frenchDuplicatePopup.appendChild(frenchPopupContent);
document.body.appendChild(frenchDuplicatePopup);
const closeFrenchDupBtn=document.getElementById('closeFrenchDup');
closeFrenchDupBtn.addEventListener('click',()=>{frenchDuplicatePopup.style.display='none';});

function getFrenchOptions(qNum){
    if(qNum>=1&&qNum<=14)return['A','B','C','D'];
    if(qNum>=15&&qNum<=19)return['A','B','C','D','E','F'];
    if(qNum>=20&&qNum<=28)return['A','B','C'];
    if(qNum>=29&&qNum<=34)return['A','B','C','D'];
    if(qNum>=35&&qNum<=37)return['A','B','C','D','E'];
    return['A','B','C','D'];
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
        const btn=document.createElement('button');
        btn.className='option-btn';
        btn.textContent=opt;
        btn.addEventListener('click',()=>{
            if(subject==='French'){
                if(qNum>=35&&qNum<=37){
                    let current=userAnswers[i];
                    if(!current)current=[];
                    else if(!Array.isArray(current))current=[current];
                    if(current.includes(opt)){
                        current=current.filter(x=>x!==opt);
                        btn.classList.remove('selected');
                    }else{
                        if(current.length>=2)return;
                        current.push(opt);
                        btn.classList.add('selected');
                    }
                    userAnswers[i]=current;
                    return;
                }
                if(qNum>=15&&qNum<=19){
                    if(chosenLettersFor15to19.has(opt)&&userAnswers[i]!==opt){
                        frenchDuplicatePopup.style.display='flex';
                        return;
                    }
                }
            }
            optionsDiv.querySelectorAll('.option-btn').forEach(ob=>ob.classList.remove('selected'));
            btn.classList.add('selected');
            userAnswers[i]=opt;
            if(subject==='French'&&qNum>=15&&qNum<=19){
                chosenLettersFor15to19.clear();
                for(let x=15;x<=19;x++){
                    let ans=userAnswers[x-1];
                    if(ans&&typeof ans==='string')chosenLettersFor15to19.add(ans);
                }
            }
        });
        optionsDiv.appendChild(btn);
    });
    qDiv.appendChild(optionsDiv);
    questionsContainer.appendChild(qDiv);
}

function startTimer(){
    if(reviewIndex!==null)return;
    const addTimeBtn=document.getElementById('add-time-btn');
    const timeUpOverlay=document.getElementById('timeUpOverlay');
    const addTimeNowBtn=document.getElementById('addTimeNowBtn');
    const timerEl=document.getElementById('timer');
    addTimeBtn.addEventListener('click',()=>{
        totalTime+=15*60;
    });
    const mainTimer=setInterval(()=>{
        if(totalTime<=0){
            clearInterval(mainTimer);
            timeUpOverlay.style.display='flex';
        }else{
            totalTime--;
            const mins=Math.floor(totalTime/60);
            const secs=totalTime%60;
            timerEl.textContent=`${mins}:${secs.toString().padStart(2,'0')}`;
        }
    },1000);
    addTimeNowBtn.addEventListener('click',()=>{
        totalTime+=15*60;
        timeUpOverlay.style.display='none';
    });
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
            const btn=document.createElement('button');
            btn.className='option-btn';
            btn.textContent=opt;
            btn.addEventListener('click',()=>{
                if(subject==='French'&&qNum>=35&&qNum<=37){
                    let current=userAnswers[i];
                    if(!current)current=[];
                    else if(!Array.isArray(current))current=[current];
                    if(current.includes(opt)){
                        current=current.filter(x=>x!==opt);
                        btn.classList.remove('selected');
                    }else{
                        if(current.length>=2)return;
                        current.push(opt);
                        btn.classList.add('selected');
                    }
                    userAnswers[i]=current;
                    return;
                }
                optionsDiv.querySelectorAll('.option-btn').forEach(ob=>ob.classList.remove('selected'));
                btn.classList.add('selected');
                userAnswers[i]=opt;
            });
            optionsDiv.appendChild(btn);
        });
        qDiv.appendChild(optionsDiv);
        questionsContainer.appendChild(qDiv);
        reviewQuestions.push({index:i,qNum:qNum});
    });
    checkReviewBtn.addEventListener('click',()=>{
        let correctCount=0;
        for(let rq of reviewQuestions){
            let ans=userAnswers[rq.index];
            let ca=attempt.correctAnswers[rq.index];
            if(subject==='French'&&rq.qNum>=35&&rq.qNum<=37){
                if(Array.isArray(ans)&&Array.isArray(ca)&&ans.length===2&&ans.sort().join('')===ca.sort().join(''))correctCount++;
            }else{
                if(Array.isArray(ca)&&Array.isArray(ans)){
                    if(ans.sort().join('')===ca.sort().join(''))correctCount++;
                }else if(ans===ca)correctCount++;
            }
        }
        reviewResultContent.innerHTML=`<h3>Check Result</h3><p>You got ${correctCount} correct out of ${reviewQuestions.length} this time.</p><button class="close-popup" id="closeReviewResult">OK</button>`;
        reviewResultOverlay.style.display='flex';
        document.getElementById('closeReviewResult').addEventListener('click',()=>{
            reviewResultOverlay.style.display='none';
        });
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
        let score=0;
        for(let i=0;i<totalQuestions;i++){
            let ans=userAnswers[i];
            let ca=correctAnswers[i];
            if(subject==='French'&&i>=34&&i<=36){
                if(Array.isArray(ans)&&Array.isArray(ca)&&ans.length===2&&ans.sort().join('')===ca.sort().join(''))score++;
            }else{
                if(Array.isArray(ca)&&Array.isArray(ans)){
                    if(ans.sort().join('')===ca.sort().join(''))score++;
                }else if(ans===ca)score++;
            }
        }
        const percent=((score/totalQuestions)*100).toFixed(2);
        document.getElementById('mainContainer').style.display='none';
        scoreboard.style.display='block';
        document.getElementById('userScore').textContent=score;
        document.getElementById('totalQuestions').textContent=totalQuestions;
        document.getElementById('percentCorrect').textContent=percent;
        const answersBody=document.getElementById('answers-body');
        answersBody.innerHTML='';
        for(let i=0;i<totalQuestions;i++){
            const tr=document.createElement('tr');
            const numTd=document.createElement('td');
            numTd.textContent=i+1;
            let ans=userAnswers[i];
            if(Array.isArray(ans))ans=ans.join(',');
            const userTd=document.createElement('td');
            userTd.textContent=ans||'-';
            let ca=correctAnswers[i];
            if(Array.isArray(ca))ca=ca.join(',');
            const correctTd=document.createElement('td');
            correctTd.textContent=ca;
            if((userAnswers[i]!==correctAnswers[i])&&(subject!=='French'||i<34||i>36||!((Array.isArray(userAnswers[i])&&Array.isArray(correctAnswers[i])&&userAnswers[i].sort().join('')===correctAnswers[i].sort().join(''))))){
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
            percent:percent,
            userAnswers:userAnswers,
            correctAnswers:correctAnswers,
            timestamp:Date.now()
        });
        localStorage.setItem('solvrResults',JSON.stringify(storedResults));
    }
}
