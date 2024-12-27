document.addEventListener('DOMContentLoaded',()=>{
    const qpFile=document.getElementById('qpFile')
    const msFile=document.getElementById('msFile')
    const setTime=document.getElementById('setTime')
    const startBtn=document.getElementById('startBtn')
    const solveArea=document.getElementById('solveArea')
    const qpViewer=document.getElementById('qpViewer')
    const timeLeft=document.getElementById('timeLeft')
    const pauseBtn=document.getElementById('pauseBtn')
    const questionsSection=document.getElementById('questionsSection')
    const submitBtn=document.getElementById('submitBtn')
    let paused=false
    let totalTime=0
    let timer=null
    let correctAnswers=[]
    let userAnswers=[]
    let audioEl=null
  
    startBtn.addEventListener('click',async()=>{
      const f1=qpFile.files[0]
      const f2=msFile.files[0]
      if(!f1||!f2){alert("Upload QP & MS");return}
      let mins=parseInt(setTime.value)||45
      totalTime=mins*60
      try{
        let fd=new FormData()
        fd.append("qp",f1)
        fd.append("ms",f2)
        let r=await fetch("http://127.0.0.1:5000/uploadPapers",{method:"POST",body:fd})
        if(!r.ok){alert("Parsing error");return}
        let j=await r.json()
        correctAnswers=j.answers||[]
        let n=j.numQuestions||correctAnswers.length
        userAnswers=new Array(n).fill(null)
        qpViewer.src=URL.createObjectURL(f1)
        buildMCQs(n)
        solveArea.style.display='block'
        startTimer()
      }catch(e){console.error(e);alert("Error")}
    })
  
    function buildMCQs(n){
      questionsSection.innerHTML=""
      for(let i=0;i<n;i++){
        let d=document.createElement('div')
        d.style.margin="0.5rem 0"
        let h=`<b>Q${i+1}:</b>`
        h+=`<button class='optBtn' data-q='${i}' data-opt='A'>A</button>`
        h+=`<button class='optBtn' data-q='${i}' data-opt='B'>B</button>`
        h+=`<button class='optBtn' data-q='${i}' data-opt='C'>C</button>`
        h+=`<button class='optBtn' data-q='${i}' data-opt='D'>D</button>`
        d.innerHTML=h
        questionsSection.appendChild(d)
      }
    }
  
    function startTimer(){
      updateTime()
      timer=setInterval(()=>{
        if(paused)return
        if(totalTime<=0){clearInterval(timer);alert("Time's up!");return}
        totalTime--
        updateTime()
      },1000)
    }
    function updateTime(){
      let m=Math.floor(totalTime/60)
      let s=totalTime%60
      timeLeft.textContent=`${m}:${s.toString().padStart(2,'0')}`
    }
  
    pauseBtn.addEventListener('click',()=>{
      paused=!paused
      pauseBtn.textContent=paused?"Resume":"Pause"
    })
  
    questionsSection.addEventListener('click',e=>{
      if(e.target.classList.contains('optBtn')){
        let i=parseInt(e.target.dataset.q)
        let opt=e.target.dataset.opt
        let p=e.target.parentNode
        p.querySelectorAll('.optBtn').forEach(b=>b.style.border="")
        e.target.style.border="2px solid red"
        userAnswers[i]=opt
      }
    })
  
    submitBtn.addEventListener('click',()=>{
      let score=0
      for(let i=0;i<correctAnswers.length;i++){
        if(userAnswers[i]===correctAnswers[i])score++
      }
      let pct=((score/correctAnswers.length)*100).toFixed(2)
      alert(`Score: ${score}/${correctAnswers.length} = ${pct}%`)
    })
  })
  