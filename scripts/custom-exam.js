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
    let scale = 1.5;
    
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
            
            // Calculate scale based on width but ensure height fits well too
            let desiredScale = containerWidth / originalViewport.width;
            
            // Check if the resulting height would be too small and adjust if needed
            const scaledHeight = originalViewport.height * desiredScale;
            if (scaledHeight < containerHeight * 0.9) {
                // If we have extra vertical space, make the PDF a bit taller
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
            
            const numberDiv = document.createElement('div');
            numberDiv.className = 'question-number';
            numberDiv.textContent = `Question ${questionNumber}`;
            questionItem.appendChild(numberDiv);
            
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
    
    window.addEventListener('resize', function() {
        if (pdfDoc) {
            renderPage(pageNum);
        }
    });
});