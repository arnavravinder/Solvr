document.addEventListener('DOMContentLoaded', function() {
    let questionPdfFile = null;
    let markSchemePdfFile = null;
    let extractedAnswers = null;
    
    const pdfExtractor = new SolvrPDFExtractor({
        onSuccess: (data) => {
            extractedAnswers = data;
        },
        onError: (error) => {
            showError(`Failed to extract answers: ${error.message}`);
        }
    });
    
    const questionFileButton = document.getElementById('question-file-button');
    const questionFile = document.getElementById('question-file');
    const questionFileName = document.getElementById('question-file-name');
    const questionUploader = document.getElementById('question-uploader');
    
    const markSchemeFileButton = document.getElementById('markscheme-file-button');
    const markSchemeFile = document.getElementById('markscheme-file');
    const markSchemeFileName = document.getElementById('markscheme-file-name');
    const markSchemeUploader = document.getElementById('markscheme-uploader');
    
    const startExamButton = document.getElementById('start-exam');
    const loadingOverlay = document.getElementById('loading-overlay');
    const errorModal = document.getElementById('error-modal');
    const errorMessage = document.getElementById('error-message');
    const errorClose = document.getElementById('error-close');
    
    questionFileButton.addEventListener('click', () => questionFile.click());
    markSchemeFileButton.addEventListener('click', () => markSchemeFile.click());
    
    questionFile.addEventListener('change', handleQuestionFileSelect);
    markSchemeFile.addEventListener('change', handleMarkSchemeFileSelect);
    
    startExamButton.addEventListener('click', startExam);
    errorClose.addEventListener('click', () => errorModal.classList.add('hidden'));
    
    setupDragDrop(questionUploader, handleQuestionFileSelect);
    setupDragDrop(markSchemeUploader, handleMarkSchemeFileSelect);
    
    function handleQuestionFileSelect(event) {
        const file = event.target.files ? event.target.files[0] : event.dataTransfer.files[0];
        
        if (file && file.type === 'application/pdf') {
            questionPdfFile = file;
            questionFileName.textContent = file.name;
            questionUploader.classList.add('has-file');
        } else {
            showError('Please select a valid PDF file');
        }
    }
    
    function handleMarkSchemeFileSelect(event) {
        const file = event.target.files ? event.target.files[0] : event.dataTransfer.files[0];
        
        if (file && file.type === 'application/pdf') {
            markSchemePdfFile = file;
            markSchemeFileName.textContent = file.name;
            markSchemeUploader.classList.add('has-file');
            
            processMarkScheme(file);
        } else {
            showError('Please select a valid PDF file');
        }
    }
    
    async function processMarkScheme(file) {
        try {
            showLoading(true);
            const result = await pdfExtractor.extractAnswers(file);
            showLoading(false);
        } catch (error) {
            showLoading(false);
            showError(`Failed to extract answers: ${error.message}`);
        }
    }
    
    function startExam() {
        if (!questionPdfFile) {
            return showError('Please upload a question paper');
        }
        
        if (!markSchemePdfFile) {
            return showError('Please upload a mark scheme');
        }
        
        if (!extractedAnswers) {
            return showError('Failed to extract answers from mark scheme');
        }
        
        const subject = document.getElementById('subject').value || 'Unknown';
        const paperCode = document.getElementById('paper-code').value || 'Unknown';
        const examDuration = parseInt(document.getElementById('exam-duration').value) || 45;
        const totalQuestions = parseInt(document.getElementById('total-questions').value) || 40;
        
        const msCode = Object.keys(extractedAnswers)[0];
        
        if (!msCode) {
            return showError('Failed to determine mark scheme code');
        }
        
        const correctAnswers = extractedAnswers[msCode];
        if (!correctAnswers || correctAnswers.length === 0) {
            return showError('No answers found in mark scheme');
        }
        
        const examData = {
            subject,
            paperCode,
            examDuration,
            totalQuestions,
            msCode,
            correctAnswers,
            startTime: Date.now()
        };
        
        showLoading(true);
        
        const reader1 = new FileReader();
        reader1.onload = function(e) {
            examData.questionPdf = URL.createObjectURL(questionPdfFile);
            
            const reader2 = new FileReader();
            reader2.onload = function(e) {
                examData.markSchemePdf = URL.createObjectURL(markSchemePdfFile);
                
                sessionStorage.setItem('currentExam', JSON.stringify(examData));
                window.location.href = 'custom-exam.html';
            };
            reader2.readAsDataURL(markSchemePdfFile);
        };
        reader1.readAsDataURL(questionPdfFile);
    }
    
    function setupDragDrop(container, handleFile) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            container.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            container.addEventListener(eventName, () => {
                container.classList.add('drag-active');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            container.addEventListener(eventName, () => {
                container.classList.remove('drag-active');
            }, false);
        });
        
        container.addEventListener('drop', handleFile, false);
    }
    
    function showLoading(show) {
        if (show) {
            loadingOverlay.classList.remove('hidden');
        } else {
            loadingOverlay.classList.add('hidden');
        }
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorModal.classList.remove('hidden');
    }
});