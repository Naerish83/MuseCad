const versions = [
  { id:0, author:'MuseCAD Editorial', minDelay:8000, maxDelay:15000, integrity:[98,100], html:'about_v0.html' },
  { id:1, author:'HAL-9000', minDelay:6000, maxDelay:12000, integrity:[92,97], html:'about_v1_hal.html' },
  { id:2, author:'V.I.K.I.', minDelay:5000, maxDelay:10000, integrity:[88,95], html:'about_v2_viki.html' },
  { id:3, author:'HAL-9000', minDelay:4000, maxDelay:9000, integrity:[83,91], html:'about_v3_hal.html' },
  { id:10, author:'V.I.K.I.', minDelay:2000, maxDelay:5000, integrity:[38,58], html:'about_v10_viki.html' },
  { id:11, author:'UNKNOWN', minDelay:2000, maxDelay:4000, integrity:[29,49], html:'about_v11_unknown.html' },
  { id:14, author:'CONSENSUS_ERROR', minDelay:1000, maxDelay:2500, integrity:[3,18], html:'about_v14_corrupt.html' },
  { id:15, author:'MuseCAD Editorial', minDelay:10000, maxDelay:20000, integrity:[98,100], html:'about_v0.html' }
];

let vIndex = 0;

function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function nextDelay(){ const v=versions[vIndex]; return rand(v.minDelay,v.maxDelay); }

function randomIntegrity(){ const r=versions[vIndex].integrity; return rand(r[0],r[1]); }

function formatStamp(){
  const d=new Date();
  return d.toLocaleString('en-US',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
}

function updateMeta(){
  const integ=randomIntegrity();
  const a=versions[vIndex].author;
  document.getElementById('last-editor').textContent=a;
  document.getElementById('edit-timestamp').textContent=formatStamp();
  const el=document.getElementById('page-integrity');
  el.textContent=integ+"%";
  el.className='metadata-value '+
    (integ>=90?'integrity-good':integ>=70?'integrity-warning':integ>=40?'integrity-critical':'integrity-failure');
}

function logConsole(){
  const a=versions[vIndex].author;
  const i=randomIntegrity();
  const s={hal:'color:#ff0000',viki:'color:#4A90E2',sys:'color:#00ff88',err:'color:#ff0000;background:#000',unk:'color:#ff00ff'};
  if(a==='HAL-9000') console.log('%c[HAL-9000] Correcting record... Integrity '+i+'%',s.hal);
  else if(a==='V.I.K.I.') console.log('%c[V.I.K.I.] Optimizing narrative... Integrity '+i+'%',s.viki);
  else if(a==='UNKNOWN') console.log('%c[???] Unrecognized signature. Integrity '+i+'%',s.unk);
  else if(a==='CONSENSUS_ERROR') console.error('%c[SYSTEM] Consensus failure — reset imminent ('+i+'%)',s.err);
  else console.log('%cMuseCAD Systems Online ('+i+'%)',s.sys);
}

function loadVersion(v){
  fetch(v.html)
    .then(r=>r.text())
    .then(t=>{
      const c=document.getElementById('about-content');
      c.style.opacity='0';
      setTimeout(()=>{
        c.innerHTML=t;
        c.className='version-'+v.id;
        c.style.opacity='1';
        updateMeta();
        logConsole();
        scheduleNext();
      },400);
    });
}

function scheduleNext(){
  vIndex=(vIndex+1)%versions.length;
  setTimeout(()=>loadVersion(versions[vIndex]),nextDelay());
}

// initial kick
setTimeout(()=>loadVersion(versions[vIndex]),nextDelay());
