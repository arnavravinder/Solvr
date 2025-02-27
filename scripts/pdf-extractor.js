class SolvrPDFExtractor {
    constructor(options = {}) {
        this.apiUrl = options.apiUrl || 'https://solvr-api-wheat.vercel.app/api/extract-answers';
        this.storageKey = options.storageKey || 'solvrAnswers';
        this.onSuccess = options.onSuccess || (data => console.log('Extraction successful:', data));
        this.onError = options.onError || (error => console.error('Extraction error:', error));
        
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, '{}');
        }
    }
    
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
            
            this.saveToStorage(data);
            
            this.onSuccess(data);
            
            return data;
        } catch (error) {
            this.onError(error);
            throw error;
        }
    }
    
    saveToStorage(data) {
        try {
            const existingData = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
            
            const updatedData = { ...existingData, ...data };
            
            localStorage.setItem(this.storageKey, JSON.stringify(updatedData));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
    
    getAnswers(examCode) {
        try {
            const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
            return data[examCode] || null;
        } catch (error) {
            console.error('Error retrieving answers:', error);
            return null;
        }
    }
    
    getAllAnswers() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        } catch (error) {
            console.error('Error retrieving all answers:', error);
            return {};
        }
    }
}

window.SolvrPDFExtractor = SolvrPDFExtractor;