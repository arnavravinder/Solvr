document.addEventListener('DOMContentLoaded', function() {
    let examData = null;
    let userAnswers = [];
    let timerInterval = null;
    let timeLeft = 0;
    let startTime = null;
    let pdfDoc = null;
    let pageNum = 1;
    let pageRendering = false;
    let pageNumPending = null;
    let scale = 1.0;
    let aiHelper = null;
    
    try {
        const examDataJson = sessionStorage.getItem('currentExam');
        if (!examDataJson) {
            window.location.href = 'custom-selector.html';
            return;
        }
        
        examData = JSON.parse(examDataJson);
        startTime = examData.startTime || Date.now();
        timeLeft = examData.examDuration * 60;
        
        userAnswers = Array(examData.totalQuestions).fill(null);
        
        document.getElementById('paper-title').textContent = 
            `${examData.subject} - ${examData.paperCode}`;
        
        loadPdf(examData.questionPdf);
        generateAnswerButtons(examData.totalQuestions);
        startTimer();
        
    } catch (error) {
        console.error('Error loading exam data:', error);
        window.location.href = 'custom-selector.html';
        return;
    }
    
    document.getElementById('add-time').addEventListener('click', () => {
        addTime(15 * 60);
    });
    
    document.getElementById('finish-exam').addEventListener('click', showFinishConfirmation);
    document.getElementById('confirm-finish').addEventListener('click', finishExam);
    document.getElementById('cancel-finish').addEventListener('click', () => {
        document.getElementById('confirm-finish-modal').classList.add('hidden');
    });
    
    document.getElementById('add-time-modal').addEventListener('click', () => {
        addTime(15 * 60);
        document.getElementById('time-up-modal').classList.add('hidden');
    });
    
    document.getElementById('finish-now').addEventListener('click', finishExam);
    
    document.getElementById('prev-page').addEventListener('click', () => {
        if (pageNum <= 1) return;
        pageNum--;
        queueRenderPage(pageNum);
    });
    
    document.getElementById('next-page').addEventListener('click', () => {
        if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
        pageNum++;
        queueRenderPage(pageNum);
    });
    
    function loadPdf(pdfDataUrl) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        
        const loadingTask = pdfjsLib.getDocument(pdfDataUrl);
        loadingTask.promise.then(function(pdf) {
            pdfDoc = pdf;
            document.getElementById('page-num').textContent = `Page ${pageNum} of ${pdf.numPages}`;
            renderPage(pageNum);
            updateNavButtons();
        }).catch(function(error) {
            console.error('Error loading PDF:', error);
        });
    }
    
    function renderPage(num) {
        pageRendering = true;
        
        pdfDoc.getPage(num).then(function(page) {
            const canvas = document.getElementById('pdf-canvas');
            const ctx = canvas.getContext('2d');
            
            const container = document.querySelector('.pdf-viewer');
            const containerWidth = container.clientWidth - 40;
            const containerHeight = container.clientHeight - 20;
            
            const originalViewport = page.getViewport({ scale: 1.0 });
            
            let desiredScale = containerWidth / originalViewport.width;
            
            const scaledHeight = originalViewport.height * desiredScale;
            if (scaledHeight < containerHeight * 0.9) {
                desiredScale = (containerHeight * 0.9) / originalViewport.height;
            }
            
            const viewport = page.getViewport({ scale: desiredScale });
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport,
                enableWebGL: true,
                renderInteractiveForms: true,
                antialias: true
            };
            
            const renderTask = page.render(renderContext);
            
            renderTask.promise.then(function() {
                pageRendering = false;
                
                if (pageNumPending !== null) {
                    renderPage(pageNumPending);
                    pageNumPending = null;
                }
            });
        });
        
        document.getElementById('page-num').textContent = `Page ${num} of ${pdfDoc.numPages}`;
        updateNavButtons();
    }
    
    function queueRenderPage(num) {
        if (pageRendering) {
            pageNumPending = num;
        } else {
            renderPage(num);
        }
    }
    
    function updateNavButtons() {
        document.getElementById('prev-page').disabled = pageNum <= 1;
        document.getElementById('next-page').disabled = pageNum >= pdfDoc.numPages;
    }
    
    function generateAnswerButtons(totalQuestions) {
        const answersGrid = document.getElementById('answers-grid');
        answersGrid.innerHTML = '';
        
        for (let i = 0; i < totalQuestions; i++) {
            const questionNumber = i + 1;
            
            const questionItem = document.createElement('div');
            questionItem.className = 'question-item';
            
            const headerDiv = document.createElement('div');
            headerDiv.className = 'question-header';
            
            const numberDiv = document.createElement('div');
            numberDiv.className = 'question-number';
            numberDiv.textContent = `Question ${questionNumber}`;
            headerDiv.appendChild(numberDiv);
            
            const hasQuestionData = checkForQuestionData(examData.msCode, questionNumber);
            if (hasQuestionData) {
                const aiHelpButton = document.createElement('button');
                aiHelpButton.className = 'ai-help-button';
                aiHelpButton.innerHTML = '<span class="sparkle-icon">✨</span><span class="ai-help-text">AI Help</span>';
                aiHelpButton.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    openAiHelpPopup(examData.msCode, questionNumber);
                };
                headerDiv.appendChild(aiHelpButton);
            }
            
            questionItem.appendChild(headerDiv);
            
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'answer-options';
            
            const options = [
                { value: 'A', class: 'answer-option-a' },
                { value: 'B', class: 'answer-option-b' },
                { value: 'C', class: 'answer-option-c' },
                { value: 'D', class: 'answer-option-d' }
            ];
            
            options.forEach(option => {
                const optionButton = document.createElement('div');
                optionButton.className = `answer-option ${option.class}`;
                optionButton.textContent = option.value;
                optionButton.dataset.question = questionNumber;
                optionButton.dataset.answer = option.value;
                
                optionButton.addEventListener('click', handleAnswerSelect);
                
                optionsContainer.appendChild(optionButton);
            });
            
            questionItem.appendChild(optionsContainer);
            answersGrid.appendChild(questionItem);
        }
        
        updateProgressIndicator();
    }
    
    function handleAnswerSelect(event) {
        const questionIndex = parseInt(event.target.dataset.question) - 1;
        const selectedAnswer = event.target.dataset.answer;
        
        userAnswers[questionIndex] = selectedAnswer;
        
        const options = document.querySelectorAll(`.answer-option[data-question="${questionIndex + 1}"]`);
        options.forEach(option => {
            option.classList.remove('selected');
        });
        
        event.target.classList.add('selected');
        
        updateProgressIndicator();
    }
    
    function updateProgressIndicator() {
        const answeredCount = userAnswers.filter(answer => answer !== null).length;
        const totalQuestions = examData.totalQuestions;
        
        document.getElementById('progress-indicator').textContent = 
            `${answeredCount}/${totalQuestions} answered`;
            
        document.getElementById('answered-count').textContent = answeredCount;
        document.getElementById('total-count').textContent = totalQuestions;
    }
    
    function startTimer() {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        timeLeft = Math.max(0, examData.examDuration * 60 - elapsed);
        
        updateTimerDisplay();
        
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                document.getElementById('time-up-modal').classList.remove('hidden');
            }
        }, 1000);
    }
    
    function updateTimerDisplay() {
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const seconds = timeLeft % 60;
        
        document.getElementById('timer-display').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    function addTime(seconds) {
        timeLeft += seconds;
        updateTimerDisplay();
        
        if (!timerInterval) {
            timerInterval = setInterval(() => {
                timeLeft--;
                updateTimerDisplay();
                
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    document.getElementById('time-up-modal').classList.remove('hidden');
                }
            }, 1000);
        }
    }
    
    function showFinishConfirmation() {
        document.getElementById('confirm-finish-modal').classList.remove('hidden');
    }
    
    function finishExam() {
        clearInterval(timerInterval);
        
        document.getElementById('loading-overlay').classList.remove('hidden');
        
        const correctAnswers = examData.correctAnswers;
        let score = 0;
        
        for (let i = 0; i < userAnswers.length; i++) {
            if (userAnswers[i] === correctAnswers[i]) {
                score++;
            }
        }
        
        const endTime = Date.now();
        const timeTakenSeconds = Math.floor((endTime - startTime) / 1000);
        
        const result = {
            subject: examData.subject,
            paperCode: examData.paperCode,
            score: score,
            totalMax: examData.totalQuestions,
            percent: (score / examData.totalQuestions) * 100,
            userAnswers: userAnswers,
            correctAnswers: correctAnswers,
            msCode: examData.msCode,
            timeTaken: timeTakenSeconds,
            timestamp: endTime
        };
        
        const storedResults = JSON.parse(localStorage.getItem('solvrResults') || '[]');
        result.attemptIndex = storedResults.length;
        storedResults.push(result);
        localStorage.setItem('solvrResults', JSON.stringify(storedResults));
        
        sessionStorage.setItem('currentResult', JSON.stringify(result));
        sessionStorage.setItem('questionPdfDataUrl', examData.questionPdf);
        
        sessionStorage.removeItem('currentExam');
        
        window.location.href = 'custom-results.html';
    }
    
    function checkForQuestionData(paperCode, questionNumber) {
        try {
            const questionsJson = localStorage.getItem('solvrQuestions') || '{}';
            const questions = JSON.parse(questionsJson);
            
            if (questions[paperCode] && Array.isArray(questions[paperCode])) {
                return questions[paperCode].some(q => q.number === questionNumber);
            }
        } catch (error) {
            console.error('Error checking for question data:', error);
        }
        return false;
    }
    
    function openAiHelpPopup(paperCode, questionNumber) {
        try {
            const questionsJson = localStorage.getItem('solvrQuestions') || '{}';
            const questions = JSON.parse(questionsJson);
            
            if (!questions[paperCode] || !Array.isArray(questions[paperCode])) {
                console.error('No question data found for this paper code');
                return;
            }
            
            const questionData = questions[paperCode].find(q => q.number === questionNumber);
            if (!questionData) {
                console.error('Question data not found for this question number');
                return;
            }
            
            createAiHelpPopup(questionData, paperCode);
        } catch (error) {
            console.error('Error opening AI help popup:', error);
        }
    }
    
    function createAiHelpPopup(questionData, paperCode) {
        const overlay = document.createElement('div');
        overlay.className = 'ai-help-overlay';
        
        const popup = document.createElement('div');
        popup.className = 'ai-help-container';
        
        const header = document.createElement('div');
        header.className = 'ai-help-header';
        header.innerHTML = `
            <h3>AI Explanation: Question ${questionData.number}</h3>
            <button class="close-button">×</button>
        `;
        
        const content = document.createElement('div');
        content.className = 'ai-help-content';
        
        const questionDetails = document.createElement('div');
        questionDetails.className = 'question-details';
        questionDetails.innerHTML = `
            <p class="question-text">${questionData.text}</p>
            <div class="options-list">
                ${questionData.options.map(option => `
                    <div class="option-item ${option.letter === questionData.correctAnswer ? 'correct-option' : ''}">
                        <span class="option-letter">${option.letter}</span>
                        <span class="option-text">${option.text}</span>
                    </div>
                `).join('')}
            </div>
            <div class="correct-answer">
                <p>Correct Answer: <strong>${questionData.correctAnswer || 'Not available'}</strong></p>
            </div>
        `;
        
        const aiExplanation = document.createElement('div');
        aiExplanation.className = 'ai-explanation';
        aiExplanation.innerHTML = `
            <h4>Explanation</h4>
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Getting AI explanation...</p>
            </div>
        `;
        
        content.appendChild(questionDetails);
        content.appendChild(aiExplanation);
        popup.appendChild(header);
        popup.appendChild(content);
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        const closeButton = header.querySelector('.close-button');
        closeButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        if (questionData.aiPrompt) {
            fetchAiExplanation(questionData.aiPrompt, aiExplanation);
        } else {
            aiExplanation.innerHTML = `
                <h4>Explanation</h4>
                <div class="error-message">
                    <p>No AI prompt available for this question.</p>
                </div>
            `;
        }
        
        addAiHelpStyles();
    }
    
    async function fetchAiExplanation(prompt, container) {
        try {
            const res = await fetch("https://solvr-api.vercel.app/api/gemini", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ prompt })
            });
            
            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }
            
            const data = await res.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            container.innerHTML = `
                <h4>Explanation</h4>
                <div class="explanation-text">
                    ${data.response.split('\n').map(para => `<p>${para}</p>`).join('')}
                </div>
            `;
        } catch (error) {
            console.error('Error fetching AI explanation:', error);
            container.innerHTML = `
                <h4>Explanation</h4>
                <div class="error-message">
                    <p>${error.message || 'Failed to get AI explanation'}</p>
                    <button class="retry-button">Retry</button>
                </div>
            `;
            
            const retryButton = container.querySelector('.retry-button');
            if (retryButton) {
                retryButton.addEventListener('click', () => {
                    container.innerHTML = `
                        <h4>Explanation</h4>
                        <div class="loading-spinner">
                            <div class="spinner"></div>
                            <p>Getting AI explanation...</p>
                        </div>
                    `;
                    fetchAiExplanation(prompt, container);
                });
            }
        }
    }
    
    function addAiHelpStyles() {
        if (document.getElementById('ai-help-styles')) return;
        
        const styleEl = document.createElement('style');
        styleEl.id = 'ai-help-styles';
        styleEl.textContent = `
            .ai-help-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            
            .ai-help-container {
                background-color: white;
                border-radius: 8px;
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            }
            
            .ai-help-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid #e0e0e0;
            }
            
            .ai-help-header h3 {
                margin: 0;
                color: #333;
                font-size: 1.25rem;
            }
            
            .close-button {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
            }
            
            .close-button:hover {
                color: #333;
            }
            
            .ai-help-content {
                padding: 20px;
                overflow-y: auto;
                color: #333;
                max-height: calc(90vh - 60px);
            }
            
            .question-details {
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #eaeaea;
            }
            
            .question-text {
                font-size: 1.1rem;
                margin-bottom: 15px;
                color: #333;
            }
            
            .options-list {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .option-item {
                display: flex;
                padding: 8px 12px;
                background-color: #f5f5f5;
                border-radius: 4px;
                align-items: center;
            }
            
            .correct-option {
                background-color: #e8f5e9;
                border-left: 4px solid #4caf50;
            }
            
            .option-letter {
                font-weight: bold;
                margin-right: 10px;
                color: #555;
            }
            
            .correct-answer {
                font-size: 1.05rem;
                margin-top: 10px;
                color: #2e7d32;
            }
            
            .ai-explanation h4 {
                margin-top: 0;
                margin-bottom: 15px;
                color: #333;
            }
            
            .loading-spinner {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 30px 0;
            }
            
            .spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin-bottom: 15px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .error-message {
                color: #d32f2f;
                padding: 15px;
                background-color: #ffebee;
                border-radius: 4px;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            
            .retry-button {
                margin-top: 10px;
                background-color: #f44336;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
            }
            
            .explanation-text {
                line-height: 1.6;
                color: #333;
            }
            
            .explanation-text p {
                margin-bottom: 15px;
            }
            
            .question-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.75rem;
            }
            
            .ai-help-button {
                display: flex;
                align-items: center;
                background: none;
                border: none;
                color: var(--primary-color, #6366F1);
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.9rem;
                transition: all 0.2s ease;
            }
            
            .ai-help-button:hover {
                background-color: rgba(99, 102, 241, 0.1);
            }
            
            .sparkle-icon {
                margin-right: 4px;
                font-size: 1.1rem;
            }
            
            @media (max-width: 768px) {
                .options-list {
                    grid-template-columns: 1fr;
                }
                
                .ai-help-text {
                    display: none;
                }
            }
        `;
        
        document.head.appendChild(styleEl);
    }
    
    function initializeAIHelper() {
        try {
            const paperCode = examData.msCode || '';
            if (!paperCode) return;
            
            if (!aiHelper && window.SolvrAIHelper) {
                aiHelper = new SolvrAIHelper({
                    apiUrl: "https://solvr-api.vercel.app/api/gemini",
                    onError: (error) => {
                        console.error('AI Helper error:', error);
                    }
                });
                
                aiHelper.initHelpButtons(
                    paperCode,
                    '.question-item',
                    (element) => {
                        const numberEl = element.querySelector('.question-number');
                        if (numberEl) {
                            const match = numberEl.textContent.match(/Question\s+(\d+)/i);
                            if (match) {
                                return parseInt(match[1]);
                            }
                        }
                        return null;
                    }
                );
            }
        } catch (error) {
            console.error('Error initializing AI Helper:', error);
        }
    }
    
    setTimeout(initializeAIHelper, 500);
    
    window.addEventListener('resize', function() {
        if (pdfDoc) {
            renderPage(pageNum);
        }
    });
});