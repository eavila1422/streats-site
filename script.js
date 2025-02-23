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
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/877/877636.png', // Food icon (fork/knife)
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  // Load approved pins with expiration
  if (db) {
    db.collection('pins').where('status', '==', 'approved').onSnapshot(snapshot => {
      console.log("Fetching approved pins...");
      map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });
      snapshot.forEach(doc => {
        const pin = doc.data();
        const createdAt = pin.createdAt.toDate();
        const now = new Date();
        const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
        if (hoursSinceCreation < 24) {
          L.marker([pin.latitude, pin.longitude], { icon: foodIcon })
            .addTo(map)
            .bindPopup(`
              <div style="font-family: Arial; text-align: center;">
                <b>${pin.name}</b><br>
                <i>${pin.foodType}</i><br>
                ${pin.description}<br>
                <small>Contact: ${pin.contact}</small>
              </div>
            `);
        } else {
          console.log(`Pin ${pin.name} expired`);
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

const formElement = document.getElementById('business-form');
if (formElement) {
  formElement.onsubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted");
    if (db) {
      try {
        const data = {
          name: document.getElementById('name').value,
          foodType: document.getElementById('foodType').value,
          contact: document.getElementById('contact').value,
          description: document.getElementById('description').value,
          latitude: map.getCenter().lat,
          longitude: map.getCenter().lng,
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('pins').add(data);
        alert('Submitted for approval!');
        document.getElementById('form').style.display = 'none';
        e.target.reset();
      } catch (error) {
        console.error("Form submission failed:", error);
      }
    } else {
      console.error("No Firebase - cannot submit form");
      alert("Submission failed - Firebase not available");
    }
  };
} else {
  console.error("Business form not found");
}
