const map = L.map('map').setView([49.226, 17.666], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
}).addTo(map);

let landmarks = JSON.parse(localStorage.getItem('landmarks')) || [];
let markers = [];
let currentRoute; 

landmarks.forEach(landmark => addMarker(landmark.lat, landmark.lng, landmark.name, landmark.color, landmark.address));
updateDropdowns();

map.on('click', async (e) => {
  const name = prompt("Zadejte název landmarku:");
  if (!name) return;

  const { lat, lng } = e.latlng;
  const color = getRandomColor();
  const address = await getAddress(lat, lng);

  addMarker(lat, lng, name, color, `${name} - ${address}`);
  saveLandmark(lat, lng, name, color, `${name} - ${address}`);
});

function addMarker(lat, lng, name, color, address) {
  const icon = createCustomIcon(color);
  const marker = L.marker([lat, lng], { icon }).addTo(map);
  marker.bindPopup(`<b>${name}</b><br>${address}`).openPopup();

  markers.push({ marker, name, lat, lng, address });
  addToList(lat, lng, name, color, address);
}

function saveLandmark(lat, lng, name, color, address) {
  landmarks.push({ lat, lng, name, color, address });
  localStorage.setItem('landmarks', JSON.stringify(landmarks));
  updateDropdowns();
}

function addToList(lat, lng, name, color, address) {
  const list = document.getElementById('pointList');
  const li = document.createElement('li');
  li.className = 'list-group-item d-flex align-items-center justify-content-between';

  const nameLink = document.createElement('span');
  nameLink.textContent = address;
  nameLink.style.cursor = 'pointer';
  nameLink.style.color = 'blue';
  nameLink.style.textDecoration = 'underline';
  nameLink.onclick = () => moveToLocation(lat, lng, name);

  const colorBox = document.createElement('span');
  colorBox.style.backgroundColor = color;
  colorBox.style.display = 'inline-block';
  colorBox.style.width = '15px';
  colorBox.style.height = '15px';
  colorBox.style.marginLeft = '10px';
  colorBox.style.border = '1px solid #000';

  const removeBtn = document.createElement('button');
  removeBtn.textContent = "Smazat";
  removeBtn.className = 'btn btn-sm btn-danger ms-2';
  removeBtn.onclick = () => {
    list.removeChild(li);
    removeLandmark(lat, lng);
  };

  li.appendChild(nameLink);
  li.appendChild(colorBox);
  li.appendChild(removeBtn);
  list.appendChild(li);
}

function moveToLocation(lat, lng, name) {
  map.setView([lat, lng], 15);
  const markerData = markers.find(m => m.lat === lat && m.lng === lng);
  if (markerData) {
    markerData.marker.openPopup();
  }
}

function removeLandmark(lat, lng) {
  landmarks = landmarks.filter(l => l.lat !== lat || l.lng !== lng);
  localStorage.setItem('landmarks', JSON.stringify(landmarks));
  updateDropdowns();
}

function updateDropdowns() {
  const startDropdown = document.getElementById('startPoint');
  const endDropdown = document.getElementById('endPoint');
  
  startDropdown.innerHTML = '<option value="">Vyberte startovní bod</option>';
  endDropdown.innerHTML = '<option value="">Vyberte cílový bod</option>';
  
  landmarks.forEach(landmark => {
    const optionStart = document.createElement('option');
    optionStart.value = landmark.name;
    optionStart.textContent = landmark.name;

    const optionEnd = optionStart.cloneNode(true);

    startDropdown.appendChild(optionStart);
    endDropdown.appendChild(optionEnd);
  });
}

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function createCustomIcon(color) {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

async function getAddress(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  try {
    const response = await fetch(url);
    const data = await response.json();

    const city = data.address.city || data.address.town || data.address.village || "Neznámé město";
    const houseNumber = data.address.house_number || "bez čísla";
    const road = data.address.road || "Neznámá ulice";

    return `${road} ${houseNumber}, ${city}`;
  } catch (error) {
    console.error("Nepodařilo se získat adresu:", error);
    return "Adresa nenalezena";
  }
}

document.getElementById('createRoute').addEventListener('click', () => {
  const startName = document.getElementById('startPoint').value;
  const endName = document.getElementById('endPoint').value;

  if (!startName || !endName) {
    alert("Musíte vybrat startovní i cílový bod.");
    return;
  }

  const start = landmarks.find(l => l.name === startName);
  const end = landmarks.find(l => l.name === endName);

  if (!start || !end) {
    alert("Zadané body nebyly nalezeny.");
    return;
  }

  if (currentRoute) {
    map.removeControl(currentRoute);
  }

  currentRoute = L.Routing.control({
    waypoints: [
      L.latLng(start.lat, start.lng),
      L.latLng(end.lat, end.lng)
    ],
    routeWhileDragging: true
  }).addTo(map);

  map.fitBounds([
    [start.lat, start.lng],
    [end.lat, end.lng]
  ]);
});

document.getElementById('deleteRoute').addEventListener('click', () => {
  if (currentRoute) {
    map.removeControl(currentRoute);
    currentRoute = null;
    alert("Trasa byla smazána.");
  } else {
    alert("Žádná trasa není vykreslena.");
  }
});

document.getElementById('createPoint').addEventListener('click', async () => {
  const address = document.getElementById('addressInput').value.trim();
  const name = document.getElementById('nameInput').value.trim();

  if (!address || !name) {
    alert("Zadejte adresu i název bodu.");
    return;
  }

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
    const data = await response.json();

    if (data.length === 0) {
      alert("Adresa nebyla nalezena.");
      return;
    }

    const { lat, lon: lng } = data[0];
    const color = getRandomColor();
    const formattedAddress = `${name} - ${address}`;

    addMarker(lat, lng, name, color, formattedAddress);
    saveLandmark(lat, lng, name, color, formattedAddress);
    alert("Bod byl úspěšně vytvořen!");
  } catch (error) {
    console.error("Chyba při hledání adresy:", error);
    alert("Při hledání adresy došlo k chybě.");
  }
});
