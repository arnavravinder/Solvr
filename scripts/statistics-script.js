const resultsBody = document.getElementById('resultsBody');
const subjectFilter = document.getElementById('subjectFilter');
const deleteAllBtn = document.getElementById('deleteAllBtn');

let storedResults = JSON.parse(localStorage.getItem('solvrResults'))||[];

function renderResults() {
    resultsBody.innerHTML = '';
    const filterValue = subjectFilter.value;
    let filtered = storedResults;
    if (filterValue !== 'All') {
        filtered = storedResults.filter(r => r.subject === filterValue);
    }
    filtered.forEach((res) => {
        const tr = document.createElement('tr');

        const subjectTd = document.createElement('td');
        subjectTd.textContent = res.subject;

        const paperTd = document.createElement('td');
        paperTd.textContent = res.paperCode;

        const percentTd = document.createElement('td');
        let mainPercent = '-';
        if(typeof res.percent==='number'){
            mainPercent = res.percent.toFixed(2)+'%';
        }
        percentTd.textContent = mainPercent;

        const reviewPercentTd = document.createElement('td');
        let reviewDisplay = '-';
        if(res.reviewScore!==undefined && typeof res.reviewPercent==='number'){
            reviewDisplay = res.reviewPercent.toFixed(2)+'%';
        }
        reviewPercentTd.textContent= reviewDisplay;

        const dateTd = document.createElement('td');
        const date = new Date(res.timestamp);
        dateTd.textContent = date.toLocaleString();

        const reviewTd = document.createElement('td');
        const reviewBtn = document.createElement('button');
        reviewBtn.textContent = 'Review';
        reviewBtn.className = 'review-btn';

        if(typeof res.attemptIndex==='number'){
            reviewBtn.addEventListener('click', () => {
                window.location.href = 'solver.html?review=' + res.attemptIndex;
            });
        } else {
            let fallbackIndex=storedResults.indexOf(res);
            reviewBtn.addEventListener('click',()=>{
                if(fallbackIndex>-1){
                    window.location.href='solver.html?review='+fallbackIndex;
                }
            });
        }
        reviewTd.appendChild(reviewBtn);

        const deleteTd = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'X';
        deleteBtn.className = 'delete-btn';
        deleteBtn.addEventListener('click', () => {
            const realIndex = storedResults.indexOf(res);
            if (realIndex > -1) {
                storedResults.splice(realIndex, 1);
                localStorage.setItem('solvrResults', JSON.stringify(storedResults));
                renderResults();
            }
        });
        deleteTd.appendChild(deleteBtn);

        tr.appendChild(subjectTd);
        tr.appendChild(paperTd);
        tr.appendChild(percentTd);
        tr.appendChild(reviewPercentTd);
        tr.appendChild(dateTd);
        tr.appendChild(reviewTd);
        tr.appendChild(deleteTd);
        resultsBody.appendChild(tr);
    });
}

subjectFilter.addEventListener('change', renderResults);

deleteAllBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete all past attempts?')) {
        storedResults = [];
        localStorage.setItem('solvrResults', JSON.stringify(storedResults));
        renderResults();
    }
});

renderResults();
