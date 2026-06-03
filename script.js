// ========= Tabs =========
function showTab(id){
  /*__INTRO_TOGGLE__*/
  try{
    const intro = document.querySelector('.intro-hero');
    if(intro){ intro.style.display = (id === 'tab0') ? '' : 'none'; }
  }catch(e){}

  document.querySelectorAll('.tablink').forEach(b=>{
    const active = b.dataset.tab === id;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('.tabcontent').forEach(s=>{
    s.classList.toggle('shown', s.id === id);
  });
}
document.querySelectorAll('.tablink').forEach(btn=>{
  btn.addEventListener('click', ()=> showTab(btn.dataset.tab));
});
// “Next ▶” buttons
document.querySelectorAll('.next-tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const target = btn.dataset.next;
    if (target) showTab(target);
  });
});

// ========= Theme toggle (persist) =========
(function(){
  function init(){
    const root = document.documentElement;
    const btn = document.getElementById('theme-toggle');
    if(!btn) return;
    function set(mode){
      root.setAttribute('data-theme', mode);
      try{ localStorage.setItem('knn-theme', mode); }catch(e){}
      btn.textContent = (mode === 'dark') ? '🌙 Dark' : '☀️ Light';
    }
    const saved = (()=>{ try{ return localStorage.getItem('knn-theme'); }catch(e){ return null; } })();
    set(saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
    btn.addEventListener('click', ()=>{
      const cur = root.getAttribute('data-theme') || 'dark';
      set(cur === 'dark' ? 'light' : 'dark');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

// ========= Node-map wires (responsive) =========
function centerOf(el){
  const map = document.querySelector('.node-map');
  const mr = map.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return {x: r.left - mr.left + r.width/2, y: r.top - mr.top + r.height/2};
}
function wire(a, b){
  const svg = document.getElementById('wires');
  if(!svg) return;
  const vb = svg.viewBox.baseVal; // 900x545
  const mapRect = document.querySelector('.node-map').getBoundingClientRect();
  const sx = vb.width  / mapRect.width;
  const sy = vb.height / mapRect.height;

  const caPx = centerOf(a), cbPx = centerOf(b);
  const ca = {x: caPx.x * sx, y: caPx.y * sy};
  const cb = {x: cbPx.x * sx, y: cbPx.y * sy};

  const dx = (cb.x - ca.x) * 0.35;
  const path = document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d', `M ${ca.x} ${ca.y} C ${ca.x+dx} ${ca.y}, ${cb.x-dx} ${cb.y}, ${cb.x} ${cb.y}`);
  svg.appendChild(path);
}
function drawAllWires(){
  const svg = document.getElementById('wires');
  if(!svg) return;
  svg.innerHTML = '';
  const byId = (id)=>document.getElementById(id);
  wire(byId('node-dimred'), byId('node-unsupervised'));
  wire(byId('node-clustering'), byId('node-unsupervised'));
  wire(byId('node-unsupervised'), byId('node-ml'));
  wire(byId('node-reinforcement'), byId('node-ml'));
  wire(byId('node-regression'), byId('node-supervised'));
  wire(byId('node-supervised'), byId('node-ml'));
  wire(byId('node-classification'), byId('node-supervised'));
}
drawAllWires();
window.addEventListener('resize', drawAllWires);

// Redraw wires whenever Tab 1 becomes visible
(function(){
  const tab1 = document.getElementById('tab1');
  if(!tab1) return;
  const obs1 = new MutationObserver(()=>{
    if (tab1.classList && tab1.classList.contains('shown')) {
      requestAnimationFrame(drawAllWires);
    }
  });
  obs1.observe(tab1, {attributes:true, attributeFilter:['class']});
})();


// Node click pulses + hint
const hint = document.getElementById('hint');
document.querySelectorAll('.node').forEach(node=>{
  node.addEventListener('click', ()=>{
    node.classList.remove('good','bad');
    void node.offsetWidth;
    if(node.classList.contains('correct')){
      node.classList.add('good');
      if(node.id === 'node-classification' || node.id === 'node-regression'){
        hint.hidden = false;
      }
    }else{
      node.classList.add('bad');
    }
  });
});

// ========= Tiny quiz (KNN vs NN vs KMeans) =========
const yesBtn = document.getElementById('btn-yes');
const noBtn  = document.getElementById('btn-no');
const kmBtn  = document.getElementById('btn-kmeans');
const infoYes = document.getElementById('info-yes');
const infoNo  = document.getElementById('info-no');
const infoKm  = document.getElementById('info-kmeans');
if (yesBtn && noBtn && kmBtn && infoYes && infoNo && infoKm){
  const clearQuiz = () => {
    [yesBtn,noBtn,kmBtn].forEach(b=>b.classList.remove('selected-red','selected-green'));
    [infoYes,infoNo,infoKm].forEach(p=>p.hidden = true);
  };
  noBtn.addEventListener('click',  () => { clearQuiz(); noBtn.classList.add('selected-green'); infoNo.hidden = false; });
  yesBtn.addEventListener('click', () => { clearQuiz(); yesBtn.classList.add('selected-red'); infoYes.hidden = false; });
  kmBtn.addEventListener('click',  () => { clearQuiz(); kmBtn.classList.add('selected-red'); infoKm.hidden = false; });
}

// ========= Tab 1B: Classification vs Regression widget =========
(function(){
  const canvas = document.getElementById('cr-canvas'); if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const modeSel = document.getElementById('cr-mode');
  const kSlider = document.getElementById('cr-k');
  if (kSlider) kSlider.max = 7;
  const kOut = document.getElementById('cr-k-out');
  const out1 = document.getElementById('cr-out1');
  const out2 = document.getElementById('cr-out2');

  const W=canvas.width, H=canvas.height;

  const data = [
    {x: 90, y: 70,  label:'A', v: 22},
    {x: 120,y: 90,  label:'A', v: 28},
    {x: 160,y: 60,  label:'A', v: 35},
    {x: 330,y: 200, label:'B', v: 78},
    {x: 360,y: 220, label:'B', v: 82},
    {x: 400,y: 190, label:'B', v: 75},
    {x: 240,y: 120, label:'A', v: 40},
    {x: 260,y: 150, label:'B', v: 60}
  ];
  let probe = {x: 230, y: 150};

  function drawBG(){
    ctx.save();
    const light = document.documentElement.getAttribute('data-theme')==='light';
    ctx.fillStyle = light ? '#ffffff' : '#0a0f22';
    ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = light ? '#ecf2ff' : '#12172a';
    ctx.lineWidth = 1;
    for(let x=0; x<W; x+=24){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=0; y<H; y+=24){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    ctx.restore();
  }
  const dist=(a,b)=>Math.hypot(a.x-b.x, a.y-b.y);
  function predict(k, mode){
    const neigh = data.map((p,i)=>({i, d:dist(probe,p), label:p.label, v:p.v}))
                     .sort((a,b)=>a.d-b.d).slice(0,k);
    if(mode==='reg'){
      const avg = neigh.reduce((s,n)=>s+data[n.i].v,0)/neigh.length;
      return {neigh, kind:'reg', avg};
    }else{
      let A=0,B=0; neigh.forEach(n=> (data[n.i].label==='A'?A++:B++));
      const label = (A===B) ? data[neigh[0].i].label : (A>B ? 'A':'B');
      return {neigh, kind:'clf', A, B, label};
    }
  }
  function draw(){
    drawBG();

    const k = parseInt(kSlider.value,10);
    const mode = modeSel.value;
    const res = predict(k, mode);

    ctx.save(); ctx.globalAlpha=0.65; ctx.lineWidth=2;
    res.neigh.forEach(n=>{
      const p=data[n.i];
      ctx.beginPath(); ctx.moveTo(probe.x,probe.y); ctx.lineTo(p.x,p.y);
      ctx.strokeStyle = (p.label==='A')?'#4f8cff':'#ff4d6d'; ctx.stroke();
    });
    ctx.restore();

    data.forEach(p=>{
      ctx.beginPath(); ctx.arc(p.x,p.y,6,0,Math.PI*2);
      ctx.fillStyle = (p.label==='A') ? '#4f8cff' : '#ff4d6d';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6; ctx.fill();
      ctx.shadowBlur=0; ctx.lineWidth=2; ctx.strokeStyle = '#0a0f22'; ctx.stroke();

      if(mode==='reg'){
        ctx.save(); ctx.font='11px system-ui, Segoe UI, Roboto';
        ctx.fillStyle = document.documentElement.getAttribute('data-theme')==='light' ? '#0b1220' : '#e6f0ff';
        ctx.fillText(String(p.v), p.x+8, p.y-8);
        ctx.restore();
      }
    });

    ctx.beginPath(); ctx.arc(probe.x,probe.y,7,0,Math.PI*2);
    ctx.fillStyle='#0be370'; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#0a0f22'; ctx.stroke();

    if(res.kind==='clf'){
      out1.innerHTML = `<span class="pill pill-a">A</span> <strong>${res.A}</strong> vs <span class="pill pill-b">B</span> <strong>${res.B}</strong>`;
      out2.textContent = `Prediction: ${res.label}`;
    }else{
      out1.textContent = `k = ${k} neighbors`;
      out2.textContent = `Prediction (average): ${res.avg.toFixed(2)}`;
    }
  }
  function toCanvas(evt){ const r=canvas.getBoundingClientRect(); return {x:(evt.clientX-r.left)*(canvas.width/r.width), y:(evt.clientY-r.top)*(canvas.height/r.height)}; }
  canvas.addEventListener('mousedown',(e)=>{ const p=toCanvas(e); const d=Math.hypot(p.x-probe.x,p.y-probe.y); if(d<=12){ probe=p; draw(); }});
  canvas.addEventListener('mousemove',(e)=>{ if(e.buttons!==1) return; probe=toCanvas(e); draw(); });

  kSlider.addEventListener('input', ()=>{ kOut.textContent=kSlider.value; draw(); });
  modeSel.addEventListener('change', draw);

  const obs = new MutationObserver(()=> draw()); obs.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  const tab = document.getElementById('tab1b'); const obs2=new MutationObserver(()=>{ if(tab.classList.contains('shown')) requestAnimationFrame(draw); }); obs2.observe(tab,{attributes:true});

  kOut.textContent = kSlider.value;
  draw();
})();

// ========= Big Quiz (Tab 4) =========
(function(){
  if (window.__quizBoundDelegated) return;
  window.__quizBoundDelegated = true;

  const quizEl = document.getElementById('quiz');
  if (!quizEl) return;

  const submitBtn = document.getElementById('submit-quiz');
  const retryBtn  = document.getElementById('retry-quiz');
  const revealBtn = document.getElementById('reveal-answers');
  const summary   = document.getElementById('quiz-summary');

  quizEl.querySelectorAll('.option').forEach(opt=>{
    opt.style.pointerEvents=''; opt.setAttribute('tabindex','0');
    opt.setAttribute('role','radio'); opt.setAttribute('aria-checked','false');
  });

  quizEl.addEventListener('click', (e) => {
    const li = e.target.closest('.option'); if (!li) return;
    const q = li.closest('.question'); if (!q || q.classList.contains('graded')) return;
    q.querySelectorAll('.option').forEach(o=>{ o.classList.remove('selected'); o.setAttribute('aria-checked','false'); });
    li.classList.add('selected'); li.setAttribute('aria-checked','true');
  });
  quizEl.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const li = ev.target.closest && ev.target.closest('.option'); if (!li) return;
    const q = li.closest('.question'); if (!q || q.classList.contains('graded')) return;
    ev.preventDefault();
    q.querySelectorAll('.option').forEach(o=>{ o.classList.remove('selected'); o.setAttribute('aria-checked','false'); });
    li.classList.add('selected'); li.setAttribute('aria-checked','true');
  });

  const hints = {
    "1": "k=1 essentially memorizes data → low bias but highly sensitive to small perturbations.",
    "2": "If one feature has a larger scale, it dominates distance; normalize/standardize features.",
    "3": "In plain KNN classification each of the k neighbors contributes one vote.",
    "4": "Larger k smooths the decision boundary (lower variance).",
    "5": "scikit-learn supports several metrics; default is Euclidean for k-NN."
  };

  function grade(){
    let total=0, correct=0;
    quizEl.querySelectorAll('.question').forEach(q=>{
      total += 1; q.classList.add('graded');
      const sel = q.querySelector('.option.selected');
      const ans = Array.from(q.querySelectorAll('.option')).find(o=>o.dataset.correct==='true');

      if (sel && ans && sel === ans){
        correct += 1;
        sel.classList.add('correct');
      }else if (sel){
        sel.classList.add('incorrect');
      }

      q.querySelectorAll('.option').forEach(o=>o.style.pointerEvents='none');

      const qid = q.getAttribute('data-q'); const t = hints[qid];
      if (t){
        const p = document.createElement('p'); p.className='inline-hint'; p.textContent = t; q.appendChild(p);
      }
    });
    summary.textContent = `You got ${correct} out of ${total} correct.`;
    submitBtn.style.display='none'; retryBtn.style.display='inline-block'; revealBtn && (revealBtn.style.display='inline-block');
  }
  function reveal(){ quizEl.querySelectorAll('.question').forEach(q=>{ const ans=q.querySelector('.option[data-correct="true"]'); ans && ans.classList.add('correct'); }); }
  function reset(){
    summary.textContent='';
    quizEl.querySelectorAll('.question').forEach(q=>{
      q.classList.remove('graded');
      q.querySelectorAll('.option').forEach(o=>{
        o.classList.remove('selected','correct','incorrect');
        o.style.pointerEvents='';
        o.setAttribute('aria-checked','false');
      });
      q.querySelectorAll('.inline-hint').forEach(h=>h.remove());
    });
    submitBtn.style.display='inline-block'; retryBtn.style.display='none'; revealBtn && (revealBtn.style.display='none');
  }
  submitBtn && submitBtn.addEventListener('click', grade);
  revealBtn && revealBtn.addEventListener('click', reveal);
  retryBtn && retryBtn.addEventListener('click', reset);
})();

// ========= Tab 2 – Distance Explorer =========
(function(){
  const canvas = document.getElementById('dist-explorer'); if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const outL2 = document.getElementById('de-l2');
  const outL1 = document.getElementById('de-l1');
  const outLI = document.getElementById('de-linf');

  const ref = { x: canvas.width/2, y: canvas.height/2 };
  let q   = { x: ref.x + 80, y: ref.y - 40 };
  let dragging = false;

  function drawGrid(){
    ctx.save();
    const light = document.documentElement.getAttribute('data-theme')==='light';
    ctx.fillStyle = light ? '#ffffff' : '#0a0f22';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = light ? '#ecf2ff' : '#12172a';
    ctx.lineWidth = 1;
    for(let x=0; x<canvas.width; x+=24){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
    for(let y=0; y<canvas.height; y+=24){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
    ctx.restore();
  }

  function draw(){
    drawGrid();
    const dx = q.x - ref.x, dy = q.y - ref.y;
    const d2 = Math.hypot(dx, dy);
    const d1 = Math.abs(dx) + Math.abs(dy);
    const di = Math.max(Math.abs(dx), Math.abs(dy));

    ctx.save(); ctx.lineWidth = 2; ctx.setLineDash([4,3]);
    ctx.strokeStyle = '#4f8cff'; ctx.beginPath(); ctx.arc(ref.x, ref.y, d2, 0, Math.PI*2); ctx.stroke(); // L2
    ctx.strokeStyle = '#94a3b8'; ctx.beginPath(); // L1
    ctx.moveTo(ref.x, ref.y - d1); ctx.lineTo(ref.x + d1, ref.y); ctx.lineTo(ref.x, ref.y + d1); ctx.lineTo(ref.x - d1, ref.y); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = '#ff4d6d'; ctx.strokeRect(ref.x - di, ref.y - di, di*2, di*2); // L∞
    ctx.setLineDash([]); ctx.restore();

    ctx.save(); ctx.globalAlpha = 0.7; ctx.lineWidth = 2; ctx.strokeStyle = '#10b981'; ctx.beginPath(); ctx.moveTo(ref.x, ref.y); ctx.lineTo(q.x, q.y); ctx.stroke(); ctx.restore();
    ctx.beginPath(); ctx.arc(ref.x, ref.y, 6, 0, Math.PI*2); ctx.fillStyle = '#1f2937'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#0a0f22'; ctx.stroke();
    ctx.beginPath(); ctx.arc(q.x, q.y, 7, 0, Math.PI*2); ctx.fillStyle = '#0be370'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#0a0f22'; ctx.stroke();

    outL2.textContent = d2.toFixed(2);
    outL1.textContent = d1.toFixed(2);
    outLI.textContent = di.toFixed(2);
  }

  function hit(pt, x,y,r=10){ const dx=pt.x-x, dy=pt.y-y; return dx*dx+dy*dy <= r*r; }
  canvas.addEventListener('mousedown', (e)=>{ const rect = canvas.getBoundingClientRect(); const p={x:(e.clientX-rect.left)*(canvas.width/rect.width), y:(e.clientY-rect.top)*(canvas.height/rect.height)};
    dragging = hit(p, q.x, q.y, 12); if(dragging){ q=p; draw(); }
  });
  canvas.addEventListener('mousemove', (e)=>{ if(!dragging) return; const rect = canvas.getBoundingClientRect();
    q = {x:(e.clientX-rect.left)*(canvas.width/rect.width), y:(e.clientY-rect.top)*(canvas.height/rect.height)}; draw();
  });
  window.addEventListener('mouseup', ()=> dragging=false);

  const obs = new MutationObserver(()=> draw()); obs.observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
  const tab2 = document.getElementById('tab2'); const obs2 = new MutationObserver(()=>{ if(tab2.classList.contains('shown')) requestAnimationFrame(draw); }); obs2.observe(tab2,{attributes:true});

  draw();
})();

// ========= Tab 2 – Feature Scaling Demo =========
(function(){
  const canvas = document.getElementById('scal-demo'); if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const scalToggle = document.getElementById('scal-toggle');
  const kSlider = document.getElementById('scal-k');
  const kOut = document.getElementById('scal-k-out');
  const outPred = document.getElementById('scal-pred');
  const outA = document.getElementById('scal-a');
  const outB = document.getElementById('scal-b');

  const W = canvas.width, H = canvas.height;

  const A = [{x:90,y:80},{x:110,y:90},{x:130,y:70},{x:140,y:95}];
  const B = [{x:330,y:190},{x:360,y:210},{x:390,y:180},{x:410,y:220}];
  const pts = [...A.map(p=>({...p,label:'A'})), ...B.map(p=>({...p,label:'B'}))];

  let probe = {x:240,y:150};

  function drawBg(){
    ctx.save();
    const light = document.documentElement.getAttribute('data-theme')==='light';
    ctx.fillStyle = light ? '#ffffff' : '#0a0f22';
    ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = light ? '#ecf2ff' : '#12172a';
    ctx.lineWidth = 1;
    for(let x=0; x<W; x+=24){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=0; y<H; y+=24){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    ctx.restore();
  }

  function zscore(points){
    const xs = points.map(p=>p.x), ys = points.map(p=>p.y);
    const mean = (arr)=>arr.reduce((a,b)=>a+b,0)/arr.length;
    const std = (arr)=>{ const m=mean(arr); const v=arr.reduce((s,b)=>s+(b-m)*(b-m),0)/arr.length; return v>0?Math.sqrt(v):1; };
    const mx=mean(xs), my=mean(ys), sx=std(xs), sy=std(ys);
    return {mx,my,sx,sy, fn:(p)=>({x:(p.x-mx)/sx, y:(p.y-my)/sy})};
  }
  function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
  function predict(k, standardize){
    let data = pts, q = probe;
    if(standardize){ const {fn} = zscore(pts); data = pts.map(p=>({...fn(p), label:p.label})); q = fn(probe); }
    const neigh = data.map((p,i)=>({i, d:dist(q,p), label:p.label})).sort((a,b)=>a.d-b.d).slice(0,k);
    let Acount=0, Bcount=0; neigh.forEach(n=>{ if(n.label==='A') Acount++; else Bcount++; });
    const label = (Acount===Bcount) ? neigh[0].label : (Acount>Bcount?'A':'B');
    return {label, Acount, Bcount, neigh};
  }

  function draw(){
    drawBg();
    for(const p of pts){
      ctx.beginPath(); ctx.arc(p.x,p.y,6,0,Math.PI*2);
      ctx.fillStyle = (p.label==='A') ? '#4f8cff' : '#ff4d6d';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6; ctx.fill();
      ctx.shadowBlur=0; ctx.lineWidth=1.8; ctx.strokeStyle = '#0a0f22'; ctx.stroke();
    }

    const k = parseInt(kSlider.value,10);
    const res = predict(k, scalToggle.checked);

    ctx.save(); ctx.globalAlpha = 0.6; ctx.lineWidth=2;
    for(const n of res.neigh){ const p = pts[n.i]; ctx.beginPath(); ctx.moveTo(probe.x, probe.y); ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = (p.label==='A') ? '#4f8cff' : '#ff4d6d'; ctx.stroke(); }
    ctx.restore();

    ctx.beginPath(); ctx.arc(probe.x, probe.y, 7, 0, Math.PI*2);
    ctx.fillStyle = '#0be370'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#0a0f22'; ctx.stroke();

    outPred.textContent = res.label; outA.textContent = res.Acount; outB.textContent = res.Bcount;
  }

  function toCanvas(evt){ const r=canvas.getBoundingClientRect(); return {x:(evt.clientX-r.left)*(canvas.width/r.width), y:(evt.clientY-r.top)*(canvas.height/r.height)}; }
  canvas.addEventListener('mousedown',(e)=>{ probe=toCanvas(e); draw(); });
  canvas.addEventListener('mousemove',(e)=>{ if(e.buttons!==1) return; probe=toCanvas(e); draw(); });

  kSlider.addEventListener('input', ()=>{ kOut.textContent = kSlider.value; draw(); });
  scalToggle.addEventListener('change', draw);

  const obs = new MutationObserver(()=> draw()); obs.observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
  const tab2 = document.getElementById('tab2'); const obs2 = new MutationObserver(()=>{ if(tab2.classList.contains('shown')) requestAnimationFrame(draw); }); obs2.observe(tab2,{attributes:true});

  kOut.textContent = kSlider.value; draw();
})();

// ========= Tab 3 – Full Interactive Playground + graphics =========
(function(){
  const canvas = document.getElementById('knn-canvas');
  if(!canvas) return;

  const ctx = canvas.getContext('2d');
  const kSlider = document.getElementById('knn-k');
  const kOut = document.getElementById('knn-k-out');
  const metricSel = document.getElementById('knn-metric');
  const metricIcon = document.getElementById('metric-icon');
  const readout = document.getElementById('knn-readout');
  const statusPill = document.getElementById('knn-status');

  const showMapChk = document.getElementById('knn-show-map');
  const renderMapBtn = document.getElementById('knn-render-map');
  const noiseSlider = document.getElementById('knn-noise');
  const noiseOut = document.getElementById('knn-noise-out');
  const resampleBtn = document.getElementById('knn-resample');

  const randSlider = document.getElementById('knn-randN');
  const randOut = document.getElementById('knn-randN-out');
  const randBtn = document.getElementById('knn-add-rand');

  const chipA = document.getElementById('knn-label-a');
  const chipB = document.getElementById('knn-label-b');
  const chipAdd = document.getElementById('knn-mode-add');
  const chipProbe = document.getElementById('knn-mode-probe');

  const undoBtn = document.getElementById('knn-undo');
  const clearBtn = document.getElementById('knn-clear');

  const voteAEl = document.getElementById('voteA');
  const voteBEl = document.getElementById('voteB');
  const barA = document.querySelector('.vote-bar .barA');
  const barB = document.querySelector('.vote-bar .barB');
  const neighList = document.getElementById('knn-neighbors');

  // Create main vote-beads strip dynamically (beside vote bar)
  let voteBeads = document.querySelector('.vote-beads');
  if(!voteBeads){
    const vb = document.createElement('div'); vb.className = 'vote-beads';
    document.querySelector('.vote-bar').after(vb); voteBeads = vb;
  }

  // Highlight active metric badge in the theory card
  const metricBadges = document.querySelectorAll('.metric-badge');
  function updateMetricBadges(){
    metricBadges.forEach(b => b.classList.toggle('active', b.dataset.metric === metricSel.value));
  }
  metricSel.addEventListener('change', updateMetricBadges);
  updateMetricBadges();

  let currentLabel = 'A';
  let mode = 'add';

  function updateStatus(){ statusPill.textContent = `Mode: ${mode === 'add' ? 'Add training' : 'Probe / predict'} • Label: ${currentLabel}`; }
  function setActive(chip, others){ chip.classList.add('active'); chip.setAttribute('aria-pressed','true'); others.forEach(o=>{ o.classList.remove('active'); o.setAttribute('aria-pressed','false'); }); }
  document.getElementById('knn-label-a').addEventListener('click', ()=>{ currentLabel='A'; setActive(chipA, [chipB]); updateStatus(); });
  document.getElementById('knn-label-b').addEventListener('click', ()=>{ currentLabel='B'; setActive(chipB, [chipA]); updateStatus(); });
  document.getElementById('knn-mode-add').addEventListener('click', ()=>{ mode='add'; setActive(chipAdd,[chipProbe]); updateStatus(); readout.textContent='Add training points by left-clicking (right-click = Class B).'; });
  document.getElementById('knn-mode-probe').addEventListener('click', ()=>{ mode='probe'; setActive(chipProbe,[chipAdd]); updateStatus(); readout.textContent='Click to place a test point and see the KNN prediction.'; });

  document.getElementById('knn-k').addEventListener('input', ()=>{ kOut.textContent = kSlider.value; scheduleMapRender(); draw(); });
  document.getElementById('knn-metric').addEventListener('change', ()=>{ scheduleMapRender(); draw(); drawUnitBall(metricSel.value); updateMetricBadges(); });

  const points = []; let probe = null;

  let mapCanvas = null, mapCtx = null, mapValid = false, debounceId = null;
  const TILE = 4;

  function toCanvasCoords(evt){
    const r = canvas.getBoundingClientRect();
    return { x: (evt.clientX - r.left) * (canvas.width / r.width),
             y: (evt.clientY - r.top)  * (canvas.height / r.height) };
  }
  function dist(a,b, metric){ const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
    switch(metric){ case 'l1': return dx + dy; case 'linf': return Math.max(dx, dy); default: return Math.hypot(dx, dy); } }

  function knnNeighbors(query){
    if(points.length === 0) return null;
    const k = Math.min(points.length, parseInt(kSlider.value,10));
    const metric = metricSel.value;
    return points.map(p => ({...p, d: dist(query, p, metric)})).sort((a,b)=>a.d-b.d).slice(0,k);
  }
  function knnPredict(query){
    const neigh = knnNeighbors(query); if(!neigh) return null;
    let countA = 0, countB = 0; for(const p of neigh){ if(p.label==='A') countA++; else countB++; }
    const label = (countA === countB) ? (neigh[0]?.label ?? 'A') : (countA > countB ? 'A' : 'B');
    return { label, neighbors: neigh, countA, countB };
  }

  function drawGrid(){
    const c = ctx; c.save(); c.lineWidth = 1; c.globalAlpha = 0.35; c.beginPath();
    c.moveTo(0, canvas.height/2); c.lineTo(canvas.width, canvas.height/2);
    c.moveTo(canvas.width/2, 0);  c.lineTo(canvas.width/2, canvas.height);
    c.strokeStyle = '#8aa1c6'; c.stroke(); c.restore();
  }
  function drawMetricRing(metric, x, y, r, color, lineWidth){
    const c = ctx; c.save(); c.strokeStyle = color; c.lineWidth = lineWidth; c.lineJoin = 'round'; c.beginPath();
    if(metric === 'l1'){ c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.closePath(); c.stroke();
    }else if(metric === 'linf'){ c.strokeRect(x - r, y - r, r*2, r*2);
    }else{ c.arc(x, y, r, 0, Math.PI*2); c.stroke(); } c.restore();
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(showMapChk.checked && mapCanvas && mapValid){ ctx.drawImage(mapCanvas, 0, 0, canvas.width, canvas.height); }
    drawGrid();

    // training points
    for(const p of points){
      ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI*2);
      ctx.fillStyle = (p.label==='A') ? '#4f8cff' : '#ff4d6d';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6; ctx.fill();
      ctx.shadowBlur = 0; ctx.lineWidth = 2; ctx.strokeStyle = '#0a0f22'; ctx.stroke();
    }

    // live info panes (votes + neighbors)
    const voteMini = document.getElementById('vote-mini');

    if(probe){
      const res = knnPredict(probe);
      if(res){
        // neighbor lines on canvas
        ctx.save(); ctx.globalAlpha = 0.6;
        for(const n of res.neighbors){ ctx.beginPath(); ctx.moveTo(probe.x, probe.y); ctx.lineTo(n.x, n.y); ctx.lineWidth = 2; ctx.strokeStyle = (n.label==='A') ? '#4f8cff' : '#ff4d6d'; ctx.stroke(); }
        ctx.restore();

        // ring for prediction metric
        const ringColor = (res.label==='A') ? '#4f8cff' : '#ff4d6d';
        drawMetricRing(metricSel.value, probe.x, probe.y, 12, ringColor, 3);

        // Votes text + bars
        const a = res.countA, b = res.countB, total = (a + b) || 1;
        voteAEl.textContent = `A: ${a}`; voteBEl.textContent = `B: ${b}`;
        barA.style.width = `${(a/total)*100}%`; barB.style.width = `${(b/total)*100}%`;

        // Vote beads (main)
        voteBeads.innerHTML = '';
        res.neighbors.forEach(n=>{
          const s = document.createElement('span');
          s.className = 'bead ' + (n.label==='A'?'a':'b');
          voteBeads.appendChild(s);
        });
        // Mirror beads into the theory card mini strip
        if (voteMini) voteMini.innerHTML = voteBeads.innerHTML;

        // Neighbor list with proximity bars + metric glyph
        const maxD = Math.max(...res.neighbors.map(n=>n.d), 1e-6);
        neighList.innerHTML = '';
        res.neighbors.forEach((n,i)=>{
          const li = document.createElement('li');
          li.className = 'neighbor-item ' + (n.label==='A'?'labA':'labB');

          const row = document.createElement('div'); row.className = 'ni-row';
          const left = document.createElement('div'); left.className = 'lab';
          left.innerHTML = `<span class="rank">#${i+1}</span>
                            <span class="lab-dot"></span>
                            <span class="lab-txt">${n.label}</span>`;
          const right = document.createElement('div');
          right.innerHTML = `<span class="metric-glyph">${metricGlyph(metricSel.value)}</span>
                             <span class="d">d=${n.d.toFixed(2)}</span>`;
          row.appendChild(left); row.appendChild(right);

          const bar = document.createElement('div'); bar.className = 'distbar';
          const span = document.createElement('span');
          const pct = Math.max(0, Math.min(1, (1 - n.d / maxD))) * 100; // closer => longer
          span.style.width = `${pct}%`;
          bar.appendChild(span);

          li.appendChild(row); li.appendChild(bar);
          neighList.appendChild(li);
        });

        readout.textContent = `Prediction: ${res.label} · k=${Math.min(points.length, parseInt(kSlider.value,10))} · metric=${metricSel.options[metricSel.selectedIndex].text}`;
      }

      // probe dot
      ctx.beginPath(); ctx.arc(probe.x, probe.y, 6, 0, Math.PI*2); ctx.fillStyle = '#0be370'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#0a0f22'; ctx.stroke();
    }else{
      // reset panels when no probe
      barA.style.width='0%'; barB.style.width='0%';
      voteAEl.textContent = 'A: 0'; voteBEl.textContent = 'B: 0';
      voteBeads.innerHTML = '';
      if (voteMini) voteMini.innerHTML = '';
      neighList.innerHTML = '';
      const li = document.createElement('li'); li.className='muted'; li.textContent='Add a test point in Predict mode and click on the canvas.'; neighList.appendChild(li);
    }
  }

  // Canvas interactions
  canvas.addEventListener('click', (e)=>{
    const pt = toCanvasCoords(e);
    if(mode === 'add'){ points.push({x: pt.x, y: pt.y, label: currentLabel}); invalidateMap(); scheduleMapRender(); }
    else{ probe = pt; }
    draw();
  });
  canvas.addEventListener('contextmenu', (e)=>{
    e.preventDefault(); if(mode !== 'add') return;
    const pt = toCanvasCoords(e); points.push({x: pt.x, y: pt.y, label: 'B'}); readout.textContent = 'Added Class B (right-click).'; invalidateMap(); scheduleMapRender(); draw();
  });
  undoBtn.addEventListener('click', ()=>{ if(mode==='add' && points.length){ points.pop(); invalidateMap(); scheduleMapRender(); } else if(mode==='probe' && probe){ probe=null; } draw(); });
  clearBtn.addEventListener('click', ()=>{ points.length=0; probe=null; invalidateMap(true); draw(); readout.textContent='Cleared. Add some training points!'; });

  function addRandomPoints(n){ for(let i=0;i<n;i++){ const label = Math.random() < 0.5 ? 'A' : 'B'; points.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, label }); } invalidateMap(); scheduleMapRender(); draw(); readout.textContent = `Added ${n} random points (50/50 labels).`; }
  randSlider.addEventListener('input', ()=>{ randOut.textContent = randSlider.value; });
  randBtn.addEventListener('click', ()=> addRandomPoints(parseInt(randSlider.value,10)));

  // Decision map rendering
  function ensureMapCanvas(){ if(!mapCanvas){ mapCanvas = document.createElement('canvas'); mapCanvas.width = canvas.width; mapCanvas.height = canvas.height; mapCtx = mapCanvas.getContext('2d'); } }
  function invalidateMap(clearOnly=false){ mapValid = false; if(clearOnly && mapCtx){ mapCtx.clearRect(0,0,mapCanvas.width,mapCanvas.height); } }
  function renderDecisionMap(){
    if(!showMapChk.checked) return; ensureMapCanvas(); mapCtx.clearRect(0,0,mapCanvas.width,mapCanvas.height);
    if(points.length===0){ mapValid=true; draw(); return; }
    const alpha = 0.23;
    for(let y=0; y<canvas.height; y+=TILE){
      for(let x=0; x<canvas.width; x+=TILE){
        const q = {x:x+TILE/2, y:y+TILE/2};
        const res = knnPredict(q);
        mapCtx.fillStyle = (res && res.label==='B') ? `rgba(255,77,109,${alpha})` : `rgba(79,140,255,${alpha})`;
        mapCtx.fillRect(x, y, TILE, TILE);
      }
    }
    mapValid = true; draw();
  }
  function scheduleMapRender(){ mapValid = false; if(!showMapChk.checked) return; if(debounceId) clearTimeout(debounceId); debounceId = setTimeout(()=>{ renderDecisionMap(); }, 200); }
  renderMapBtn.addEventListener('click', renderDecisionMap);
  showMapChk.addEventListener('change', ()=>{ if(showMapChk.checked){ scheduleMapRender(); } else { draw(); } });

  // Variance demo
  function randn(){ let u=0, v=0; while(u===0) u=Math.random(); while(v===0) v=Math.random(); return Math.sqrt(-2.0*Math.log(u))*Math.cos(2*Math.PI*v); }
  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
  function resampleWithNoise(sigma){
    if(points.length===0){ addRandomPoints(50); return; }
    for(const p of points){ p.x = clamp(p.x + randn()*sigma, 0, canvas.width); p.y = clamp(p.y + randn()*sigma, 0, canvas.height); }
    invalidateMap(); scheduleMapRender(); draw();
  }
  noiseSlider.addEventListener('input', ()=>{ noiseOut.textContent = noiseSlider.value; });
  resampleBtn.addEventListener('click', ()=> resampleWithNoise(parseFloat(noiseSlider.value)));

  // Metric icon
  function drawUnitBall(metric){
    const icon = metricIcon; if(!icon) return; while (icon.firstChild) icon.removeChild(icon.firstChild);
    icon.appendChild(metricNode(metric));
  }
  function metricNode(metric){
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 28 28'); svg.setAttribute('width','28'); svg.setAttribute('height','28');
    svg.setAttribute('fill','none'); svg.setAttribute('stroke','currentColor'); svg.setAttribute('stroke-width','2');
    const g = document.createElementNS(ns,'g'); g.setAttribute('transform','translate(14,14)');
    if(metric === 'l1'){ const p = document.createElementNS(ns,'polygon'); p.setAttribute('points','0,-10 10,0 0,10 -10,0'); g.appendChild(p); }
    else if(metric === 'linf'){ const r = document.createElementNS(ns,'rect'); r.setAttribute('x','-9'); r.setAttribute('y','-9'); r.setAttribute('width','18'); r.setAttribute('height','18'); r.setAttribute('rx','2'); g.appendChild(r); }
    else{ const c = document.createElementNS(ns,'circle'); c.setAttribute('cx','0'); c.setAttribute('cy','0'); c.setAttribute('r','9'); g.appendChild(c); }
    svg.appendChild(g); return svg;
  }
  function metricGlyph(metric){
    if(metric === 'l1') return `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="8,2 14,8 8,14 2,8"/></svg>`;
    if(metric === 'linf') return `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="10" height="10" rx="2"/></svg>`;
    return `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="5"/></svg>`;
  }

  kOut.textContent = kSlider.value; randOut.textContent = randSlider.value; noiseOut.textContent = noiseSlider.value; drawUnitBall(metricSel.value);
  readout.textContent = 'Add training points by left-clicking (right-click = Class B).';
  updateStatus(); draw();

  const tab3 = document.getElementById('tab3'); const obs = new MutationObserver(()=>{ if(tab3.classList.contains('shown')) requestAnimationFrame(draw); }); obs.observe(tab3, {attributes:true});
})();

// Intro CTA
function startLearning(){
  try{ showTab('tab1'); }catch(e){}
  const intro = document.querySelector('.intro-hero'); if(intro){ intro.style.display = 'none'; }
  const main = document.querySelector('main'); if(main){ main.scrollIntoView({behavior:'smooth'}); }
}

// Hide intro on load if a non-intro tab is initially active
(function(){
  try{
    const active = document.querySelector('.tablink.active');
    const intro = document.querySelector('.intro-hero');
    if(intro){ intro.style.display = (active && active.dataset.tab === 'tab0') ? '' : 'none'; }
  }catch(e){}
})();
