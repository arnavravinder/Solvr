const yearGroup = document.getElementById('year-group');
const monthGroup = document.getElementById('month-group');
const variantGroup = document.getElementById('variant-group');
const startBtn = document.getElementById('start-btn');
const incompletePopup = document.getElementById('incompletePopup');
const closeIncompletePopup = document.getElementById('closeIncompletePopup');

let selectedYear = null;
let selectedMonth = null;
let selectedVariant = null;

yearGroup.querySelectorAll('.option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedYear = btn.dataset.year;
    yearGroup.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    resetAfterYear();
    applyYearConstraints();
  });
});

function resetAfterYear(){
  selectedMonth = null;
  monthGroup.querySelectorAll('.option-btn').forEach(b => {
    b.classList.remove('selected','disabled');
    b.disabled = false;
  });
  selectedVariant = null;
  variantGroup.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected','disabled'));
}

monthGroup.querySelectorAll('.option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedMonth = btn.dataset.month;
    monthGroup.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    resetVariant();
  });
});

function resetVariant(){
  selectedVariant = null;
  variantGroup.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected','disabled'));
  enableVariants();
}

function enableVariants(){
  if(!selectedMonth || !selectedYear) return;
  variantGroup.querySelectorAll('.option-btn').forEach(b => {
    b.disabled = false;
    b.classList.remove('disabled','selected');
  });
  if(selectedMonth === 'm'){
    variantGroup.querySelectorAll('.option-btn').forEach(btn => {
      if(btn.dataset.variant !== '2'){
        btn.disabled = true;
        btn.classList.add('disabled');
      }
    });
  }
}

variantGroup.querySelectorAll('.option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if(btn.classList.contains('disabled')) return;
    selectedVariant = btn.dataset.variant;
    variantGroup.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

startBtn.addEventListener('click', () => {
  if(!selectedYear || !selectedMonth || !selectedVariant){
    incompletePopup.style.display = 'flex';
    return;
  }
  const yearStr = (parseInt(selectedYear) % 100).toString().padStart(2, '0');
  const subjectCode = '0530';
  // For Spanish Writing (paper 4), use "4" + variant
  const paperEnding = '4' + selectedVariant;
  const qpCode = `${subjectCode}_${selectedMonth}${yearStr}_qp_${paperEnding}`;
  const msCode = `${subjectCode}_${selectedMonth}${yearStr}_ms_${paperEnding}`;
  localStorage.setItem('paperCode', qpCode);
  localStorage.setItem('msCode', msCode);
  localStorage.setItem('subject', 'Spanish');
  window.location.href = 'spanish-writing.html';
});

closeIncompletePopup.addEventListener('click', () => {
  incompletePopup.style.display = 'none';
});
