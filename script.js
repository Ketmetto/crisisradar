const map = L.map('map', {
  minZoom: 2,
  maxZoom: 6,
  maxBounds: [[-85, -180], [85, 180]],
  maxBoundsViscosity: 1.0
}).setView([20, 0], 2);

// Faster dark tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
  noWrap: true
}).addTo(map);

let allEvents = [];
let markers = [];

/* LOAD EVENTS */
async function loadEvents() {

  document.getElementById("loader").style.display = "block";

  try {

    const cached = localStorage.getItem("events");

    if (cached) {
      allEvents = JSON.parse(cached);
      displayEvents(allEvents);
      updateStats(allEvents);
    }

    const res = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50');

    if (!res.ok) throw new Error("API failed");

    const data = await res.json();

    allEvents = data.events;

    localStorage.setItem("events", JSON.stringify(allEvents));

    displayEvents(allEvents);
    updateStats(allEvents);

    document.getElementById("lastUpdate").innerText =
      "Last update: " + new Date().toLocaleTimeString();

  } catch (err) {
    console.error(err);
    alert("⚠️ Failed to load data");
  }

  document.getElementById("loader").style.display = "none";
}

/* FILTER AFTER LOAD */
function loadAndFilter(category) {
  if (allEvents.length === 0) {
    loadEvents().then(() => filterEvents(category));
  } else {
    filterEvents(category);
  }
}

/* STATS */
function updateStats(events) {
  let fires = 0, storms = 0, volcanoes = 0, icebergs = 0;

  events.forEach(e => {
    const cat = e.categories?.[0]?.title?.toLowerCase() || "";

    if (cat.includes("wildfire")) fires++;
    if (cat.includes("storm")) storms++;
    if (cat.includes("volcano")) volcanoes++;
    if (cat.includes("iceberg")) icebergs++;
  });

  document.getElementById("fires").innerText = fires;
  document.getElementById("storms").innerText = storms;
  document.getElementById("volcanoes").innerText = volcanoes;
  document.getElementById("icebergs").innerText = icebergs;
  document.getElementById("total").innerText = events.length;
}

/* EMOJI */
function getEmoji(cat) {
  if (!cat) return "📍";
  cat = cat.toLowerCase();

  if (cat.includes("volcano")) return "🌋";
  if (cat.includes("wildfire")) return "🔥";
  if (cat.includes("storm")) return "🌪";
  if (cat.includes("iceberg")) return "🧊";

  return "📍";
}

/* ICON */
function createIcon(emoji) {
  return L.divIcon({
    className: '',
    html: `
      <div class="marker">
        <div class="pulse"></div>
        <div class="emoji">${emoji}</div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
}

/* DISPLAY */
function displayEvents(events) {

  markers.forEach(m => map.removeLayer(m));
  markers = [];

  events.forEach(event => {

    if (!event.geometry?.length) return;

    const coords = event.geometry[0].coordinates;
    const cat = event.categories?.[0]?.title || "";

    const marker = L.marker([coords[1], coords[0]], {
      icon: createIcon(getEmoji(cat))
    }).addTo(map);

    marker.bindPopup(`<b>${event.title}</b><br>${cat}`);

    marker.on('click', () => {
      map.flyTo([coords[1], coords[0]], 5, { duration: 1.5 });
    });

    markers.push(marker);
  });
}

/* FILTER */
function filterEvents(category) {
  const filtered = allEvents.filter(e =>
    e.categories.some(c =>
      c.title.toLowerCase().includes(category.toLowerCase())
    )
  );

  displayEvents(filtered);
}

/* RESET */
function resetFilters() {
  displayEvents(allEvents);
  document.querySelectorAll(".filters button").forEach(b => b.classList.remove("active"));
}

/* ACTIVE BUTTON */
function setActive(btn) {
  document.querySelectorAll(".filters button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

/* SEARCH */
let timeout;

document.getElementById("search").addEventListener("input", (e) => {

  clearTimeout(timeout);

  timeout = setTimeout(async () => {

    const query = e.target.value;

    if (query.length < 3) return;

    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
    const data = await res.json();

    if (data.length > 0) {
      map.flyTo([data[0].lat, data[0].lon], 5, { duration: 1.5 });
    }

  }, 400);
});
