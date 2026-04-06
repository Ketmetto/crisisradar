const map = L.map('map', {
  minZoom: 2,
  maxZoom: 6,
  maxBounds: [[-85, -180], [85, 180]],
  maxBoundsViscosity: 1.0
}).setView([20, 0], 2);

// map api
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  noWrap: true
}).addTo(map);

let allEvents = [];
let markers = [];

/*data*/
async function loadEvents() {
  const res = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open');
  const data = await res.json();

  allEvents = data.events;

  updateStats(allEvents);
  displayEvents(allEvents);
}

/*live stat*/
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


function getEmoji(cat) {
  if (!cat) return "🌍";

  cat = cat.toLowerCase();

  if (cat.includes("volcano")) return "🌋";
  if (cat.includes("wildfire")) return "🔥";
  if (cat.includes("storm")) return "🌪";
  if (cat.includes("iceberg")) return "🧊";

  return "📍";
}


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

/*map*/
function displayEvents(events) {

  markers.forEach(m => map.removeLayer(m));
  markers = [];

  events.forEach(event => {

    if (!event.geometry || !event.geometry.length) return;

    const coords = event.geometry[0].coordinates;
    const cat = event.categories?.[0]?.title || "";

    const marker = L.marker([coords[1], coords[0]], {
      icon: createIcon(getEmoji(cat))
    }).addTo(map);

    marker.bindPopup(`
      <b>${event.title}</b><br>
      ${cat}<br>
      ${event.geometry[0].date}
    `);

    marker.on('click', () => {
      map.flyTo([coords[1], coords[0]], 5, {
        duration: 1.5
      });
    });

    markers.push(marker);
  });
}


function filterEvents(category) {

  const filtered = allEvents.filter(e =>
    e.categories.some(c =>
      c.title.toLowerCase().includes(category.toLowerCase())
    )
  );

  displayEvents(filtered);
}


function resetFilters() {
  displayEvents(allEvents);
}

/*search */
document.getElementById("search").addEventListener("keypress", async (e) => {

  if (e.key === "Enter") {

    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${e.target.value}`);
    const data = await res.json();

    if (data.length > 0) {
      map.flyTo([data[0].lat, data[0].lon], 5, {
        duration: 1.5
      });
    }
  }
});

