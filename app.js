const leftPad = (num) => String(num).padStart(2, "0");

function updateProjectHeader(name) {
  document.getElementById("projekttitel").innerText = name;
}

function updateTitelNow(name) {
  if (name == null) {
    document.querySelector(".demnaechsttext1").textContent = "--";
  } else {
    document.querySelector(".demnaechsttext1").innerHTML = name;
  }
}

function updateTitelNext(name) {
  if (name == null) {
    document.querySelector(".demnaechsttext2").textContent = "--";
  } else {
    document.querySelector(".demnaechsttext2").innerHTML = name;
  }
}

const fetchProjectName = async () => {
  try {
    const response = await fetch(`/data/project`);
    if (!response.ok) {
      throw new Error(`Failed to fetch project name: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.title) {
      updateProjectHeader(data.title);
    }
  } catch (error) {
    console.error("Error fetching project name:", error);
  }
};

const updateTimerCurrent = (current) => {
  const currentTimeElement = document.querySelector(".stage_time_aktuell");
  if (currentTimeElement && current !== null) {
    const isNegative = current < 0;
    const absCurrent = Math.abs(current);
    const hours = Math.floor(absCurrent / (60 * 60 * 1000));
    const minutes = Math.floor((absCurrent % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((absCurrent % (60 * 1000)) / 1000);

    if (hours > 0) {
      currentTimeElement.textContent = `${isNegative ? "-" : ""}${String(
        hours
      ).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
        seconds
      ).padStart(2, "0")}`;
    } else {
      currentTimeElement.textContent = `${isNegative ? "-" : ""}${String(
        minutes
      ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
  } else if (currentTimeElement) {
    currentTimeElement.textContent = "--:--:--";
  }
};

function updateClock(clockMs) {
  const el = document.querySelector(".uhr__time");
  if (!el) return;
  const now = new Date(clockMs);
  const hh = leftPad(now.getUTCHours());
  const mm = leftPad(now.getMinutes());
  const ss = leftPad(now.getSeconds());
  el.textContent = `${hh}:${mm}:${ss}`;
}

function updateAuxtimer(current) {
    const currentTimeElement = document.querySelector(".aux__time");
    if (currentTimeElement && current !== null) {
      const isNegative = current < 0;
      const absCurrent = Math.abs(current);
      const hours = Math.floor(absCurrent / (60 * 60 * 1000));
      const minutes = Math.floor((absCurrent % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((absCurrent % (60 * 1000)) / 1000);
  
      if (hours > 0) {
        currentTimeElement.textContent = `${isNegative ? "-" : ""}${String(
          hours
        ).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
          seconds
        ).padStart(2, "0")}`;
      } else {
        currentTimeElement.textContent = `${isNegative ? "-" : ""}${String(
          minutes
        ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      }
    } else if (currentTimeElement) {
      currentTimeElement.textContent = "--:--:--";
    }
  };

function resetView() {
  document.querySelector(".demnaechsttext1").textContent = "--";
  resetViewNext();
}

function resetViewNext() {
  document.querySelector(".demnaechsttext2").textContent = "--";
}

function connectWebSocket() {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const url = `${protocol}://${location.hostname}:${location.port}/ws`;
  const ws = new WebSocket(url);

  ws.onopen = () => {
    console.log("WebSocket connected to", url);
    fetchProjectName();
  };

  ws.onclose = (e) => {
    console.warn(`WebSocket closed (code=${e.code}), reconnecting...`);
    setTimeout(connectWebSocket, 1000);
  };

  ws.onerror = (err) => console.error("WebSocket error:", err);

  ws.onmessage = ({ data }) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return console.error("Invalid JSON:", data);
    }
    const { type, payload } = msg;
    switch (type) {
      case "ontime-clock":
        updateClock(payload);
        break;
      case "ontime-auxtimer1":
        updateAuxtimer(payload.current);
        break;
      case "ontime-timer":
        updateTimerCurrent(payload.current);
        break;
      case "ontime":
        if (payload.eventNow) {
          updateTitelNow(payload.eventNow.title);
        }
        if (payload.eventNext) {
          updateTitelNext(payload.eventNext.title);
        }
        break;
      case "ontime-eventNow":
        if (payload == null) {
          resetView();
        } else {
          updateTitelNow(payload.title);
        }
        break;
      case "ontime-eventNext":
        if (payload == null) {
          resetViewNext();
        } else {
          updateTitelNext(payload.title);
        }
        break;
      default:
        //console.debug("Unhandled WS type:", type);
        //console.log(payload);
        break;
    }
  };
}

connectWebSocket();
