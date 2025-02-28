class SolvrPDFExtractor {
  constructor(options = {}) {
    this.options = {
      apiUrl: 'https://solvr-api-wheat.vercel.app/',
      onSuccess: null,
      onError: null,
      ...options
    };
  }

  async extractAnswers(pdfFile) {
    try {
      if (!pdfFile || pdfFile.type !== 'application/pdf') {
        throw new Error('Invalid file. Please upload a PDF file.');
      }

      const API_URL = this.options.apiUrl || '/api/extract-answers';
      
      const formData = new FormData();
      formData.append('pdfFile', pdfFile);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      this.saveDataToLocalStorage(data);
      
      if (typeof this.options.onSuccess === 'function') {
        this.options.onSuccess(data);
      }
      
      return data;
    } catch (error) {
      console.error('Error extracting answers:', error);
      
      if (typeof this.options.onError === 'function') {
        this.options.onError(error);
      }
      
      throw error;
    }
  }
  
  saveDataToLocalStorage(data) {
    try {
      const paperCode = Object.keys(data).find(key => key !== 'metadata' && key !== 'questions');
      
      if (!paperCode) {
        console.error('No paper code found in the response');
        return;
      }
      
      const answers = data[paperCode];
      
      const existingAnswersJson = localStorage.getItem('solvrAnswers') || '{}';
      const existingAnswers = JSON.parse(existingAnswersJson);
      
      const updatedAnswers = {
        ...existingAnswers,
        [paperCode]: answers
      };
      
      localStorage.setItem('solvrAnswers', JSON.stringify(updatedAnswers));
      
      if (data.metadata) {
        const existingMetadataJson = localStorage.getItem('solvrMetadata') || '{}';
        const existingMetadata = JSON.parse(existingMetadataJson);
        
        const updatedMetadata = {
          ...existingMetadata,
          [paperCode]: data.metadata
        };
        
        localStorage.setItem('solvrMetadata', JSON.stringify(updatedMetadata));
      }
      
      if (data.questions && data.questions.length > 0) {
        const existingQuestionsJson = localStorage.getItem('solvrQuestions') || '{}';
        const existingQuestions = JSON.parse(existingQuestionsJson);
        
        const updatedQuestions = {
          ...existingQuestions,
          [paperCode]: data.questions
        };
        
        localStorage.setItem('solvrQuestions', JSON.stringify(updatedQuestions));
      }
      
      console.log(`Data for ${paperCode} saved to localStorage successfully`);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
  
  getQuestionData(paperCode, questionNumber) {
    try {
      const questionsJson = localStorage.getItem('solvrQuestions') || '{}';
      const questions = JSON.parse(questionsJson);
      
      if (questions[paperCode] && Array.isArray(questions[paperCode])) {
        return questions[paperCode].find(q => q.number === questionNumber) || null;
      }
    } catch (error) {
      console.error('Error getting question data:', error);
    }
    return null;
  }
  
  getAnswers(paperCode) {
    try {
      const answersJson = localStorage.getItem('solvrAnswers') || '{}';
      const answers = JSON.parse(answersJson);
      
      return answers[paperCode] || null;
    } catch (error) {
      console.error('Error getting answers:', error);
      return null;
    }
  }
  
  getMetadata(paperCode) {
    try {
      const metadataJson = localStorage.getItem('solvrMetadata') || '{}';
      const metadata = JSON.parse(metadataJson);
      
      return metadata[paperCode] || null;
    } catch (error) {
      console.error('Error getting metadata:', error);
      return null;
    }
  }
  
  clearAllData() {
    localStorage.removeItem('solvrAnswers');
    localStorage.removeItem('solvrMetadata');
    localStorage.removeItem('solvrQuestions');
  }
}

window.SolvrPDFExtractor = SolvrPDFExtractor;