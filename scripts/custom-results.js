document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let resultData = null;
    let pdfDoc = null;
    let pageNum = 1;
    let pageRendering = false;
    let pageNumPending = null;
    let scale = 1.5;
    let canvas = document.getElementById('pdf-render');
    let ctx = canvas.getContext('2d');
    
    // Check if we have result data
    try {
        const resultDataJson = sessionStorage.getItem('currentResult');
        if (!resultDataJson) {
            window.location.href = 'custom-selector.html';
            return;
        }
        
        resultData = JSON.parse(resultDataJson);
        
        // Load question paper PDF
        const questionPdf = sessionStorage.getItem('questionPdf');
        if (questionPdf) {
            loadPdf(questionPdf);
        }
        
        // Display results
        displayResults(resultData);
        
    } catch (error) {
        console.error('Error loading result data:', error);
        window.location.href = 'custom-selector.html';
        return;
    }
    
    // Set up event listeners
    document.getElementById('prev-page').addEventListener('click', () => {
        if (pageNum <= 1) return;
        pageNum--;
        queueRenderPage(pageNum);
    });
    
    document.getElementById('next-page').addEventListener('click', () => {
        if (pageNum >= pdfDoc.numPages) return;
        pageNum++;
        queueRenderPage(pageNum);
    });
    
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
    
    /**
     * Load PDF from base64 data
     */
    function loadPdf(pdfData) {
        // Setup PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';
        
        // Load the PDF
        const loadingTask = pdfjsLib.getDocument({ data: atob(pdfData.split(',')[1]) });
        loadingTask.promise.then(function(pdf) {
            pdfDoc = pdf;
            document.getElementById('page-info').textContent = `Page ${pageNum} of ${pdf.numPages}`;
            
            // Initial render
            renderPage(pageNum);
        }).catch(function(error) {
            console.error('Error loading PDF:', error);
        });
    }
    
    /**
     * Render a specific page of the PDF
     */
    function renderPage(num) {
        pageRendering = true;
        
        pdfDoc.getPage(num).then(function(page) {
            // Set scale for A4 size display
            const viewport = page.getViewport({ scale: 1.0 });
            
            // Calculate scale to fit the canvas width while maintaining aspect ratio
            const parent = canvas.parentElement;
            const desiredWidth = parent.clientWidth - 40; // Adjust for padding
            scale = desiredWidth / viewport.width;
            
            // Get viewport with new scale
            const scaledViewport = page.getViewport({ scale });
            
            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;
            
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
        
        document.getElementById('page-info').textContent = `Page ${num} of ${pdfDoc.numPages}`;
    }
    
    /**
     * Queue page rendering if another page is already rendering
     */
    function queueRenderPage(num) {
        if (pageRendering) {
            pageNumPending = num;
        } else {
            renderPage(num);
        }
    }
    
    /**
     * Display the exam results
     */
    function displayResults(result) {
        // Set page title
        document.getElementById('paper-title').textContent = 
            `${result.subject} - ${result.paperCode}`;
        
        // Update score display
        document.getElementById('score-value').textContent = `${result.score}/${result.totalMax}`;
        document.getElementById('score-percent').textContent = `${Math.round(result.percent)}%`;
        
        // Update score box color based on percentage
        const scoreBox = document.querySelector('.score-box');
        if (result.percent < 50) {
            scoreBox.style.backgroundColor = 'var(--danger-color)';
        } else if (result.percent < 80) {
            scoreBox.style.backgroundColor = 'var(--warning-color)';
        } else {
            scoreBox.style.backgroundColor = 'var(--success-color)';
        }
        
        // Update time taken
        const hours = Math.floor(result.timeTaken / 3600);
        const minutes = Math.floor((result.timeTaken % 3600) / 60);
        const seconds = result.timeTaken % 60;
        
        document.getElementById('time-taken').textContent = 
            `Time taken: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update summary statistics
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
        
        // Generate results grid
        generateResultsGrid(result);
    }
    
    /**
     * Generate the results grid
     */
    function generateResultsGrid(result) {
        const resultsGrid = document.getElementById('results-grid');
        resultsGrid.innerHTML = '';
        
        for (let i = 0; i < result.totalMax; i++) {
            const questionNumber = i + 1;
            const userAnswer = result.userAnswers[i];
            const correctAnswer = result.correctAnswers[i];
            
            // Determine status
            let status = '';
            if (userAnswer === null) {
                status = 'not-answered';
            } else if (userAnswer === correctAnswer) {
                status = 'correct';
            } else {
                status = 'incorrect';
            }
            
            // Create result item
            const resultItem = document.createElement('div');
            resultItem.className = `result-item ${status}`;
            
            // Question number
            const questionNumberEl = document.createElement('div');
            questionNumberEl.className = 'question-number';
            questionNumberEl.textContent = `Question ${questionNumber}`;
            resultItem.appendChild(questionNumberEl);
            
            // Answers display
            const answersDisplay = document.createElement('div');
            answersDisplay.className = 'answers-display';
            
            // Your answer row
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
            
            // Correct answer row
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
    
    /**
     * Load and display results history
     */
    function loadResultsHistory() {
        const historyTableBody = document.getElementById('history-table-body');
        historyTableBody.innerHTML = '';
        
        // Get results from localStorage
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
        
        // Sort by timestamp (newest first)
        results.sort((a, b) => b.timestamp - a.timestamp);
        
        // Add each result to the table
        results.forEach((result, index) => {
            const row = document.createElement('tr');
            
            // Date column
            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(result.timestamp).toLocaleString();
            row.appendChild(dateCell);
            
            // Subject column
            const subjectCell = document.createElement('td');
            subjectCell.textContent = result.subject;
            row.appendChild(subjectCell);
            
            // Paper column
            const paperCell = document.createElement('td');
            paperCell.textContent = result.paperCode;
            row.appendChild(paperCell);
            
            // Score column
            const scoreCell = document.createElement('td');
            scoreCell.textContent = `${result.score}/${result.totalMax}`;
            row.appendChild(scoreCell);
            
            // Percentage column
            const percentCell = document.createElement('td');
            percentCell.textContent = `${Math.round(result.percent)}%`;
            row.appendChild(percentCell);
            
            // Action column
            const actionCell = document.createElement('td');
            const viewButton = document.createElement('span');
            viewButton.className = 'table-action';
            viewButton.textContent = 'View';
            viewButton.addEventListener('click', () => {
                // Store the selected result
                sessionStorage.setItem('currentResult', JSON.stringify(result));
                
                // Close the modal
                document.getElementById('results-history-modal').classList.add('hidden');
                
                // Reload the page to display this result
                window.location.reload();
            });
            
            actionCell.appendChild(viewButton);
            row.appendChild(actionCell);
            
            historyTableBody.appendChild(row);
        });
    }
    
    /**
     * Download results as CSV
     */
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
        
        // Add each question's results
        for (let i = 0; i < resultData.totalMax; i++) {
            const userAnswer = resultData.userAnswers[i] || 'None';
            const correctAnswer = resultData.correctAnswers[i] || 'Unknown';
            let result = 'Not Answered';
            
            if (userAnswer !== 'None') {
                result = userAnswer === correctAnswer ? 'Correct' : 'Incorrect';
            }
            
            rows.push([i + 1, userAnswer, correctAnswer, result]);
        }
        
        // Convert to CSV
        const csvContent = rows.map(row => row.join(',')).join('\n');
        
        // Create and download file
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
    
    /**
     * Format time in seconds to HH:MM:SS
     */
    function formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
});