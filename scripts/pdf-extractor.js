/**
 * Solvr PDF Answer Extractor
 * Extracts answers from Cambridge IGCSE mark scheme PDFs
 */

class SolvrPDFExtractor {
    constructor(options = {}) {
        this.apiUrl = options.apiUrl || 'https://solvr-api-wheat.vercel.app/api/extract-answers';
        this.storageKey = options.storageKey || 'solvrAnswers';
        this.onSuccess = options.onSuccess || (data => console.log('Extraction successful:', data));
        this.onError = options.onError || (error => console.error('Extraction error:', error));
        
        // Initialize storage if needed
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, '{}');
        }
    }
    
    /**
     * Extract answers from a PDF file
     */
    async extractAnswers(pdfFile) {
        if (!pdfFile || pdfFile.type !== 'application/pdf') {
            const error = new Error('Please provide a valid PDF file');
            this.onError(error);
            throw error;
        }
        
        try {
            const formData = new FormData();
            formData.append('pdfFile', pdfFile);
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            
            if (!response.ok) {
                let errorMessage = `Server error: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    errorMessage = `${response.status} ${response.statusText}`;
                }
                
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            // Save to localStorage
            this.saveToStorage(data);
            
            // Call success callback
            this.onSuccess(data);
            
            return data;
        } catch (error) {
            this.onError(error);
            throw error;
        }
    }
    
    /**
     * Save extracted answers to localStorage
     */
    saveToStorage(data) {
        try {
            // Get existing data
            const existingData = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
            
            // Merge with new data
            const updatedData = { ...existingData, ...data };
            
            // Save back to localStorage
            localStorage.setItem(this.storageKey, JSON.stringify(updatedData));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
    
    /**
     * Get answers for a specific exam code
     */
    getAnswers(examCode) {
        try {
            const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
            return data[examCode] || null;
        } catch (error) {
            console.error('Error retrieving answers:', error);
            return null;
        }
    }
    
    /**
     * Get all stored answers
     */
    getAllAnswers() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        } catch (error) {
            console.error('Error retrieving all answers:', error);
            return {};
        }
    }

    /**
     * Extract exam code from PDF filename
     */
    extractExamCode(filename) {
        // Try to match Cambridge IGCSE exam code pattern
        const matches = filename.match(/(\d{4})[-_\s]*(s|w)(\d{2})[-_\s]*(ms|qp)[-_\s]*(\d{2})/i);
        
        if (matches) {
            return `${matches[1]}_${matches[2].toLowerCase()}${matches[3]}_${matches[4].toLowerCase()}_${matches[5]}`;
        }
        
        // Use filename without extension as fallback
        return filename.replace(/\.[^/.]+$/, "").replace(/\s+/g, '_').toLowerCase();
    }
}

// Make available globally
window.SolvrPDFExtractor = SolvrPDFExtractor;