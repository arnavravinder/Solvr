const reviewIndex = localStorage.getItem('reviewIndex');
let storedResults = JSON.parse(localStorage.getItem('solvrResults')) || [];
const resultData = storedResults[reviewIndex];

const paperCode = resultData.paperCode;
document.getElementById('pdfFrame').src = `./0455/${paperCode}.pdf`;

const totalQuestions = resultData.userAnswers.length;
const userAnswers = resultData.userAnswers;
const correctAnswers = resultData.correctAnswers;
const questionsContainer = document.getElementById('questions-container');

for (let i = 0; i < totalQuestions; i++) {
  if (userAnswers[i] !== correctAnswers[i]) {
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
        optionsDiv.querySelectorAll('.option-btn').forEach(ob => ob.classList.remove('selected'));
        btn.classList.add('selected');
      });
      optionsDiv.appendChild(btn);
    });
    qDiv.appendChild(optionsDiv);
    questionsContainer.appendChild(qDiv);
  }
}
