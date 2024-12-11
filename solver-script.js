const paperCode = localStorage.getItem('paperCode');
const msCode = localStorage.getItem('msCode');
document.getElementById('pdfFrame').src = `./0455/${paperCode}.pdf`;

const totalQuestions = 30;
const questionsContainer = document.getElementById('questions-container');
const submitBtn = document.getElementById('submitAnswersBtn');
const scoreboard = document.getElementById('scoreboard');
const timerEl = document.getElementById('timer');
const addTimeBtn = document.getElementById('add-time-btn');
const timeUpOverlay = document.getElementById('timeUpOverlay');
const addTimeNowBtn = document.getElementById('addTimeNowBtn');

let correctAnswers = [];
let userAnswers = new Array(totalQuestions).fill(null);

fetch('./Economics/answers.json')
  .then(res => res.json())
  .then(data => {
    correctAnswers = data[msCode];
  });

for (let i = 0; i < totalQuestions; i++) {
  const qDiv = document.createElement('div');
  qDiv.className = 'question-block';
  const qTitle = document.createElement('h3');
  qTitle.textContent = `Question ${i+1}`;
  qDiv.appendChild(qTitle);
  const optionsDiv = document.createElement('div');
  optionsDiv.className = 'options';
  ['A','B','C','D'].forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => {
      userAnswers[i] = opt;
      optionsDiv.querySelectorAll('.option-btn').forEach(ob => ob.classList.remove('selected'));
      btn.classList.add('selected');
    });
    optionsDiv.appendChild(btn);
  });
  qDiv.appendChild(optionsDiv);
  questionsContainer.appendChild(qDiv);
}

let totalTime = 45 * 60;
addTimeBtn.addEventListener('click', () => {
  totalTime += 15 * 60;
});

const timerInterval = setInterval(() => {
  if (totalTime <= 0) {
    clearInterval(timerInterval);
    timeUpOverlay.style.display = 'flex';
  } else {
    totalTime--;
    const mins = Math.floor(totalTime / 60);
    const secs = totalTime % 60;
    timerEl.textContent = `${mins}:${secs.toString().padStart(2,'0')}`;
  }
}, 1000);

addTimeNowBtn.addEventListener('click', () => {
  totalTime += 15 * 60;
  timeUpOverlay.style.display = 'none';
  const newInterval = setInterval(() => {
    if (totalTime <= 0) {
      clearInterval(newInterval);
      submitAnswers();
    } else {
      totalTime--;
      const mins = Math.floor(totalTime/60);
      const secs = totalTime % 60;
      timerEl.textContent = `${mins}:${secs.toString().padStart(2,'0')}`;
    }
  },1000);
});

submitBtn.addEventListener('click', submitAnswers);

function submitAnswers() {
  clearInterval(timerInterval);
  let score = 0;
  for (let i = 0; i < totalQuestions; i++) {
    if (userAnswers[i] === correctAnswers[i]) score++;
  }
  const percent = ((score / totalQuestions) * 100).toFixed(2);
  document.querySelector('.main-container').style.display = 'none';
  scoreboard.style.display = 'block';
  document.getElementById('userScore').textContent = score;
  document.getElementById('totalQuestions').textContent = totalQuestions;
  document.getElementById('percentCorrect').textContent = percent;
  const answersBody = document.getElementById('answers-body');
  answersBody.innerHTML = '';
  for (let i = 0; i < totalQuestions; i++) {
    const tr = document.createElement('tr');
    const numTd = document.createElement('td');
    numTd.textContent = i+1;
    const userTd = document.createElement('td');
    userTd.textContent = userAnswers[i] || '-';
    const correctTd = document.createElement('td');
    correctTd.textContent = correctAnswers[i];
    if (userAnswers[i] === correctAnswers[i]) {
      userTd.classList.add('correct');
      correctTd.classList.add('correct');
    } else {
      userTd.classList.add('incorrect');
      correctTd.classList.add('incorrect');
    }
    tr.appendChild(numTd);
    tr.appendChild(userTd);
    tr.appendChild(correctTd);
    answersBody.appendChild(tr);
  }
  let storedResults = JSON.parse(localStorage.getItem('solvrResults')) || [];
  storedResults.push({
    paperCode: paperCode,
    score: score,
    percent: percent,
    timestamp: Date.now()
  });
  localStorage.setItem('solvrResults', JSON.stringify(storedResults));
}
