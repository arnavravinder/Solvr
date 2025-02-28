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
        
        // Read the question PDF as data URL
        const questionReader = new FileReader();
        questionReader.onload = function(e) {
            examData.questionPdf = e.target.result; // This is a data URL (base64)
            
            // Read the mark scheme PDF as data URL
            const markSchemeReader = new FileReader();
            markSchemeReader.onload = function(e) {
                examData.markSchemePdf = e.target.result; // This is a data URL (base64)
                
                // Save to session storage and redirect
                sessionStorage.setItem('currentExam', JSON.stringify(examData));
                window.location.href = 'custom-exam.html';
            };
            markSchemeReader.readAsDataURL(markSchemePdfFile);
        };
        questionReader.readAsDataURL(questionPdfFile);
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

// Add this function to custom-selector.js to handle CORS issues

async function processMarkScheme(file) {
    try {
        showLoading(true);
        
        // First try with direct API call
        try {
            const pdfExtractor = new SolvrPDFExtractor({
                apiUrl: '/api/proxy-extraction', // Use local proxy API instead
                onSuccess: (data) => {
                    console.log('Extraction successful:', data);
                    extractedAnswers = data;
                },
                onError: (error) => {
                    console.error('Extraction failed:', error);
                    showError(`Failed to extract answers: ${error.message}`);
                }
            });
            
            await pdfExtractor.extractAnswers(file);
            showLoading(false);
            return;
        } catch (apiError) {
            console.error('API extraction failed, trying manual extraction:', apiError);
            // Continue to manual extraction if API fails
        }
        
        // Manual extraction fallback
        try {
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const pdfData = new Uint8Array(e.target.result);
                    const loadingTask = pdfjsLib.getDocument({data: pdfData});
                    const pdf = await loadingTask.promise;
                    
                    let extractedText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        extractedText += pageText + '\n';
                    }
                    
                    // Simple extraction logic
                    const answers = parseAnswersFromText(extractedText);
                    
                    // Create a response object similar to the API
                    const paperCode = getCodeFromFilename(file.name);
                    extractedAnswers = {
                        [paperCode]: answers
                    };
                    
                    // Save to localStorage
                    const existingAnswersJson = localStorage.getItem('solvrAnswers') || '{}';
                    const existingAnswers = JSON.parse(existingAnswersJson);
                    existingAnswers[paperCode] = answers;
                    localStorage.setItem('solvrAnswers', JSON.stringify(existingAnswers));
                    
                    showLoading(false);
                } catch (error) {
                    console.error('Error in PDF processing:', error);
                    showError(`Failed to process PDF: ${error.message}`);
                    showLoading(false);
                }
            };
            reader.onerror = function(error) {
                console.error('Error reading file:', error);
                showError(`Error reading file: ${error.message}`);
                showLoading(false);
            };
            reader.readAsArrayBuffer(file);
        } catch (manualError) {
            console.error('Manual extraction failed:', manualError);
            showError(`Failed to extract answers: ${manualError.message}`);
            showLoading(false);
        }
    } catch (error) {
        console.error('Overall processing error:', error);
        showError(`Failed to process mark scheme: ${error.message}`);
        showLoading(false);
    }
}

// Helper function to parse answers from text
function parseAnswersFromText(text) {
    const answers = Array(40).fill(null);
    
    // Try to match patterns like "1 A", "2 B", etc.
    const lines = text.split('\n');
    
    // Try different patterns
    for (const line of lines) {
        // Pattern: "1 A"
        const simpleMatch = line.match(/^(\d+)\s+([A-D])/);
        if (simpleMatch) {
            const questionNumber = parseInt(simpleMatch[1]);
            const answer = simpleMatch[2];
            
            if (questionNumber >= 1 && questionNumber <= 40) {
                answers[questionNumber - 1] = answer;
            }
            continue;
        }
        
        // Pattern: "1. A" or "Question 1: A"
        const complexMatch = line.match(/(?:Question\s*)?(\d+)(?:\.|\:)\s*([A-D])/i);
        if (complexMatch) {
            const questionNumber = parseInt(complexMatch[1]);
            const answer = complexMatch[2];
            
            if (questionNumber >= 1 && questionNumber <= 40) {
                answers[questionNumber - 1] = answer;
            }
        }
    }
    
    // If we found very few answers, try a broader approach
    if (answers.filter(a => a !== null).length < 10) {
        // Look for any number followed by a letter A-D
        const regex = /(\d+)\s+([A-D])/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            const questionNumber = parseInt(match[1]);
            const answer = match[2];
            
            if (questionNumber >= 1 && questionNumber <= 40) {
                answers[questionNumber - 1] = answer;
            }
        }
    }
    
    return answers;
}

// Helper function to get code from filename
function getCodeFromFilename(filename) {
    // Try to match common Cambridge exam pattern
    const matches = filename.match(/(\d{4})[-_\s]*(s|w)(\d{2})[-_\s]*(ms|qp)[-_\s]*(\d{2})/i);
    
    if (matches) {
        return `${matches[1]}_${matches[2].toLowerCase()}${matches[3]}_${matches[4].toLowerCase()}_${matches[5]}`;
    }
    
    // Use filename without extension as fallback
    return filename.replace(/\.[^/.]+$/, "").replace(/\s+/g, '_').toLowerCase();
}