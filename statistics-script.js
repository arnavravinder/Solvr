const resultsBody=document.getElementById('resultsBody');
let storedResults=JSON.parse(localStorage.getItem('solvrResults'))||[];
storedResults.forEach((res,index)=>{
    const tr=document.createElement('tr');
    const subjectTd=document.createElement('td');
    subjectTd.textContent=res.subject;
    const paperTd=document.createElement('td');
    paperTd.textContent=res.paperCode;
    const percentTd=document.createElement('td');
    percentTd.textContent=res.percent+'%';
    const dateTd=document.createElement('td');
    const date=new Date(res.timestamp);
    dateTd.textContent=date.toLocaleString();
    const reviewTd=document.createElement('td');
    const reviewBtn=document.createElement('button');
    reviewBtn.className='review-btn';
    reviewBtn.textContent='Review';
    reviewBtn.addEventListener('click',()=>{
        window.location.href='solver.html?review='+index;
    });
    reviewTd.appendChild(reviewBtn);
    tr.appendChild(subjectTd);
    tr.appendChild(paperTd);
    tr.appendChild(percentTd);
    tr.appendChild(dateTd);
    tr.appendChild(reviewTd);
    resultsBody.appendChild(tr);
});
