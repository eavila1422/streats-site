// Your Firebase config
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

// Initialize Leaflet map (runs regardless of Firebase)
console.log("Attempting to load map...");
let map;
navigator.geolocation.getCurrentPosition(position => {
  const { latitude, longitude } = position.coords;
  console.log("Geolocation success:", latitude, longitude);
  map = L.map('map').setView([latitude, longitude], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  // Load approved pins if Firebase is available
  if (db) {
    db.collection('pins').where('status', '==', 'approved').onSnapshot(snapshot => {
      console.log("Fetching approved pins...");
      snapshot.forEach(doc => {
        const pin = doc.data();
        L.marker([pin.latitude, pin.longitude])
          .addTo(map)
          .bindPopup(`<b>${pin.name}</b><br>${pin.description}`);
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
