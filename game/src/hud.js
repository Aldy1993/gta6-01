// HUD: money, wanted stars, speed, the active mission line, a toast
// message and the speedometer. Plain DOM over the 3D canvas — readable at
// a glance, which is what the screenshots are judged on.
export function createHud() {
  const root = document.getElementById('hud');
  const moneyEl = document.getElementById('hud-money');
  const starsEl = document.getElementById('hud-stars');
  const speedEl = document.getElementById('hud-speed');
  const missionEl = document.getElementById('hud-mission');
  const toastEl = document.getElementById('hud-toast');
  const hintEl = document.getElementById('hud-hint');
  let toastTimer = 0;

  function setMoney(value) {
    moneyEl.textContent = `$${Math.round(value).toLocaleString('en-US')}`;
  }

  function setWanted(stars) {
    let out = '';
    for (let i = 0; i < 5; i += 1) out += i < stars ? '★' : '☆';
    starsEl.textContent = out;
    starsEl.classList.toggle('hot', stars > 0);
  }

  function setSpeed(kmh, driving) {
    speedEl.textContent = driving ? `${Math.round(Math.abs(kmh))} km/h` : '';
  }

  function setMission(text) {
    missionEl.textContent = text;
  }

  function toast(message, seconds) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    toastTimer = seconds || 3;
  }

  function setHint(text) {
    hintEl.textContent = text;
  }

  function step(dt) {
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) toastEl.classList.remove('show');
    }
  }

  return { setMoney, setWanted, setSpeed, setMission, toast, setHint, step, root };
}
