const reviewIndex = localStorage.getItem('reviewIndex');
let storedResults = JSON.parse(localStorage.getItem('solvrResults')) || [];
const resultData = storedResults[reviewIndex];

const paperCode = resultData.paperCode;
document.getElementById('pdfFrame').src = `./0455/${paperCode}.pdf`;

// PDF Navigation Controls
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const currentPageEl = document.getElementById('currentPage');
const totalPagesEl = document.getElementById('totalPages');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let pdfDoc = null;
let pdfCanvas = document.getElementById('pdf-canvas');
let pdfContainer = null;
let currentPage = 1;
let totalPages = 1;
let currentScale = 1.2;

document.addEventListener('DOMContentLoaded', () => {
  const pdfContainerElement = document.querySelector('.pdf-canvas-container');
  if (pdfContainerElement) {
    pdfContainer = pdfContainerElement;
  }
  
  initPdfControls();
  processWrongQuestions();
  
  window.addEventListener('resize', () => {
    if (pdfDoc && currentPage) {
      renderPage(currentPage);
    }
  });
});

function initPdfControls() {
  prevPageBtn = document.getElementById('prevPageBtn');
  nextPageBtn = document.getElementById('nextPageBtn');
  currentPageEl = document.getElementById('currentPage');
  totalPagesEl = document.getElementById('totalPages');
  zoomInBtn = document.getElementById('zoomInBtn');
  zoomOutBtn = document.getElementById('zoomOutBtn');
  
  if (prevPageBtn && nextPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
      }
    });
    
    nextPageBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderPage(currentPage);
      }
    });
    
    zoomInBtn.addEventListener('click', () => {
      currentScale += 0.2;
      renderPage(currentPage);
    });
    
    zoomOutBtn.addEventListener('click', () => {
      if (currentScale > 0.6) {
        currentScale -= 0.2;
        renderPage(currentPage);
      }
    });
    
    console.log("PDF controls initialized successfully");
    
    try {
      const pdfUrl = `./0455/${paperCode}.pdf`;
      loadPdf(pdfUrl);
    } catch (error) {
      console.error("Error initializing PDF:", error);
    }
  } else {
    console.error("PDF controls not found in DOM");
  }
}

function loadPdf(url) {
  try {
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then(arrayBuffer => {
        return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      })
      .then(pdf => {
        console.log("PDF loaded successfully");
        pdfDoc = pdf;
        totalPages = pdf.numPages;
        
        if (totalPagesEl) {
          totalPagesEl.textContent = totalPages;
        }
        
        renderPage(1);
      })
      .catch(error => {
        console.error("Error loading PDF:", error);
      });
  } catch (error) {
    console.error("Error in loadPdf:", error);
  }
}

function renderPage(pageNumber) {
  if (!pdfDoc || !pdfCanvas) return;
  
  try {
    pdfDoc.getPage(pageNumber).then(page => {
      const pdfViewport = page.getViewport({ scale: 1.0 });
      
      let viewport;
      const containerWidth = document.querySelector('.pdf-viewer').clientWidth;
      const containerHeight = document.querySelector('.pdf-viewer').clientHeight;
      
      // Calculate scale to fit width, leaving a small margin
      const scaleWidth = (containerWidth - 40) / pdfViewport.width;
      
      // Calculate scale to fit height, leaving a small margin
      const scaleHeight = (containerHeight - 40) / pdfViewport.height;
      
      // Use the smaller scale to ensure the PDF fits in the container
      const fitScale = Math.min(scaleWidth, scaleHeight);
      
      // Apply user's zoom adjustments
      const finalScale = fitScale * currentScale;
      
      // Create a new viewport with the calculated scale
      viewport = page.getViewport({ scale: finalScale });
      
      pdfCanvas.height = viewport.height;
      pdfCanvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: pdfCanvas.getContext('2d'),
        viewport: viewport
      };
      
      page.render(renderContext);
      
      currentPage = pageNumber;
      if (currentPageEl) {
        currentPageEl.textContent = pageNumber;
      }
      
      if (prevPageBtn) {
        prevPageBtn.disabled = pageNumber <= 1;
        prevPageBtn.style.opacity = pageNumber <= 1 ? "0.5" : "1";
      }
      
      if (nextPageBtn) {
        nextPageBtn.disabled = pageNumber >= totalPages;
        nextPageBtn.style.opacity = pageNumber >= totalPages ? "0.5" : "1";
      }
    });
  } catch (error) {
    console.error("Error in renderPage:", error);
  }
}