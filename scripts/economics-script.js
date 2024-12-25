const yearGroup=document.getElementById('year-group');
const monthGroup=document.getElementById('month-group');
const variantGroup=document.getElementById('variant-group');
const startBtn=document.getElementById('start-btn');
const popupOverlay=document.getElementById('popupOverlay');
const closePopupBtn=document.getElementById('closePopupBtn');
let selectedYear=null;
let selectedMonth=null;
let selectedVariant=null;
yearGroup.querySelectorAll('.option-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
        if(btn.classList.contains('disabled'))return;
        selectedYear=btn.dataset.year;
        yearGroup.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
        enableMonths();
    });
});
monthGroup.querySelectorAll('.option-btn').forEach(btn=>{
    btn.disabled=true;
    btn.addEventListener('click',()=>{
        if(btn.disabled)return;
        selectedMonth=btn.dataset.month;
        monthGroup.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
        enableVariants(btn.dataset.name);
    });
});
variantGroup.querySelectorAll('.option-btn').forEach(btn=>{
    btn.disabled=true;
    btn.addEventListener('click',()=>{
        if(btn.disabled)return;
        selectedVariant=btn.dataset.variant;
        variantGroup.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
    });
});
function enableMonths() {
    monthGroup.querySelectorAll('.option-btn').forEach(b=>{
        b.classList.remove('selected','disabled');
        b.disabled=false;
    });
    if(selectedYear==='2024'){
        monthGroup.querySelectorAll('.option-btn').forEach(b=>{
            if(b.dataset.name==='Oct/Nov'){
                b.disabled=true;
                b.classList.add('disabled');
            }
        });
    }
    variantGroup.querySelectorAll('.option-btn').forEach(b=>{
        b.disabled=true;
        b.classList.remove('selected','disabled');
    });
    selectedMonth=null;
    selectedVariant=null;
}
function enableVariants(monthName) {
    variantGroup.querySelectorAll('.option-btn').forEach(b=>{
        b.disabled=false;
        b.classList.remove('selected','disabled');
    });
    if(monthName==='Feb/March'){
        variantGroup.querySelectorAll('.option-btn').forEach(b=>{
            if(b.dataset.variant!=='2'){
                b.disabled=true;
                b.classList.add('disabled');
            }
        });
    }
    selectedVariant=null;
}
startBtn.addEventListener('click',()=>{
    if(!selectedYear||!selectedMonth||!selectedVariant){
        popupOverlay.style.display='flex';
        return;
    }
    const yearStr=(parseInt(selectedYear)%100).toString().padStart(2,'0');
    const qpCode=`0455_${selectedMonth}${yearStr}_qp_1${selectedVariant}`;
    const msCode=`0455_${selectedMonth}${yearStr}_ms_1${selectedVariant}`;
    localStorage.setItem('paperCode',qpCode);
    localStorage.setItem('msCode',msCode);
    localStorage.setItem('subject','Economics');
    window.location.href='solver.html';
});
closePopupBtn.addEventListener('click',()=>{
    popupOverlay.style.display='none';
});
