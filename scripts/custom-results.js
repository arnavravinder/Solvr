document.addEventListener('DOMContentLoaded', function() {
    let resultData = null;
    let pdfDoc = null;
    let pageNum = 1;
    let pageRendering = false;
    let pageNumPending = null;
    let scale = 1.0;
    let aiHelper = null;
    
    try {
        const resultDataJson = sessionStorage.getItem('currentResult');
        if (!resultDataJson) {
            window.location.href = 'custom-selector.html';
            return;
        }
        
        resultData = JSON.parse(resultDataJson);
        
        const questionPdfDataUrl = sessionStorage.getItem('questionPdfDataUrl');
        if (questionPdfDataUrl) {
            loadPdf(questionPdfDataUrl);
        }
        
        displayResults(resultData);
        
    } catch (error) {
        console.error('Error loading result data:', error);
        window.location.href = 'custom-selector.html';
        return;
    }
    
    document.getElementById('new-exam').addEventListener('click', () => {
        window.location.href = 'custom-selector.html';
    });
    
    document.getElementById('view-all-results').addEventListener('click', () => {
        document.getElementById('results-history-modal').classList.remove('hidden');
        loadResultsHistory();
    });
    
    document.getElementById('close-history').addEventListener('click', () => {
        document.getElementById('results-history-modal').classList.add('hidden');
    });
    
    document.getElementById('download-results').addEventListener('click', downloadResults);
    
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
    
    function displayResults(result) {
        document.getElementById('paper-title').textContent = 
            `${result.subject} - ${result.paperCode}`;
        
        document.getElementById('score-value').textContent = `${result.score}/${result.totalMax}`;
        document.getElementById('score-percent').textContent = `${Math.round(result.percent)}%`;
        
        const scoreBox = document.querySelector('.score-box');
        if (result.percent < 50) {
            scoreBox.style.backgroundColor = 'var(--danger-color)';
        } else if (result.percent < 80) {
            scoreBox.style.backgroundColor = 'var(--warning-color)';
        } else {
            scoreBox.style.backgroundColor = 'var(--success-color)';
        }
        
        const hours = Math.floor(result.timeTaken / 3600);
        const minutes = Math.floor((result.timeTaken % 3600) / 60);
        const seconds = result.timeTaken % 60;
        
        document.getElementById('time-taken').textContent = 
            `Time taken: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        let correctCount = 0;
        let wrongCount = 0;
        let unansweredCount = 0;
        
        for (let i = 0; i < result.totalMax; i++) {
            const userAnswer = result.userAnswers[i];
            const correctAnswer = result.correctAnswers[i];
            
            if (userAnswer === null) {
                unansweredCount++;
            } else if (userAnswer === correctAnswer) {
                correctCount++;
            } else {
                wrongCount++;
            }
        }
        
        document.getElementById('correct-count').textContent = correctCount;
        document.getElementById('wrong-count').textContent = wrongCount;
        document.getElementById('unanswered-count').textContent = unansweredCount;
        
        generateResultsGrid(result);
    }
    
    function generateResultsGrid(result) {
        const resultsGrid = document.getElementById('results-grid');
        resultsGrid.innerHTML = '';
        
        for (let i = 0; i < result.totalMax; i++) {
            const questionNumber = i + 1;
            const userAnswer = result.userAnswers[i];
            const correctAnswer = result.correctAnswers[i];
            
            let status = '';
            if (userAnswer === null) {
                status = 'not-answered';
            } else if (userAnswer === correctAnswer) {
                status = 'correct';
            } else {
                status = 'incorrect';
            }
            
            const resultItem = document.createElement('div');
            resultItem.className = `result-item ${status}`;
            
            const headerDiv = document.createElement('div');
            headerDiv.className = 'question-header';
            
            const questionNumberEl = document.createElement('div');
            questionNumberEl.className = 'question-number';
            questionNumberEl.textContent = `Question ${questionNumber}`;
            headerDiv.appendChild(questionNumberEl);
            
            const hasQuestionData = checkForQuestionData(result.msCode, questionNumber);
            if (hasQuestionData) {
                const aiHelpButton = document.createElement('button');
                aiHelpButton.className = 'ai-help-button';
                aiHelpButton.innerHTML = '<span class="sparkle-icon">✨</span><span class="ai-help-text">AI Help</span>';
                aiHelpButton.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    openAiHelpPopup(result.msCode, questionNumber);
                };
                headerDiv.appendChild(aiHelpButton);
            }
            
            resultItem.appendChild(headerDiv);
            
            const answersDisplay = document.createElement('div');
            answersDisplay.className = 'answers-display';
            
            const yourAnswerRow = document.createElement('div');
            yourAnswerRow.className = 'answer-row';
            
            const yourAnswerLabel = document.createElement('span');
            yourAnswerLabel.className = 'answer-label';
            yourAnswerLabel.textContent = 'Your answer:';
            
            const yourAnswerValue = document.createElement('span');
            yourAnswerValue.className = `answer-value ${status}`;
            yourAnswerValue.textContent = userAnswer || 'None';
            
            yourAnswerRow.appendChild(yourAnswerLabel);
            yourAnswerRow.appendChild(yourAnswerValue);
            answersDisplay.appendChild(yourAnswerRow);
            
            const correctAnswerRow = document.createElement('div');
            correctAnswerRow.className = 'answer-row';
            
            const correctAnswerLabel = document.createElement('span');
            correctAnswerLabel.className = 'answer-label';
            correctAnswerLabel.textContent = 'Correct:';
            
            const correctAnswerValue = document.createElement('span');
            correctAnswerValue.className = 'answer-value correct';
            
            let cleanCorrectAnswer = correctAnswer || 'Unknown';
            if (cleanCorrectAnswer && cleanCorrectAnswer.includes(' ')) {
                cleanCorrectAnswer = cleanCorrectAnswer.split(' ')[0];
            }
            
            correctAnswerValue.textContent = cleanCorrectAnswer;
            
            correctAnswerRow.appendChild(correctAnswerLabel);
            correctAnswerRow.appendChild(correctAnswerValue);
            answersDisplay.appendChild(correctAnswerRow);
            
            resultItem.appendChild(answersDisplay);
            resultsGrid.appendChild(resultItem);
        }
        
        setTimeout(initializeAIHelper, 100);
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
        
        let cleanQuestionText = questionData.text || '';
        
        let optionsHTML = '';
        if (questionData.options && Array.isArray(questionData.options) && questionData.options.length > 0) {
            optionsHTML = `
                <div class="options-list">
                    ${questionData.options.map(option => `
                        <div class="option-item ${option.letter === questionData.correctAnswer ? 'correct-option' : ''}">
                            <span class="option-letter">${option.letter}</span>
                            <span class="option-text">${option.text}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        let correctAnswer = questionData.correctAnswer || '';
        if (correctAnswer && correctAnswer.includes(' ')) {
            correctAnswer = correctAnswer.split(' ')[0];
        }
        
        questionDetails.innerHTML = `
            <p class="question-text">${cleanQuestionText}</p>
            ${optionsHTML}
            <div class="correct-answer">
                <p>Correct Answer: <strong>${correctAnswer || 'Not available'}</strong></p>
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
            
            let responseText = '';
            
            if (data.response) {
                responseText = data.response;
            } else if (data?.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                responseText = data.data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('Invalid response format from AI service');
            }
            
            if (!responseText) {
                throw new Error('Empty response from AI service');
            }
            
            container.innerHTML = `
                <h4>Explanation</h4>
                <div class="explanation-text">
                    ${responseText.split('\n').map(para => `<p>${para}</p>`).join('')}
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
    
    function loadResultsHistory() {
        const historyTableBody = document.getElementById('history-table-body');
        historyTableBody.innerHTML = '';
        
        const results = JSON.parse(localStorage.getItem('solvrResults') || '[]');
        
        if (results.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 6;
            cell.textContent = 'No past results found';
            cell.style.textAlign = 'center';
            row.appendChild(cell);
            historyTableBody.appendChild(row);
            return;
        }
        
        results.sort((a, b) => b.timestamp - a.timestamp);
        
        results.forEach((result) => {
            const row = document.createElement('tr');
            
            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(result.timestamp).toLocaleString();
            row.appendChild(dateCell);
            
            const subjectCell = document.createElement('td');
            subjectCell.textContent = result.subject;
            row.appendChild(subjectCell);
            
            const paperCell = document.createElement('td');
            paperCell.textContent = result.paperCode;
            row.appendChild(paperCell);
            
            const scoreCell = document.createElement('td');
            scoreCell.textContent = `${result.score}/${result.totalMax}`;
            row.appendChild(scoreCell);
            
            const percentCell = document.createElement('td');
            percentCell.textContent = `${Math.round(result.percent)}%`;
            row.appendChild(percentCell);
            
            const actionCell = document.createElement('td');
            const viewButton = document.createElement('span');
            viewButton.className = 'table-action';
            viewButton.textContent = 'View';
            viewButton.addEventListener('click', () => {
                sessionStorage.setItem('currentResult', JSON.stringify(result));
                
                document.getElementById('results-history-modal').classList.add('hidden');
                
                window.location.reload();
            });
            
            actionCell.appendChild(viewButton);
            row.appendChild(actionCell);
            
            historyTableBody.appendChild(row);
        });
    }
    
    function downloadResults() {
        if (!resultData) return;
        
        const rows = [
            ['Subject', 'Paper Code', 'Score', 'Percentage', 'Time Taken', 'Date'],
            [
                resultData.subject,
                resultData.paperCode,
                `${resultData.score}/${resultData.totalMax}`,
                `${Math.round(resultData.percent)}%`,
                formatTime(resultData.timeTaken),
                new Date(resultData.timestamp).toLocaleString()
            ],
            [],
            ['Question', 'Your Answer', 'Correct Answer', 'Result']
        ];
        
        for (let i = 0; i < resultData.totalMax; i++) {
            const userAnswer = resultData.userAnswers[i] || 'None';
            
            let correctAnswer = resultData.correctAnswers[i] || 'Unknown';
            if (correctAnswer && correctAnswer.includes(' ')) {
                correctAnswer = correctAnswer.split(' ')[0];
            }
            
            let result = 'Not Answered';
            
            if (userAnswer !== 'None') {
                result = userAnswer === correctAnswer ? 'Correct' : 'Incorrect';
            }
            
            rows.push([i + 1, userAnswer, correctAnswer, result]);
        }
        
        const csvContent = rows.map(row => row.join(',')).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${resultData.subject}_${resultData.paperCode}_Results.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    function formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    function initializeAIHelper() {
        try {
            const paperCode = resultData.msCode || '';
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
                    '.result-item',
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