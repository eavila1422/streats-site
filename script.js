console.log("Script.js loaded at:", new Date().toLocaleString());

const firebaseConfig = {
  apiKey: "AIzaSyDFRyLHLDumJpteFlannZMcEX3l8VpuQlM",
  authDomain: "streats-site.firebaseapp.com",
  projectId: "streats-site",
  storageBucket: "streats-site.firebasestorage.app",
  messagingSenderId: "435856449927",
  appId: "1:435856449927:web:021d6dae14a84320627322",
};

// Initialize Firebase
let db, storage;
if (typeof firebase !== 'undefined') {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
    db = firebase.firestore();
    storage = firebase.storage();
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

// Initialize Leaflet map
console.log("Attempting to load map...");
let map;
navigator.geolocation.getCurrentPosition(position => {
  const { latitude, longitude } = position.coords;
  console.log("Geolocation success:", latitude, longitude);
  map = L.map('map').setView([latitude, longitude], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  const foodIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/877/877636.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  if (db) {
    db.collection('pins').where('status', '==', 'approved').onSnapshot(snapshot => {
      console.log("Fetching approved pins...");
      map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });
      snapshot.forEach(doc => {
        const pin = doc.data();
        console.log("Pin data:", pin);
        if (!pin.latitude || !pin.longitude || !pin.startTime || !pin.endTime) {
          console.log(`Pin ${pin.name || 'unknown'} skipped - missing required fields`);
          return;
        }
        const now = new Date();
        let currentHours = now.getHours() + now.getMinutes() / 60;
        let startHours = parseInt(pin.startTime.split(':')[0]) + parseInt(pin.startTime.split(':')[1]) / 60;
        let endHours = parseInt(pin.endTime.split(':')[0]) + parseInt(pin.endTime.split(':')[1]) / 60;

        if (pin.startPeriod === 'PM' && startHours < 12) startHours += 12;
        if (pin.startPeriod === 'AM' && startHours === 12) startHours = 0;
        if (pin.endPeriod === 'PM' && endHours < 12) endHours += 12;
        if (pin.endPeriod === 'AM' && endHours === 12) endHours = 0;

        console.log(`Checking hours: Now=${currentHours}, Start=${startHours}, End=${endHours}`);

        if (currentHours >= startHours && currentHours <= endHours) {
          const marker = L.marker([pin.latitude, pin.longitude], { icon: foodIcon })
            .addTo(map)
            .bindPopup(`<b>${pin.name}</b><br>${pin.description}`);
          marker.on('click', () => showBusinessPage(pin));
          console.log(`Pin ${pin.name} added to map at:`, pin.latitude, pin.longitude);
        } else {
          console.log(`Pin ${pin.name} outside business hours`);
        }
      });
    });
  }
}, () => {
  console.log("Geolocation failed, using fallback location");
  map = L.map('map').setView([51.505, -0.09], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);
});

function showForm() {
  console.log("Go Live button clicked");
  const form = document.getElementById('form');
  if (form) {
    form.style.display = 'block';
  } else {
    console.error("Form element not found");
  }
}

async function geocodeAddress(address) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
    const data = await response.json();
    console.log("Geocoding response for:", address, "Raw data:", data);
    if (data && data.length > 0) {
      const result = {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
      console.log("Geocoded result:", result);
      return result;
    } else {
      throw new Error("Address not found");
    }
  } catch (error) {
    console.error("Geocoding failed:", error);
    throw error;
  }
}

async function verifyAddress() {
  const address = document.getElementById('address').value;
  const preview = document.getElementById('address-preview');
  if (!address) {
    preview.textContent = "Please enter an address";
    return;
  }
  try {
    const result = await geocodeAddress(address);
    preview.textContent = `Found: ${result.displayName}`;
    preview.style.color = '#28a745';
  } catch (error) {
    preview.textContent = "Invalid address - please check and try again";
    preview.style.color = '#d9534f';
  }
}

const formElement = document.getElementById('business-form');
if (formElement) {
  formElement.onsubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted");
    if (db && storage) {
      try {
        const address = document.getElementById('address').value;
        console.log("Submitting address:", address);
        const coords = await geocodeAddress(address);
        console.log("Geocoded coords:", coords);
        const data = {
          name: document.getElementById('name').value,
          foodType: document.getElementById('foodType').value,
          contact: document.getElementById('contact').value,
          description: document.getElementById('description').value,
          address: address,
          latitude: coords.latitude,
          longitude: coords.longitude,
          startTime: document.getElementById('startTime').value,
          startPeriod: document.getElementById('startPeriod').value,
          endTime: document.getElementById('endTime').value,
          endPeriod: document.getElementById('endPeriod').value,
          specials: document.getElementById('specials').value,
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        console.log("Data to save:", data);
        const docRef = await db.collection('pins').add(data);
        console.log("Document added with ID:", docRef.id);
        const photos = document.getElementById('photos').files;
        if (photos.length > 0) {
          const photoUrls = await uploadPhotos(photos, docRef.id);
          await docRef.update({ photos: photoUrls });
          console.log("Photos uploaded:", photoUrls);
        }
        alert('Submitted for approval!');
        document.getElementById('form').style.display = 'none';
        document.getElementById('address-preview').textContent = '';
        e.target.reset();
      } catch (error) {
        console.error("Form submission failed:", error);
        alert("Error: " + error.message);
      }
    } else {
      console.error("Firebase not initialized");
      alert("Firebase not available");
    }
  };
}

function showBusinessPage(pin) {
  document.getElementById('page-name').textContent = pin.name;
  document.getElementById('page-foodType').textContent = `Food Type: ${pin.foodType}`;
  document.getElementById('page-contact').textContent = `Contact: ${pin.contact}`;
  document.getElementById('page-address').textContent = `Address: ${pin.address}`;
  document.getElementById('page-hours').textContent = `Hours: ${pin.startTime} ${pin.startPeriod} - ${pin.endTime} ${pin.endPeriod}`;
  document.getElementById('page-description').textContent = `Description: ${pin.description}`;
  document.getElementById('page-specials').textContent = `Specials: ${pin.specials}`;
  const photosDiv = document.getElementById('page-photos');
  photosDiv.innerHTML = '';
  if (pin.photos && pin.photos.length > 0) {
    pin.photos.forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      photosDiv.appendChild(img);
    });
  }
  document.getElementById('business-page').style.display = 'block';
}

function closeBusinessPage() {
  document.getElementById('business-page').style.display = 'none';
}

async function uploadPhotos(files, pinId) {
  const photoUrls = [];
  for (const file of files) {
    const ref = storage.ref().child(`pins/${pinId}/${file.name}`);
    await ref.put(file);
    const url = await ref.getDownloadURL();
    photoUrls.push(url);
  }
  return photoUrls;
}
