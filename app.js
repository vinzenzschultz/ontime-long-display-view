// WebSocket-Verbindung zum Ontime-Server
const ws = new WebSocket((location.protocol==='https:'?'wss:':'ws:') + '//' + location.host + '/ws');

const projectEl      = document.getElementById('projekttitel');
const clockEl        = document.getElementById('clock');
const mainTimerEl    = document.getElementById('timer');
const auxEl          = document.getElementById('aux');
const progBar        = document.querySelector('.timer__progress-bar');
const nowEl          = document.getElementById('now');
const nextEl         = document.getElementById('next');
const timerTypeEl    = document.getElementById('timerType');
const container      = document.querySelector('.container');
const btn            = document.querySelector('.fullscreen-btn');
const uhr            = document.querySelector('.uhr');
const detailView     = document.querySelector('.event-detail-view');
const closeDetailBtn = document.getElementById('closeDetailBtn');
const timerWrapper   = document.querySelector('.timer');
const auxWrapper     = document.querySelector('.aux-timer');

let lastClockMs       = 0;
let eventActive       = false;
let currentEventData  = null;
let nextEventData     = null;

// —– Feld‐Liste nur mit den gewünschten Keys —–
const detailFields = [
  { key: 'timeStart',   label: 'Time Start',   fmt: v => formatClock(v) },
  { key: 'timeEnd',     label: 'Time End',     fmt: v => formatClock(v) },
  { key: 'endAction',   label: 'End Action' },
  { key: 'timerType',   label: 'Timer Type' },
  { key: 'note',        label: 'Note' },
  { key: 'delay',       label: 'Delay' },
  { key: 'cue',         label: 'Cue' },
  { key: 'timeWarning', label: 'Time Warning', fmt: v => formatClock(v) },
  { key: 'timeDanger',  label: 'Time Danger',  fmt: v => formatClock(v) },
];

function refreshDetailView(isNow) {
  const data      = isNow ? currentEventData : nextEventData;
  const otherData = isNow ? nextEventData    : currentEventData;

  // Titel‐Überschrift mit farbigem Event‐Namen
  
  let leftHtml = `
    <h2 class="detail-header">
      Aktuelles Event:
      <span class="event-title" style="background:${currentEventData?.colour||'#444'};">
        ${currentEventData?.title || '--'}
      </span>
    </h2>
  `;
  if (currentEventData) {
    detailFields.forEach(fld => {
      if (currentEventData[fld.key] != null) {
        const raw = currentEventData[fld.key];
        const val = fld.fmt ? fld.fmt(raw) : raw;
        leftHtml += `
          <div class="field">
            <span class="field-label">${fld.label}:</span>
            <span class="field-value">${val}</span>
          </div>`;
      }
    });
  } else {
    leftHtml += `<p>Keine Event-Daten verfügbar.</p>`;
  }
  document.getElementById('eventDetail').innerHTML = leftHtml;

   // rechte Spalte: alle Felder des jeweils anderen Events
   let rightHtml = `
    <h2 class="detail-header">
      Nächstes Event:
      <span class="event-title" style="background:${nextEventData?.colour||'#444'};">
        ${nextEventData?.title || '--'}
      </span>
    </h2>
  `;
  if (nextEventData) {
    detailFields.forEach(fld => {
      if (nextEventData[fld.key] != null) {
        const raw = nextEventData[fld.key];
        const val = fld.fmt ? fld.fmt(raw) : raw;
        rightHtml += `
          <div class="field">
            <span class="field-label">${fld.label}:</span>
            <span class="field-value">${val}</span>
          </div>`;
      }
    });
  } else {
    rightHtml += `<p>Keine weiteren Events.</p>`;
  }
  document.getElementById('eventList').innerHTML = rightHtml;
}

// UI-Listener
btn.addEventListener('click', () => {
  if (container.classList.contains('swapaux')) {
    container.classList.remove('swapaux');
  }
  container.classList.toggle('fullscreen');
});
uhr.addEventListener('click',   () => container.classList.toggle('fullscreenuhr'));
auxEl.addEventListener('click', () => container.classList.toggle('swapaux'));
auxWrapper.addEventListener('click', () => {container.classList.toggle('swapaux');});
timerWrapper.addEventListener('click', () => {
  if (container.classList.contains('swapaux')) {
    container.classList.remove('swapaux');
  }
});


// Event-Detail-Ansicht öffnen
[nowEl, nextEl].forEach(el =>
  el.addEventListener('click', () => {
    const isNow = (el === nowEl);
    refreshDetailView(isNow);
    container.classList.add('fullevent');
  })
);

// Close-Button in der Detail-Ansicht
closeDetailBtn.addEventListener('click', () => {
  container.classList.remove('fullevent');
});


fetch('/data/project')
  .then(r=>r.json())
  .then(d=>{
    const pr=d.payload||d;
    projectEl.textContent=pr.title||pr.name||'--';
  })
  .catch(()=>{});

function leftPad(n) {
  return String(n).padStart(2,'0');
}

// Formatierung eines Timers in Millisekunden
function formatTime(ms){
  const sign = ms < 0 ? '-' : '';
  const sec = Math.abs(Math.floor(ms/1000));
  const h = Math.floor(sec/3600),
        m = Math.floor(sec/60) % 60,
        s = sec % 60;
  return sign + (h > 0
    ? `${leftPad(h)}:${leftPad(m)}:${leftPad(s)}`
    : `${leftPad(m)}:${leftPad(s)}`);
}

// Formatierung einer Uhrzeit (ms seit Mitternacht)
function formatClock(ms) {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${leftPad(h)}:${leftPad(m)}:${leftPad(s)}`;
}

ws.addEventListener('open',()=>ws.send(JSON.stringify({type:'poll'})));
ws.addEventListener('message',({data})=>{
const msg = JSON.parse(data), p = msg.payload || msg;
  switch(msg.type){
    case 'ontime-clock':
      lastClockMs = typeof p === 'object' && p.current !== undefined ? p.current : p;
      clockEl.textContent = formatClock(lastClockMs);
      if(!eventActive){
        mainTimerEl.textContent = formatClock(lastClockMs);
      }
      break;
      case 'ontime-eventNow':
        nowEl.textContent    = p.title || p.name || '--';
        eventActive = !!(p.title || p.name);
        currentEventData     = p;
        if (container.classList.contains('fullevent')) {
          refreshDetailView(true);
        }
        if (!eventActive) {
          mainTimerEl.textContent = formatClock(lastClockMs);
          progBar.style.width     = '0';
          mainTimerEl.classList.remove('warning','overtime');
        }
      
        if (container.classList.contains('fullevent')) {
          refreshDetailView(true);
        }
        break;
      
      case 'ontime-eventNext':
        nextEl.textContent   = p.title || p.name || '--';
        nextEventData        = p;
        if (container.classList.contains('fullevent')) {
          refreshDetailView(false);
        }
        break;
      
      
      break;
    case 'ontime-auxtimer1':
      auxEl.textContent = formatTime(p.current);
      break;
      case 'ontime-timer': {
        const { current, duration, elapsed, clock } = p;
        // Timer-Type aus Event-Daten
        const displayType = (currentEventData?.timerType || 'none').toLowerCase();
        timerTypeEl.textContent = displayType;
      
        // 1) Kein Event aktiv → Uhrmodus
        if (!eventActive) {
          const ms = clock != null ? clock : current;
          mainTimerEl.textContent = formatClock(ms);
          progBar.style.width     = '0';
          mainTimerEl.classList.remove('warning','overtime');
          break;
        }
      
        // 2) Count-Up
        if (displayType === 'count-up') {
          mainTimerEl.textContent = formatTime(elapsed);
          progBar.style.width     = duration > 0
                                   ? `${Math.min(elapsed/duration*100,100)}%`
                                   : '0';
          mainTimerEl.classList.remove('warning','overtime');
          break;
        }
      
        // 3) Count-Down oder 'none' → Runterzählen mit Warn/Danger
        if (displayType === 'count-down' || displayType === 'none') {
          const rem            = current;
          const warnThreshold  = currentEventData?.timeWarning  ?? 60000;
          const dangerThreshold= currentEventData?.timeDanger   ?? 0;
          mainTimerEl.textContent = formatTime(rem);
          progBar.style.width     = duration > 0
                                   ? `${Math.min(elapsed/duration*100,100)}%`
                                   : '0';
          mainTimerEl.classList.toggle('warning', rem <= warnThreshold && rem > dangerThreshold);
          mainTimerEl.classList.toggle('overtime', rem <= dangerThreshold);
          break;
        }
      
        // 4) Fallback (z.B. 'clock' während Event) → Uhrmodus
        {
          const ms = clock != null ? clock : current;
          mainTimerEl.textContent = formatClock(ms);
          progBar.style.width     = '0';
          mainTimerEl.classList.remove('warning','overtime');
          break;
        }
      }
      

      
      
      
  }
});