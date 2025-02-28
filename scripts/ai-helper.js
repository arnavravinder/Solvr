// scripts/ai-helper.js

class SolvrAIHelper {
    constructor(options = {}) {
      this.options = {
        apiUrl: 'https://solvr-api.vercel.app/api/gemini',
        addStyles: true,
        onError: null,
        ...options
      };
      
      // Add styles if needed
      if (this.options.addStyles) {
        this.addStyles();
      }
    }
    
    /**
     * Show AI Help popup for a specific question
     * @param {string} paperCode - The paper code
     * @param {number} questionNumber - The question number
     */
    async showHelp(paperCode, questionNumber) {
      try {
        // Get question data
        const questionData = this.getQuestionData(paperCode, questionNumber);
        
        if (!questionData) {
          throw new Error('Question data not found');
        }
        
        // Create and show popup
        this.createPopup(questionData, paperCode);
      } catch (error) {
        console.error('Error showing AI help:', error);
        
        // Call error callback if provided
        if (typeof this.options.onError === 'function') {
          this.options.onError(error);
        }
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
     * Create and show AI Help popup
     * @param {Object} questionData - The question data
     * @param {string} paperCode - The paper code
     */
    createPopup(questionData, paperCode) {
      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'ai-help-overlay';
      
      // Create popup container
      const popup = document.createElement('div');
      popup.className = 'ai-help-container';
      
      // Create header
      const header = document.createElement('div');
      header.className = 'ai-help-header';
      header.innerHTML = `
        <h3>AI Explanation: Question ${questionData.number}</h3>
        <button class="close-button">×</button>
      `;
      
      // Create content area
      const content = document.createElement('div');
      content.className = 'ai-help-content';
      
      // Add question details
      const questionDetails = document.createElement('div');
      questionDetails.className = 'question-details';
      questionDetails.innerHTML = `
        <p class="question-text">${questionData.text}</p>
        <div class="options-list">
          ${questionData.options.map(option => `
            <div class="option-item ${option.letter === questionData.correctAnswer ? 'correct-option' : ''}">
              <span class="option-letter">${option.letter}</span>
              <span class="option-text">${option.text}</span>
            </div>
          `).join('')}
        </div>
        <div class="correct-answer">
          <p>Correct Answer: <strong>${questionData.correctAnswer || 'Not available'}</strong></p>
        </div>
      `;
      
      // Add AI explanation section
      const aiExplanation = document.createElement('div');
      aiExplanation.className = 'ai-explanation';
      aiExplanation.innerHTML = `
        <h4>Explanation</h4>
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Getting AI explanation...</p>
        </div>
      `;
      
      // Assemble the popup
      content.appendChild(questionDetails);
      content.appendChild(aiExplanation);
      popup.appendChild(header);
      popup.appendChild(content);
      overlay.appendChild(popup);
      document.body.appendChild(overlay);
      
      // Add close handler
      const closeButton = header.querySelector('.close-button');
      closeButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
      });
      
      // Fetch AI explanation
      if (questionData.aiPrompt) {
        this.fetchAiExplanation(questionData.aiPrompt, aiExplanation);
      } else {
        aiExplanation.innerHTML = `
          <h4>Explanation</h4>
          <div class="error-message">
            <p>No AI prompt available for this question.</p>
          </div>
        `;
      }
    }
    
    /**
     * Fetch AI explanation from the API
     * @param {string} prompt - The AI prompt to send
     * @param {HTMLElement} container - The container to update with the response
     */
    async fetchAiExplanation(prompt, container) {
      try {
        const res = await fetch(this.options.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ prompt })
        });
        
        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Update the container with the response
        container.innerHTML = `
          <h4>Explanation</h4>
          <div class="explanation-text">
            ${data.response.split('\n').map(para => `<p>${para}</p>`).join('')}
          </div>
        `;
      } catch (error) {
        console.error('Error fetching AI explanation:', error);
        container.innerHTML = `
          <h4>Explanation</h4>
          <div class="error-message">
            <p>${error.message || 'Failed to get AI explanation'}</p>
            <button class="retry-button">Retry</button>
          </div>
        `;
        
        // Add retry handler
        const retryButton = container.querySelector('.retry-button');
        if (retryButton) {
          retryButton.addEventListener('click', () => {
            container.innerHTML = `
              <h4>Explanation</h4>
              <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Getting AI explanation...</p>
              </div>
            `;
            this.fetchAiExplanation(prompt, container);
          });
        }
      }
    }
    
    /**
     * Add AI Help button to a question element
     * @param {HTMLElement} questionElement - The question element to add the button to
     * @param {string} paperCode - The paper code
     * @param {number} questionNumber - The question number
     * @returns {HTMLElement|null} - The created button or null if no data available
     */
    addHelpButton(questionElement, paperCode, questionNumber) {
      // Check if we have data for this question
      if (!this.hasQuestionData(paperCode, questionNumber)) {
        return null;
      }
      
      // Create question header if it doesn't exist
      let headerElement = questionElement.querySelector('.question-header');
      if (!headerElement) {
        headerElement = document.createElement('div');
        headerElement.className = 'question-header';
        
        // Move existing question number element into header if it exists
        const numberElement = questionElement.querySelector('.question-number');
        if (numberElement) {
          headerElement.appendChild(numberElement.cloneNode(true));
          numberElement.parentNode.removeChild(numberElement);
        } else {
          // Create new question number element
          const newNumberElement = document.createElement('div');
          newNumberElement.className = 'question-number';
          newNumberElement.textContent = `Question ${questionNumber}`;
          headerElement.appendChild(newNumberElement);
        }
        
        // Insert header at the beginning of the question element
        questionElement.insertBefore(headerElement, questionElement.firstChild);
      }
      
      // Create and add AI help button
      const aiHelpButton = document.createElement('button');
      aiHelpButton.className = 'ai-help-button';
      aiHelpButton.innerHTML = '<span class="sparkle-icon">✨</span><span class="ai-help-text">AI Help</span>';
      aiHelpButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showHelp(paperCode, questionNumber);
      };
      
      headerElement.appendChild(aiHelpButton);
      
      return aiHelpButton;
    }
    
    /**
     * Check if we have question data for a specific question
     * @param {string} paperCode - The paper code
     * @param {number} questionNumber - The question number
     * @returns {boolean} - True if we have data, false otherwise
     */
    hasQuestionData(paperCode, questionNumber) {
      try {
        const questionsJson = localStorage.getItem('solvrQuestions') || '{}';
        const questions = JSON.parse(questionsJson);
        
        if (questions[paperCode] && Array.isArray(questions[paperCode])) {
          return questions[paperCode].some(q => q.number === questionNumber);
        }
      } catch (error) {
        console.error('Error checking for question data:', error);
      }
      return false;
    }
    
    /**
     * Add CSS styles for AI Help
     */
    addStyles() {
      // Check if styles already exist
      if (document.getElementById('ai-help-styles')) return;
      
      const styleEl = document.createElement('style');
      styleEl.id = 'ai-help-styles';
      styleEl.textContent = `
        .ai-help-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .ai-help-container {
          background-color: white;
          border-radius: 8px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        
        .ai-help-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .ai-help-header h3 {
          margin: 0;
          color: #333;
          font-size: 1.25rem;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }
        
        .close-button:hover {
          color: #333;
        }
        
        .ai-help-content {
          padding: 20px;
          overflow-y: auto;
          color: #333;
          max-height: calc(90vh - 60px);
        }
        
        .question-details {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eaeaea;
        }
        
        .question-text {
          font-size: 1.1rem;
          margin-bottom: 15px;
          color: #333;
        }
        
        .options-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .option-item {
          display: flex;
          padding: 8px 12px;
          background-color: #f5f5f5;
          border-radius: 4px;
          align-items: center;
        }
        
        .correct-option {
          background-color: #e8f5e9;
          border-left: 4px solid #4caf50;
        }
        
        .option-letter {
          font-weight: bold;
          margin-right: 10px;
          color: #555;
        }
        
        .correct-answer {
          font-size: 1.05rem;
          margin-top: 10px;
          color: #2e7d32;
        }
        
        .ai-explanation h4 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #333;
        }
        
        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 30px 0;
        }
        
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 15px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .error-message {
          color: #d32f2f;
          padding: 15px;
          background-color: #ffebee;
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .retry-button {
          margin-top: 10px;
          background-color: #f44336;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .explanation-text {
          line-height: 1.6;
          color: #333;
        }
        
        .explanation-text p {
          margin-bottom: 15px;
        }
        
        .question-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        
        .ai-help-button {
          display: flex;
          align-items: center;
          background: none;
          border: none;
          color: var(--primary-color, #6366F1);
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }
        
        .ai-help-button:hover {
          background-color: rgba(99, 102, 241, 0.1);
        }
        
        .sparkle-icon {
          margin-right: 4px;
          font-size: 1.1rem;
        }
        
        @media (max-width: 768px) {
          .options-list {
            grid-template-columns: 1fr;
          }
          
          .ai-help-text {
            display: none;
          }
        }
      `;
      
      document.head.appendChild(styleEl);
    }
    
    /**
     * Initialize AI Help buttons on existing questions
     * @param {string} paperCode - The paper code
     * @param {string} questionSelector - CSS selector for question elements
     * @param {Function} getNumberFromElement - Function to extract question number from element
     */
    initHelpButtons(paperCode, questionSelector, getNumberFromElement) {
      const questionElements = document.querySelectorAll(questionSelector);
      
      questionElements.forEach(element => {
        const questionNumber = getNumberFromElement(element);
        if (questionNumber) {
          this.addHelpButton(element, paperCode, questionNumber);
        }
      });
    }
  }
  
  // Make available globally
  window.SolvrAIHelper = SolvrAIHelper;