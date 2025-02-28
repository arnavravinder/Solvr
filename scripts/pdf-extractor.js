// scripts/pdf-extractor.js

class SolvrPDFExtractor {
    constructor(options = {}) {
      this.options = {
        onSuccess: null,
        onError: null,
        ...options
      };
    }
  
    /**
     * Extract answers from a mark scheme PDF
     * @param {File} pdfFile - The PDF file to extract answers from
     * @returns {Promise<Object>} - Object containing extracted answers keyed by paper code
     */
    async extractAnswers(pdfFile) {
      try {
        if (!pdfFile || pdfFile.type !== 'application/pdf') {
          throw new Error('Invalid file. Please upload a PDF file.');
        }
  
        // Get the API URL
        const API_URL = this.options.apiUrl || '/api/extract-answers';
        
        // Create form data
        const formData = new FormData();
        formData.append('pdfFile', pdfFile);
        
        // Send request to API
        const response = await fetch(API_URL, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Process and save the data locally
        this.saveDataToLocalStorage(data);
        
        // Call success callback if provided
        if (typeof this.options.onSuccess === 'function') {
          this.options.onSuccess(data);
        }
        
        return data;
      } catch (error) {
        console.error('Error extracting answers:', error);
        
        // Call error callback if provided
        if (typeof this.options.onError === 'function') {
          this.options.onError(error);
        }
        
        throw error;
      }
    }
    
    /**
     * Save extracted data to localStorage
     * @param {Object} data - The data returned from the API
     */
    saveDataToLocalStorage(data) {
      try {
        // Extract the paper code (first key in the object that's not "metadata" or "questions")
        const paperCode = Object.keys(data).find(key => key !== 'metadata' && key !== 'questions');
        
        if (!paperCode) {
          console.error('No paper code found in the response');
          return;
        }
        
        // Get the answers array
        const answers = data[paperCode];
        
        // Save basic answers (backwards compatibility)
        const existingAnswersJson = localStorage.getItem('solvrAnswers') || '{}';
        const existingAnswers = JSON.parse(existingAnswersJson);
        
        // Update with new answers
        const updatedAnswers = {
          ...existingAnswers,
          [paperCode]: answers
        };
        
        // Save back to localStorage
        localStorage.setItem('solvrAnswers', JSON.stringify(updatedAnswers));
        
        // Save metadata if available
        if (data.metadata) {
          const existingMetadataJson = localStorage.getItem('solvrMetadata') || '{}';
          const existingMetadata = JSON.parse(existingMetadataJson);
          
          // Update with new metadata
          const updatedMetadata = {
            ...existingMetadata,
            [paperCode]: data.metadata
          };
          
          // Save back to localStorage
          localStorage.setItem('solvrMetadata', JSON.stringify(updatedMetadata));
        }
        
        // Save question data if available
        if (data.questions && data.questions.length > 0) {
          const existingQuestionsJson = localStorage.getItem('solvrQuestions') || '{}';
          const existingQuestions = JSON.parse(existingQuestionsJson);
          
          // Update with new questions
          const updatedQuestions = {
            ...existingQuestions,
            [paperCode]: data.questions
          };
          
          // Save back to localStorage
          localStorage.setItem('solvrQuestions', JSON.stringify(updatedQuestions));
        }
        
        console.log(`Data for ${paperCode} saved to localStorage successfully`);
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
    
    /**
     * Get question data from localStorage
     * @param {string} paperCode - The paper code
     * @param {number} questionNumber - The question number
     * @returns {Object|null} - The question data or null if not found
     */
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
    
    /**
     * Get all answers for a specific paper
     * @param {string} paperCode - The paper code
     * @returns {Array|null} - Array of answers or null if not found
     */
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
    
    /**
     * Get metadata for a specific paper
     * @param {string} paperCode - The paper code
     * @returns {Object|null} - Metadata object or null if not found
     */
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
    
    /**
     * Clear all stored data
     */
    clearAllData() {
      localStorage.removeItem('solvrAnswers');
      localStorage.removeItem('solvrMetadata');
      localStorage.removeItem('solvrQuestions');
    }
  }
  
  // Make available globally
  window.SolvrPDFExtractor = SolvrPDFExtractor;