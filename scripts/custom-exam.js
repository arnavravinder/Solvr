document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let examData = null;
    let userAnswers = [];
    let pdfDoc = null;
    let pageNum = 1;
    let pageRendering = false;
    let pageNumPending = null;
    let scale = 1.5;
    let canvas = document.getElementById('pdf-render');
    let ctx = canvas.getContext('2d');
    let timerInterval = null;
    let timeLeft = 0;
    let startTime = null;
    
    // Check if we have exam data
    try {
        const examDataJson = sessionStorage.getItem('currentExam');
        if (!examDataJson) {
            window.location.href = 'custom-selector.html';
            return;
        }
        
        examData = JSON.parse(examDataJson);
        startTime = examData.startTime || Date.now();
        timeLeft = examData.examDuration * 60; // Convert to seconds
        
        // Initialize user answers array with nulls
        userAnswers = Array(examData.totalQuestions).fill(null);
        
        // Update page title
        document.getElementById('paper-title').textContent = 
            `${examData.subject} - ${examData.paperCode}`;
            
        // Initialize the PDF viewer
        initPdfViewer();
            
        // Load and initialize the PDF
        loadPdf(examData.questionPdf);
        
        // Generate answer buttons
        generateAnswerButtons(examData.totalQuestions);
        
        // Start the timer
        startTimer();
        
    } catch (error) {
        console.error('Error loading exam data:', error);
        window.location.href = 'custom-selector.html';
        return;
    }
    
    // Set up event listeners
    document.getElementById('add-time').addEventListener('click', () => {
        addTime(15 * 60); // Add 15 minutes
    });
    
    document.getElementById('finish-exam').addEventListener('click', showFinishConfirmation);
    document.getElementById('confirm-finish').addEventListener('click', finishExam);
    document.getElementById('cancel-finish').addEventListener('click', () => {
        document.getElementById('confirm-finish-modal').classList.add('hidden');
    });
    
    document.getElementById('add-time-modal').addEventListener('click', () => {
        addTime(15 * 60); // Add 15 minutes
        document.getElementById('time-up-modal').classList.add('hidden');
    });
    
    document.getElementById('finish-now').addEventListener('click', finishExam);
    
    /**
     * Initialize PDF viewer
     */
    function initPdfViewer() {
        // Add PDF controls to the container
        const pdfContainer = document.querySelector('.pdf-container');
        
        // Replace the PDF controls with enhanced version
        const pdfControls = document.getElementById('pdf-controls');
        if (pdfControls) {
            pdfControls.innerHTML = `
                <button id="prev-page" class="control-button" title="Previous Page">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <span id="page-info">Page 0 of 0</span>
                <button id="next-page" class="control-button" title="Next Page">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
            `;
        }
        
        // Replace the canvas container with enhanced version
        const canvasContainer = document.querySelector('#pdf-render');
        if (canvasContainer && canvasContainer.parentElement) {
            const pdfViewer = document.createElement('div');
            pdfViewer.className = 'pdf-viewer';
            pdfViewer.innerHTML = `
                <canvas id="pdf-render"></canvas>
                <div class="zoom-controls">
                    <button id="zoom-out" class="zoom-button" title="Zoom Out">-</button>
                    <span id="zoom-level">150%</span>
                    <button id="zoom-in" class="zoom-button" title="Zoom In">+</button>
                    <button id="zoom-reset" class="zoom-button" title="Reset Zoom">↺</button>
                </div>
            `;
            
            // Replace canvas with the new viewer
            canvasContainer.parentElement.replaceChild(pdfViewer, canvasContainer);
            
            // Update canvas reference
            canvas = document.getElementById('pdf-render');
            ctx = canvas.getContext('2d');
        }
        
        // Add event listeners
        document.getElementById('prev-page').addEventListener('click', previousPage);
        document.getElementById('next-page').addEventListener('click', nextPage);
        document.getElementById('zoom-in').addEventListener('click', zoomIn);
        document.getElementById('zoom-out').addEventListener('click', zoomOut);
        document.getElementById('zoom-reset').addEventListener('click', resetZoom);
        
        // Add keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                nextPage();
            } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
                previousPage();
            } else if (e.key === '+' || e.key === '=') {
                zoomIn();
            } else if (e.key === '-') {
                zoomOut();
            } else if (e.key === '0') {
                resetZoom();
            }
        });
        
        // Add window resize handler
        window.addEventListener('resize', function() {
            if (pdfDoc) {
                // Re-render current page on resize for responsive display
                queueRenderPage(pageNum);
            }
        });
    }
    
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
            updateUI();
        }).catch(function(error) {
            console.error('Error loading PDF:', error);
        });
    }
    
    /**
     * Render a specific page of the PDF
     */
    function renderPage(num) {
        pageRendering = true;
        
        // Show loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'page-loading';
        loadingIndicator.className = 'page-loading';
        loadingIndicator.innerHTML = '<div class="loader-small"></div>';
        
        const pdfViewer = document.querySelector('.pdf-viewer');
        if (pdfViewer && !document.getElementById('page-loading')) {
            pdfViewer.appendChild(loadingIndicator);
        }
        
        pdfDoc.getPage(num).then(function(page) {
            // Standard A4 size with proper width:height ratio (1:√2)
            // A4 aspect ratio is approximately 1:1.414
            const A4_RATIO = 1 / 1.414;
            
            // Get original viewport
            const originalViewport = page.getViewport({ scale: 1.0 });
            
            // Get container dimensions
            const pdfViewer = document.querySelector('.pdf-viewer');
            if (!pdfViewer) return;
            
            const containerWidth = pdfViewer.clientWidth - 40; // Subtract padding
            const containerHeight = pdfViewer.clientHeight - 40;
            
            // Calculate scale based on container dimensions while preserving A4 ratio
            let pageWidth = originalViewport.width;
            let pageHeight = originalViewport.height;
            let pageRatio = pageWidth / pageHeight;
            
            let scaledWidth, scaledHeight;
            
            if (pageRatio > A4_RATIO) {
                // Page is wider than A4 ratio
                scaledWidth = containerWidth;
                scaledHeight = containerWidth / pageRatio;
            } else {
                // Page has A4 ratio or taller
                scaledHeight = containerHeight;
                scaledWidth = containerHeight * pageRatio;
                
                // Ensure width doesn't exceed container
                if (scaledWidth > containerWidth) {
                    scaledWidth = containerWidth;
                    scaledHeight = containerWidth / pageRatio;
                }
            }
            
            // Calculate final scale
            const widthScale = scaledWidth / pageWidth;
            const heightScale = scaledHeight / pageHeight;
            const finalScale = Math.min(widthScale, heightScale) * scale;
            
            // Create viewport with calculated scale
            const viewport = page.getViewport({ scale: finalScale });
            
            // Set canvas dimensions
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // Render the PDF page
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            
            const renderTask = page.render(renderContext);
            
            renderTask.promise.then(function() {
                pageRendering = false;
                
                // Remove loading indicator
                const loadingIndicator = document.getElementById('page-loading');
                if (loadingIndicator) {
                    loadingIndicator.remove();
                }
                
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
     * Go to previous page
     */
    function previousPage() {
        if (pageNum <= 1) {
            return;
        }
        pageNum--;
        queueRenderPage(pageNum);
        updateUI();
    }
    
    /**
     * Go to next page
     */
    function nextPage() {
        if (!pdfDoc || pageNum >= pdfDoc.numPages) {
            return;
        }
        pageNum++;
        queueRenderPage(pageNum);
        updateUI();
    }
    
    /**
     * Zoom in the PDF
     */
    function zoomIn() {
        scale += 0.25;
        queueRenderPage(pageNum);
        updateZoomLevel();
    }
    
    /**
     * Zoom out the PDF
     */
    function zoomOut() {
        if (scale > 0.5) {
            scale -= 0.25;
            queueRenderPage(pageNum);
            updateZoomLevel();
        }
    }
    
    /**
     * Reset zoom to default
     */
    function resetZoom() {
        scale = 1.5;
        queueRenderPage(pageNum);
        updateZoomLevel();
    }
    
    /**
     * Update zoom level display
     */
    function updateZoomLevel() {
        const zoomLevel = document.getElementById('zoom-level');
        if (zoomLevel) {
            zoomLevel.textContent = `${Math.round(scale * 100)}%`;
        }
    }
    
    /**
     * Update UI controls state
     */
    function updateUI() {
        const prevButton = document.getElementById('prev-page');
        const nextButton = document.getElementById('next-page');
        
        if (prevButton) {
            prevButton.disabled = pageNum <= 1;
        }
        
        if (nextButton) {
            nextButton.disabled = !pdfDoc || pageNum >= pdfDoc.numPages;
        }
        
        updateZoomLevel();
    }
    
    /**
     * Generate answer option buttons
     */
    function generateAnswerButtons(totalQuestions) {
        const answersGrid = document.getElementById('answers-grid');
        answersGrid.innerHTML = '';
        
        for (let i = 0; i < totalQuestions; i++) {
            const questionNumber = i + 1;
            
            // Create container
            const questionItem = document.createElement('div');
            questionItem.className = 'question-item';
            
            // Add question number
            const numberDiv = document.createElement('div');
            numberDiv.className = 'question-number';
            numberDiv.textContent = `Question ${questionNumber}`;
            questionItem.appendChild(numberDiv);
            
            // Create options container
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'answer-options';
            
            // Create A, B, C, D options with different colors
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
                
                // Add click handler
                optionButton.addEventListener('click', handleAnswerSelect);
                
                optionsContainer.appendChild(optionButton);
            });
            
            questionItem.appendChild(optionsContainer);
            answersGrid.appendChild(questionItem);
        }
        
        updateProgressIndicator();
    }
    
    /**
     * Handle answer selection
     */
    function handleAnswerSelect(event) {
        const questionIndex = parseInt(event.target.dataset.question) - 1;
        const selectedAnswer = event.target.dataset.answer;
        
        // Update user answers array
        userAnswers[questionIndex] = selectedAnswer;
        
        // Update UI - clear all selections for this question
        const options = document.querySelectorAll(`.answer-option[data-question="${questionIndex + 1}"]`);
        options.forEach(option => {
            option.classList.remove('selected');
        });
        
        // Mark selected option
        event.target.classList.add('selected');
        
        // Update progress indicator
        updateProgressIndicator();
    }
    
    /**
     * Update the progress indicator
     */
    function updateProgressIndicator() {
        const answeredCount = userAnswers.filter(answer => answer !== null).length;
        const totalQuestions = examData.totalQuestions;
        
        document.getElementById('progress-indicator').textContent = 
            `${answeredCount}/${totalQuestions} answered`;
            
        // Also update the count in the confirmation modal
        document.getElementById('answered-count').textContent = answeredCount;
        document.getElementById('total-count').textContent = totalQuestions;
    }
    
    /**
     * Start the exam timer
     */
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
    
    /**
     * Update the timer display
     */
    function updateTimerDisplay() {
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const seconds = timeLeft % 60;
        
        document.getElementById('timer-display').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * Add time to the exam
     */
    function addTime(seconds) {
        timeLeft += seconds;
        updateTimerDisplay();
        
        // If timer was stopped, restart it
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
    
    /**
     * Show finish confirmation modal
     */
    function showFinishConfirmation() {
        document.getElementById('confirm-finish-modal').classList.remove('hidden');
    }
    
    /**
     * Finish the exam and calculate results
     */
    function finishExam() {
        // Clear timer
        clearInterval(timerInterval);
        
        // Show loading
        document.getElementById('loading-overlay').classList.remove('hidden');
        
        // Calculate score
        const correctAnswers = examData.correctAnswers;
        let score = 0;
        
        for (let i = 0; i < userAnswers.length; i++) {
            if (userAnswers[i] === correctAnswers[i]) {
                score++;
            }
        }
        
        // Calculate time taken
        const endTime = Date.now();
        const timeTakenSeconds = Math.floor((endTime - startTime) / 1000);
        
        // Create result object
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
        
        // Save to localStorage
        const storedResults = JSON.parse(localStorage.getItem('solvrResults') || '[]');
        result.attemptIndex = storedResults.length;
        storedResults.push(result);
        localStorage.setItem('solvrResults', JSON.stringify(storedResults));
        
        // Save current result for the results page
        sessionStorage.setItem('currentResult', JSON.stringify(result));
        sessionStorage.setItem('questionPdf', examData.questionPdf);
        
        // Clear current exam
        sessionStorage.removeItem('currentExam');
        
        // Redirect to results page
        window.location.href = 'custom-results.html';
    }
});