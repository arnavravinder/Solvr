const urlParams = new URLSearchParams(window.location.search);
const reviewIndex = urlParams.get('review');
const paperCode = localStorage.getItem('paperCode');
const msCode = localStorage.getItem('msCode');
const subject = localStorage.getItem('subject') || 'Economics';
const subjectCode = paperCode.substring(0,4); // e.g. "0455" for Economics, "0620" for Chemistry, etc.

// Determine total questions based on subject
let totalQuestions;
if (subject === 'Chemistry') {
    totalQuestions = 40; // 40 questions for Chemistry
} else {
    totalQuestions = 30; // 30 questions for other subjects (e.g. Economics)
}

document.getElementById('pdfFrame').src = `./${subjectCode}/${paperCode}.pdf`;

const questionsContainer = document.getElementById('questions-container');
const submitBtn = document.getElementById('submitAnswersBtn');
const scoreboard = document.getElementById('scoreboard');
const timerEl = document.getElementById('timer');
const addTimeBtn = document.getElementById('add-time-btn');
const timeUpOverlay = document.getElementById('timeUpOverlay');
const addTimeNowBtn = document.getElementById('addTimeNowBtn');
const mainContainer = document.getElementById('mainContainer');
const panelTitle = document.getElementById('panelTitle');
const timerContainer = document.getElementById('timerContainer');
const checkReviewBtn = document.getElementById('checkReviewBtn');
const reviewResultOverlay = document.getElementById('reviewResultOverlay');
const reviewResultContent = document.getElementById('reviewResultContent');

let correctAnswers = [];
let userAnswers = new Array(totalQuestions).fill(null);
let storedResults = JSON.parse(localStorage.getItem('solvrResults')) || [];

if (reviewIndex !== null) {
    const attempt = storedResults[reviewIndex];
    timerContainer.style.display = 'none';
    panelTitle.textContent = 'Wrong Questions';
    submitBtn.style.display = 'none';
    checkReviewBtn.style.display = 'inline-block';
    document.getElementById('pdfFrame').src = `./${attempt.paperCode.substring(0,4)}/${attempt.paperCode}.pdf`;

    const wrongIndices = [];
    for (let i = 0; i < attempt.userAnswers.length; i++) {
        if (attempt.userAnswers[i] !== attempt.correctAnswers[i]) {
            wrongIndices.push(i);
        }
    }

    const reviewQuestions = [];
    for (let i = 0; i < wrongIndices.length; i++) {
        const qIndex = wrongIndices[i];
        const qDiv = document.createElement('div');
        qDiv.className = 'question-block';
        const qTitle = document.createElement('h3');
        qTitle.textContent = `Question ${qIndex + 1}`;
        qDiv.appendChild(qTitle);

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'options';
        ['A', 'B', 'C', 'D'].forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = opt;
            btn.addEventListener('click', () => {
                optionsDiv.querySelectorAll('.option-btn').forEach(ob => ob.classList.remove('selected'));
                btn.classList.add('selected');
            });
            optionsDiv.appendChild(btn);
        });
        qDiv.appendChild(optionsDiv);
        questionsContainer.appendChild(qDiv);
        reviewQuestions.push({ index: qIndex, element: optionsDiv });
    }

    checkReviewBtn.addEventListener('click', () => {
        let correctCount = 0;
        for (let i = 0; i < reviewQuestions.length; i++) {
            const qData = reviewQuestions[i];
            const selected = Array.from(qData.element.querySelectorAll('.option-btn'))
                .find(btn => btn.classList.contains('selected'));
            if (selected) {
                const chosen = selected.textContent;
                if (chosen === attempt.correctAnswers[qData.index]) {
                    correctCount++;
                }
            }
        }
        reviewResultContent.innerHTML = `<h3>Check Result</h3><p>You got ${correctCount} correct out of ${reviewQuestions.length} this time.</p><button class="close-popup" id="closeReviewResult">OK</button>`;
        reviewResultOverlay.style.display = 'flex';
        document.getElementById('closeReviewResult').addEventListener('click', () => {
            reviewResultOverlay.style.display = 'none';
        });
    });

} else {
    fetch(`./${subject}/answers.json`)
        .then(res => res.json())
        .then(data => {
            correctAnswers = data[msCode];
        });

    for (let i = 0; i < totalQuestions; i++) {
        const qDiv = document.createElement('div');
        qDiv.className = 'question-block';
        const qTitle = document.createElement('h3');
        qTitle.textContent = `Question ${i + 1}`;
        qDiv.appendChild(qTitle);
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'options';
        ['A', 'B', 'C', 'D'].forEach(opt => {
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
    const mainTimer = setInterval(() => {
        if (totalTime <= 0) {
            clearInterval(mainTimer);
            timeUpOverlay.style.display = 'flex';
        } else {
            totalTime--;
            const mins = Math.floor(totalTime / 60);
            const secs = totalTime % 60;
            timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }
    }, 1000);
    addTimeNowBtn.addEventListener('click', () => {
        totalTime += 15 * 60;
        timeUpOverlay.style.display = 'none';
        const extraTimer = setInterval(() => {
            if (totalTime <= 0) {
                clearInterval(extraTimer);
                submitAnswers();
            } else {
                totalTime--;
                const mins = Math.floor(totalTime / 60);
                const secs = totalTime % 60;
                timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            }
        }, 1000);
    });
    submitBtn.addEventListener('click', submitAnswers);

    function submitAnswers() {
        clearInterval(mainTimer);
        let score = 0;
        for (let i = 0; i < totalQuestions; i++) {
            if (userAnswers[i] === correctAnswers[i]) score++;
        }
        const percent = ((score / totalQuestions) * 100).toFixed(2);
        mainContainer.style.display = 'none';
        scoreboard.style.display = 'block';
        document.getElementById('userScore').textContent = score;
        document.getElementById('totalQuestions').textContent = totalQuestions;
        document.getElementById('percentCorrect').textContent = percent;
        const answersBody = document.getElementById('answers-body');
        answersBody.innerHTML = '';
        for (let i = 0; i < totalQuestions; i++) {
            const tr = document.createElement('tr');
            const numTd = document.createElement('td');
            numTd.textContent = i + 1;
            const userTd = document.createElement('td');
            userTd.textContent = userAnswers[i] || '-';
            const correctTd = document.createElement('td');
            correctTd.textContent = correctAnswers[i];
            if (userAnswers[i] !== correctAnswers[i]) {
                userTd.classList.add('user-wrong');
            }
            tr.appendChild(numTd);
            tr.appendChild(userTd);
            tr.appendChild(correctTd);
            answersBody.appendChild(tr);
        }
        let storedResults = JSON.parse(localStorage.getItem('solvrResults')) || [];
        storedResults.push({
            subject: subject,
            paperCode: paperCode,
            score: score,
            percent: percent,
            userAnswers: userAnswers,
            correctAnswers: correctAnswers,
            timestamp: Date.now()
        });
        localStorage.setItem('solvrResults', JSON.stringify(storedResults));
    }
}
