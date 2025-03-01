document.addEventListener('DOMContentLoaded', function() {
    let questionPdfFile = null;
    let markSchemePdfFile = null;
    let extractedAnswers = null;
    
    const pdfExtractor = new SolvrPDFExtractor({
        onSuccess: (data) => {
            extractedAnswers = data;
            autoFillFormFields(data);
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
            
            parseQuestionPdf(file);
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
    
    async function parseQuestionPdf(file) {
        try {
            showLoading(true);
            
            const arrayBuffer = await file.arrayBuffer();
            const pdfData = new Uint8Array(arrayBuffer);
            const loadingTask = pdfjsLib.getDocument({data: pdfData});
            const pdf = await loadingTask.promise;
            
            let extractedText = '';
            const maxPages = Math.min(5, pdf.numPages);
            
            for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                extractedText += pageText + '\n';
            }
            
            const metadata = extractBasicMetadata(extractedText, file.name);
            
            if (metadata.subject) {
                document.getElementById('subject').value = metadata.subject;
            }
            
            if (metadata.paperCode) {
                document.getElementById('paper-code').value = metadata.paperCode;
            }
            
            if (metadata.examDuration) {
                document.getElementById('exam-duration').value = metadata.examDuration;
            }
            
            if (metadata.totalQuestions) {
                document.getElementById('total-questions').value = metadata.totalQuestions;
            }
            
            showLoading(false);
        } catch (error) {
            console.error('Error parsing question PDF:', error);
            showLoading(false);
        }
    }
    
    function extractBasicMetadata(text, filename) {
        const metadata = {};
        
        const subjectMatch = text.match(/\b(Economics|Mathematics|Chemistry|Physics|Biology|Business|Geography|History|Computer Science)\b/i);
        if (subjectMatch) {
            metadata.subject = subjectMatch[1];
        } else {
            const codeMatch = filename.match(/(\d{4})/);
            if (codeMatch) {
                const subjectCodeMap = {
                    '0455': 'Economics',
                    '0580': 'Mathematics',
                    '0620': 'Chemistry',
                    '0625': 'Physics',
                    '0610': 'Biology',
                    '0470': 'History',
                    '0460': 'Geography',
                    '0417': 'ICT',
                    '0478': 'Computer Science',
                    '0450': 'Business Studies'
                };
                metadata.subject = subjectCodeMap[codeMatch[1]] || '';
            }
        }
        
        const paperCodeMatch = text.match(/(\d{4})\/(\d{2})/);
        if (paperCodeMatch) {
            metadata.paperCode = paperCodeMatch[1] + '/' + paperCodeMatch[2];
        } else {
            const fileMatch = filename.match(/(\d{4})[-_\s]*(s|w)(\d{2})[-_\s]*(qp|ms)[-_\s]*(\d{2})/i);
            if (fileMatch) {
                metadata.paperCode = `${fileMatch[1]}/${fileMatch[5]}`;
            }
        }
        
        const timeMatch = text.match(/(\d+)\s*(?:minute|min|m)s?/i);
        if (timeMatch) {
            const minutes = parseInt(timeMatch[1]);
            if (minutes > 0 && minutes <= 180) {
                metadata.examDuration = minutes;
            }
        } else {
            const hourTimeMatch = text.match(/(\d+)\s*(?:hour|hr|h)s?(?:\s*and\s*)?(\d+)?\s*(?:minute|min|m)?s?/i);
            if (hourTimeMatch) {
                let minutes = 0;
                if (hourTimeMatch[1]) {
                    const hours = parseInt(hourTimeMatch[1]);
                    if (hours > 0 && hours <= 3) {
                        minutes += hours * 60;
                    }
                }
                if (hourTimeMatch[2]) minutes += parseInt(hourTimeMatch[2]);
                
                if (minutes > 0 && minutes <= 180) {
                    metadata.examDuration = minutes;
                }
            }
        }
        
        if (!metadata.examDuration) {
            metadata.examDuration = 45;
        }
        
        const questionCountMatch = text.match(/(\d+)\s+(?:multiple[-\s]choice\s+)?questions/i);
        if (questionCountMatch) {
            const count = parseInt(questionCountMatch[1]);
            if (count > 0 && count <= 100) {
                metadata.totalQuestions = count;
            }
        }
        
        if (!metadata.totalQuestions) {
            const questionNumbers = [];
            const questionNumberPattern = /\b(\d+)\b\s+[A-Za-z]/g;
            let questionMatch;
            
            while ((questionMatch = questionNumberPattern.exec(text)) !== null) {
                const num = parseInt(questionMatch[1]);
                if (!isNaN(num) && num > 0 && num <= 100) {
                    questionNumbers.push(num);
                }
            }
            
            if (questionNumbers.length > 0) {
                metadata.totalQuestions = Math.max(...questionNumbers);
            } else {
                metadata.totalQuestions = 30;
            }
        }
        
        return metadata;
    }
    
    function autoFillFormFields(data) {
        if (!data || !data.metadata) return;
        
        const metadata = data.metadata;
        
        if (metadata.subject && !document.getElementById('subject').value) {
            document.getElementById('subject').value = metadata.subject;
        }
        
        if (metadata.paperCode && !document.getElementById('paper-code').value) {
            document.getElementById('paper-code').value = metadata.paperCode;
        }
        
        if (metadata.examDuration && !document.getElementById('exam-duration').value) {
            document.getElementById('exam-duration').value = metadata.examDuration;
        }
        
        if (metadata.totalQuestions && !document.getElementById('total-questions').value) {
            document.getElementById('total-questions').value = metadata.totalQuestions;
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
        
        const msCode = Object.keys(extractedAnswers).find(key => key !== 'metadata' && key !== 'questions');
        
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
        
        const questionReader = new FileReader();
        questionReader.onload = function(e) {
            examData.questionPdf = e.target.result;
            
            const markSchemeReader = new FileReader();
            markSchemeReader.onload = function(e) {
                examData.markSchemePdf = e.target.result;
                
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