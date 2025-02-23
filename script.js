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
        if (!pin.latitude || !pin.longitude) {
          console.log(`Pin ${pin.name || 'unknown'} skipped - missing coordinates`);
          return;
        }
        L.marker([pin.latitude, pin.longitude], { icon: foodIcon })
          .addTo(map)
          .bindPopup(`<b>${pin.name}</b><br>${pin.description}`);
        console.log(`Pin ${pin.name} added to map`);
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
    if (data && data.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    } else {
      throw new Error("Address not found");
    }
  } catch (error) {
    console.error("Geocoding failed:", error);
    throw error;
  }
}

const formElement = document.getElementById('business-form');
if (formElement) {
  formElement.onsubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted");
    if (db) {
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
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        console.log("Data to save:", data);
        await db.collection('pins').add(data);
        console.log("Data saved to Firebase");
        alert('Submitted for approval!');
        document.getElementById('form').style.display = 'none';
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
