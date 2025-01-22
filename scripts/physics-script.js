const yearGroup=document.getElementById('year-group');
const monthGroup=document.getElementById('month-group');
const levelGroup=document.getElementById('level-group');
const variantGroup=document.getElementById('variant-group');
const startBtn=document.getElementById('start-btn');

let selectedYear=null;
let selectedMonth=null;
let selectedLevel=null;
let selectedVariant=null;

yearGroup.querySelectorAll('.option-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
        if(btn.classList.contains('disabled'))return;
        selectedYear=btn.dataset.year;
        yearGroup.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
        resetSelectionsAfterYear();
        applyYearConstraints();
    });
});

function resetSelectionsAfterYear(){
    selectedMonth=null;
    monthGroup.querySelectorAll('.option-btn').forEach(b=>{
        b.classList.remove('selected','disabled');
        b.disabled=false;
    });
    selectedLevel=null;
    levelGroup.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('selected'));
    selectedVariant=null;
    variantGroup.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('selected','disabled'));
}


monthGroup.querySelectorAll('.option-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
        if(btn.classList.contains('disabled'))return;
        selectedMonth=btn.dataset.month;
        monthGroup.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
        resetLevelVariant();
    });
});

function resetLevelVariant(){
    selectedLevel=null;
    levelGroup.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('selected'));
    selectedVariant=null;
    variantGroup.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('selected','disabled'));
    enableVariants();
}

levelGroup.querySelectorAll('.option-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
        if(btn.classList.contains('disabled'))return;
        selectedLevel=btn.dataset.level;
        levelGroup.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
        enableVariants();
    });
});

function enableVariants(){
    if(!selectedMonth||!selectedLevel)return;

    // For Physics, same rules as Chemistry:
    // Feb/March (m): only variant 2 allowed
    // May/June (s) or Oct/Nov (w): variants 1,2,3 allowed
    variantGroup.querySelectorAll('.option-btn').forEach(b=>{
        b.disabled=false;
        b.classList.remove('disabled','selected');
    });

    if(selectedMonth==='m'){
        variantGroup.querySelectorAll('.option-btn').forEach(btn=>{
            if(btn.dataset.variant!=='2'){
                btn.disabled=true;
                btn.classList.add('disabled');
            }
        });
    }
    selectedVariant=null;
}

variantGroup.querySelectorAll('.option-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
        if(btn.classList.contains('disabled'))return;
        selectedVariant=btn.dataset.variant;
        variantGroup.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
    });
});

startBtn.addEventListener('click',()=>{
    if(!selectedYear||!selectedMonth||!selectedLevel||!selectedVariant){
        alert("Please complete all selections before starting.");
        return;
    }
    const yearStr=(parseInt(selectedYear)%100).toString().padStart(2,'0');
    const subjectCode='0625';

    let levelDigit=(selectedLevel==='Core')?'1':'2';
    let paperEnding=levelDigit+selectedVariant; // e.g. "12", "22"

    const qpCode=`${subjectCode}_${selectedMonth}${yearStr}_qp_${paperEnding}`;
    const msCode=`${subjectCode}_${selectedMonth}${yearStr}_ms_${paperEnding}`;

    localStorage.setItem('paperCode',qpCode);
    localStorage.setItem('msCode',msCode);
    localStorage.setItem('subject','Physics');
    window.location.href='solver.html';
});
