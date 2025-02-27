document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let questionPdfFile = null;
    let markSchemePdfFile = null;
    let extractedAnswers = null;
    
    // Initialize PDF extractor
    const pdfExtractor = new SolvrPDFExtractor({
        onSuccess: (data) => {
            console.log('Extraction successful:', data);
            extractedAnswers = data;
        },
        onError: (error) => {
            console.error('Extraction error:', error);
            showError(`Failed to extract answers: ${error.message}`);
        }
    });
    
    // Elements
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
    
    // Add event listeners
    questionFileButton.addEventListener('click', () => questionFile.click());
    markSchemeFileButton.addEventListener('click', () => markSchemeFile.click());
    
    questionFile.addEventListener('change', handleQuestionFileSelect);
    markSchemeFile.addEventListener('change', handleMarkSchemeFileSelect);
    
    startExamButton.addEventListener('click', startExam);
    errorClose.addEventListener('click', () => errorModal.classList.add('hidden'));
    
    // Setup drag and drop
    setupDragDrop(questionUploader, handleQuestionFileSelect);
    setupDragDrop(markSchemeUploader, handleMarkSchemeFileSelect);
    
    // Handle file selection for question paper
    function handleQuestionFileSelect(event) {
        // Get file from input or drop event
        const file = event.target.files ? event.target.files[0] : event.dataTransfer.files[0];
        
        if (file && file.type === 'application/pdf') {
            questionPdfFile = file;
            questionFileName.textContent = file.name;
            questionUploader.classList.add('has-file');
        } else {
            showError('Please select a valid PDF file');
        }
    }
    
    // Handle file selection for mark scheme
    function handleMarkSchemeFileSelect(event) {
        // Get file from input or drop event
        const file = event.target.files ? event.target.files[0] : event.dataTransfer.files[0];
        
        if (file && file.type === 'application/pdf') {
            markSchemePdfFile = file;
            markSchemeFileName.textContent = file.name;
            markSchemeUploader.classList.add('has-file');
            
            // Process mark scheme to extract answers
            processMarkScheme(file);
        } else {
            showError('Please select a valid PDF file');
        }
    }
    
    // Process mark scheme to extract answers
    async function processMarkScheme(file) {
        try {
            showLoading(true);
            
            // Extract answers from mark scheme
            const result = await pdfExtractor.extractAnswers(file);
            
            // Hide loading when complete
            showLoading(false);
            
        } catch (error) {
            showLoading(false);
            showError(`Failed to extract answers: ${error.message}`);
        }
    }
    
    // Start the exam
    function startExam() {
        // Validate inputs
        if (!questionPdfFile) {
            return showError('Please upload a question paper');
        }
        
        if (!markSchemePdfFile) {
            return showError('Please upload a mark scheme');
        }
        
        if (!extractedAnswers) {
            return showError('Failed to extract answers from mark scheme');
        }
        
        // Get exam information
        const subject = document.getElementById('subject').value || 'Unknown';
        const paperCode = document.getElementById('paper-code').value || 'Unknown';
        const examDuration = parseInt(document.getElementById('exam-duration').value) || 45;
        const totalQuestions = parseInt(document.getElementById('total-questions').value) || 40;
        
        // Get mark scheme code
        const msCode = Object.keys(extractedAnswers)[0];
        
        if (!msCode) {
            return showError('Failed to determine mark scheme code');
        }
        
        // Ensure we have the right number of answers
        const correctAnswers = extractedAnswers[msCode];
        if (!correctAnswers || correctAnswers.length === 0) {
            return showError('No answers found in mark scheme');
        }
        
        // Save exam data to session storage
        const examData = {
            subject,
            paperCode,
            examDuration,
            totalQuestions,
            msCode,
            correctAnswers,
            startTime: Date.now()
        };
        
        // Convert PDF files to base64 to store in session
        const reader1 = new FileReader();
        reader1.onload = function(e) {
            examData.questionPdf = e.target.result;
            
            const reader2 = new FileReader();
            reader2.onload = function(e) {
                examData.markSchemePdf = e.target.result;
                
                // Save data and redirect
                sessionStorage.setItem('currentExam', JSON.stringify(examData));
                window.location.href = 'custom-exam.html';
            };
            reader2.readAsDataURL(markSchemePdfFile);
        };
        reader1.readAsDataURL(questionPdfFile);
    }
    
    // Setup drag and drop for a container
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
    
    // Show loading overlay
    function showLoading(show) {
        if (show) {
            loadingOverlay.classList.remove('hidden');
        } else {
            loadingOverlay.classList.add('hidden');
        }
    }
    
    // Show error modal
    function showError(message) {
        errorMessage.textContent = message;
        errorModal.classList.remove('hidden');
    }
});