document.addEventListener('DOMContentLoaded', ()=>{
    const form = document.getElementById('spanishWritingForm');
    const resultContainer = document.getElementById('resultContainer');
    const aiResponseDiv = document.getElementById('aiResponse');
  
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      // Gather responses for Question 1 (5 options)
      const q1 = [];
      for(let i = 1; i <= 5; i++){
        const input = form.querySelector(`input[name="q1_option${i}"]`);
        q1.push(input.value.trim());
      }
      // Gather response for Question 2 (Essay)
      const q2 = form.elements['q2_essay'].value.trim();
      // Gather responses for Question 3 (dropdown and essay)
      const q3Choice = form.elements['q3_choice'].value;
      const q3Essay = form.elements['q3_essay'].value.trim();
  
      // Build a combined prompt using prompts from spanish-prompts.json
      let prompts = {};
      try {
        const resp = await fetch('spanish-prompts.json');
        prompts = await resp.json();
      } catch (err) {
        console.error('Error fetching prompts:', err);
      }
      // Expecting the JSON format: { "<paperCode>": { "q1": [...], "q2": [...], "q3": { "A": [...], "B": [...] } } }
      const paperCode = localStorage.getItem('paperCode'); // e.g., "0530_m24_qp_42"
      let paperPrompts = prompts[paperCode] || {};
      let promptText = "";
      if(paperPrompts.q1 && Array.isArray(paperPrompts.q1)){
        promptText += paperPrompts.q1.join(" ") + "\n\n";
      } else {
        promptText += "Question 1 Prompt:\n";
      }
      promptText += "Student Answers for Question 1: " + q1.join(", ") + "\n\n";
      if(paperPrompts.q2 && Array.isArray(paperPrompts.q2)){
        promptText += paperPrompts.q2.join(" ") + "\n\n";
      } else {
        promptText += "Question 2 Prompt:\n";
      }
      promptText += "Student Essay for Question 2:\n" + q2 + "\n\n";
      if(paperPrompts.q3 && paperPrompts.q3[q3Choice] && Array.isArray(paperPrompts.q3[q3Choice])){
        promptText += paperPrompts.q3[q3Choice].join(" ") + "\n\n";
      } else {
        promptText += "Question 3 Prompt:\n";
      }
      promptText += "Student Essay for Question 3:\n" + q3Essay;
      
      // Call Gemini API
      try {
        const res = await fetch("https://solvr-api.vercel.app/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptText })
        });
        const json = await res.json();
        let responseText = "";
        if (json?.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          responseText = json.data.candidates[0].content.parts[0].text;
          responseText = responseText
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/(?<!\*)\*(?!\*)(.*?)\*(?!\*)/g, "<em>$1</em>")
            .replace(/^## (.*)$/gm, "<h2>$1</h2>")
            .replace(/^# (.*)$/gm, "<h1>$1</h1>")
            .replace(/\n/g, "<br>")
            .replace(/(\d+(?:\.\d+)?\/\d+)/g, '<span class="score-highlight">$1</span>');
        } else {
          responseText = "No response from Gemini API.";
        }
        aiResponseDiv.innerHTML = responseText;
        resultContainer.style.display = 'block';
      } catch (err) {
        console.error("Error with Gemini API:", err);
        aiResponseDiv.innerHTML = "Error retrieving AI response.";
        resultContainer.style.display = 'block';
      }
    });
  });
  