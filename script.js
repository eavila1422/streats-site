const firebaseConfig = {
  apiKey: "AIzaSyDFRyLHLDumJpteFlannZMcEX3l8VpuQlM",
  authDomain: "streats-site.firebaseapp.com",
  projectId: "streats-site",
  storageBucket: "streats-site.firebasestorage.app",
  messagingSenderId: "435856449927",
  appId: "1:435856449927:web:021d6dae14a84320627322",
};

// Initialize Firebase
let db;
if (typeof firebase !== 'undefined') {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
    db = firebase.firestore();
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.error("Firebase is not defined - skipping initialization");
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

  // Custom pin icon
  const foodIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/877/877636.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  // Load approved pins with business hours check
  if (db) {
    db.collection('pins').where('status', '==', 'approved').onSnapshot(snapshot => {
      console.log("Fetching approved pins...");
      map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });
      snapshot.forEach(doc => {
        const pin = doc.data();
        const now = new Date();
        const currentHours = now.getHours() + now.getMinutes() / 60; // Decimal hours (e.g., 14.5 for 2:30 PM)
        const startHours = parseInt(pin.startTime.split(':')[0]) + parseInt(pin.startTime.split(':')[1]) / 60;
        const endHours = parseInt(pin.endTime.split(':')[0]) + parseInt(pin.endTime.split(':')[1]) / 60;

        // Show pin if current time is within business hours
        if (currentHours >= startHours && currentHours <= endHours) {
          L.marker([pin.latitude, pin.longitude], { icon: foodIcon })
            .addTo(map)
            .bindPopup(`
              <div style="font-family: Arial; text-align: center;">
                <b>${pin.name}</b><br>
                <i>${pin.foodType}</i><br>
                ${pin.description}<br>
                <small>Contact: ${pin.contact}</small><br>
                <small>Hours: ${pin.startTime} - ${pin.endTime}</small>
              </div>
            `);
        } else {
          console.log(`Pin ${pin.name} is outside business hours`);
        }
      });
    });
  } else {
    console.log("No Firebase - skipping pin loading");
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

// Geocode address to lat/long
async function geocodeAddress(address) {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
  const data = await response.json();
  if (data && data.length > 0) {
    return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
  } else {
    throw new Error("Address not found");
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
        const coords = await geocodeAddress(address);
        const data = {
          name: document.getElementById('name').value,
          foodType: document.getElementById('foodType').value,
          contact: document.getElementById('contact').value,
          description: document.getElementById('description').value,
          address: address,
          latitude: coords.latitude,
          longitude: coords.longitude,
          startTime: document.getElementById('startTime').value, // e.g., "09:00"
          endTime: document.getElementById('endTime').value,     // e.g., "17:00"
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('pins').add(data);
        alert('Submitted for approval!');
        document.getElementById('form').style.display = 'none';
        e.target.reset();
      } catch (error) {
        console.error("Form submission failed:", error);
        alert("Error: " + error.message);
      }
    } else {
      console.error("No Firebase - cannot submit form");
      alert("Submission failed - Firebase not available");
    }
  };
} else {
  console.error("Business form not found");
}
