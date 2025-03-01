class SolvrPDFExtractor {
    constructor(options = {}) {
        this.apiUrl = options.apiUrl || 'https://solvr-api-wheat.vercel.app/api/extract-answers';
        this.onSuccess = options.onSuccess || function() {};
        this.onError = options.onError || function() {};
    }
    
    async extractAnswers(file) {
        try {
            if (!file || file.type !== 'application/pdf') {
                throw new Error('Please provide a valid PDF file');
            }
            
            const formData = new FormData();
            formData.append('pdfFile', file);
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (this.onSuccess && typeof this.onSuccess === 'function') {
                this.onSuccess(data);
            }
            
            return data;
        } catch (error) {
            if (this.onError && typeof this.onError === 'function') {
                this.onError(error);
            }
            throw error;
        }
    }
    
    static getNameFromCode(code) {
        const parts = code.split('_');
        if (parts.length < 3) return code;
        
        const subjectCode = parts[0];
        const season = parts[1];
        const paperNumber = parts[2];
        
        let seasonDisplay = '';
        if (season.startsWith('s')) {
            seasonDisplay = 'Summer 20' + season.substring(1);
        } else if (season.startsWith('w')) {
            seasonDisplay = 'Winter 20' + season.substring(1);
        }
        
        const subjectMap = {
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
        
        const subject = subjectMap[subjectCode] || `Subject ${subjectCode}`;
        
        return `${subject} ${seasonDisplay} Paper ${paperNumber}`;
    }
}