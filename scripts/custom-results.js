document.addEventListener('DOMContentLoaded', function() {
    let resultData = null;
    let pdfDoc = null;
    let pageNum = 1;
    let pageRendering = false;
    let pageNumPending = null;
    let scale = 1.0;
    
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
            const viewport = page.getViewport({ scale: 1.0 });
            const canvas = document.getElementById('pdf-canvas');
            const ctx = canvas.getContext('2d');
            
            const pdfContainer = canvas.closest('.pdf-viewer');
            const containerWidth = pdfContainer.clientWidth;
            const containerHeight = pdfContainer.clientHeight;
            
            const widthScale = containerWidth / viewport.width;
            const heightScale = containerHeight / viewport.height;
            const scaleToUse = Math.min(widthScale, heightScale);
            
            const scaledViewport = page.getViewport({ scale: scaleToUse });
            
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            
            const renderContext = {
                canvasContext: ctx,
                viewport: scaledViewport
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
            
            const questionNumberEl = document.createElement('div');
            questionNumberEl.className = 'question-number';
            questionNumberEl.textContent = `Question ${questionNumber}`;
            resultItem.appendChild(questionNumberEl);
            
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
            correctAnswerValue.textContent = correctAnswer || 'Unknown';
            
            correctAnswerRow.appendChild(correctAnswerLabel);
            correctAnswerRow.appendChild(correctAnswerValue);
            answersDisplay.appendChild(correctAnswerRow);
            
            resultItem.appendChild(answersDisplay);
            resultsGrid.appendChild(resultItem);
        }
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
            const correctAnswer = resultData.correctAnswers[i] || 'Unknown';
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
    
    window.addEventListener('resize', function() {
        if (pdfDoc) {
            renderPage(pageNum);
        }
    });
});