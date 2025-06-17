const themeToggle = document.getElementById('toggle-theme');
themeToggle.onclick = () => {
  document.body.classList.toggle('dark');
  const icon = themeToggle.querySelector('i');
  icon.classList.toggle('fa-moon');
  icon.classList.toggle('fa-sun');
  icon.textContent = document.body.classList.contains('dark') ? "light mode" : "dark mode";
};

// Track if speaking is active
let isSpeaking = false;
let currentUtterance = null;

async function fetchEvents() {
  const date = document.getElementById('datePicker').value;
  const country = document.getElementById('country').value;
  const language = document.getElementById('language').value;

  if (!date) return alert("Please select a date");

  const [year, month, day] = date.split("-");
  const url = `https://history.muffinlabs.com/date/${month}/${day}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const events = data.data.Events;

    document.getElementById("date").textContent = `📅 Events on ${date} (${country})`;

    const list = document.getElementById("history-events");
    list.innerHTML = "";

    for (let ev of events) {
      const translated = await translateText(ev.text, language);
      const image = await fetchThumbnail(ev.links[0]?.title || "History");

      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${ev.year}</strong> - ${translated}
        ${image ? `<img src="${image}" alt="event image" />` : ""}
        <button onclick='addToFavorites(${JSON.stringify(ev).replace(/'/g, "\'")})'>⭐</button>
      `;
      list.appendChild(li);
    }
  } catch (e) {
    alert("Failed to fetch events");
    console.error(e);
  }
}

function copyToClipboard() {
  const text = [...document.querySelectorAll("#history-events li")]
    .map(li => li.textContent.replace("⭐", "")).join("\n");
  navigator.clipboard.writeText(text).then(() => alert("Copied!"));
}

function downloadEvents() {
  const text = [...document.querySelectorAll("#history-events li")]
    .map(li => li.textContent.replace("⭐", "")).join("\n");
  const blob = new Blob([text], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "events.txt";
  link.click();
}

function speakEvents() {
  if (isSpeaking) {
    speechSynthesis.cancel();
    isSpeaking = false;
    return;
  }

  const events = [...document.querySelectorAll("#history-events li")]
    .map(li => li.textContent.replace("⭐", ""));

  currentUtterance = new SpeechSynthesisUtterance(events.join(". "));
  currentUtterance.onend = () => {
    isSpeaking = false;
  };

  speechSynthesis.speak(currentUtterance);
  isSpeaking = true;
}

function shareEvents() {
  const text = [...document.querySelectorAll("#history-events li")]
    .map(li => li.textContent.replace("⭐", "")).join("\n");
  if (navigator.share) {
    navigator.share({ title: "This Day in History", text });
  } else {
    alert("Sharing not supported");
  }
}

function addToFavorites(event) {
  const favs = JSON.parse(localStorage.getItem("favorites") || "[]");
  favs.push(event);
  localStorage.setItem("favorites", JSON.stringify(favs));
  renderFavorites();
}

function clearFavorites() {
  localStorage.removeItem("favorites");
  renderFavorites();
}

function renderFavorites() {
  const favs = JSON.parse(localStorage.getItem("favorites") || "[]");
  const list = document.getElementById("favorites");
  list.innerHTML = "";
  favs.forEach(ev => {
    const li = document.createElement("li");
    li.textContent = `${ev.year} - ${ev.text}`;
    list.appendChild(li);
  });
}

// Translate using LibreTranslate API
async function translateText(text, lang) {
  if (lang === "en") return text;
  try {
    const res = await fetch("https://libretranslate.de/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: "en", target: lang, format: "text" })
    });
    const data = await res.json();
    return data.translatedText;
  } catch (e) {
    console.error("Translation error", e);
    return text;
  }
}

// Get thumbnail from Wikipedia
async function fetchThumbnail(title) {
  if (!title) return null;
  const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  try {
    const res = await fetch(apiUrl);
    const data = await res.json();
    return data.thumbnail?.source || null;
  } catch {
    return null;
  }
}

// Auto-load today's date and favorites
window.onload = () => {
  document.getElementById("datePicker").valueAsDate = new Date();
  renderFavorites();
};
