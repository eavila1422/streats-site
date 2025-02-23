const firebaseConfig = {
  apiKey: "AIzaSyDFRyLHLDumJpteFlannZMcEX3l8VpuQlM",
  authDomain: "streats-site.firebaseapp.com",
  projectId: "streats-site",
  storageBucket: "streats-site.firebasestorage.app",
  messagingSenderId: "435856449927",
  appId: "1:435856449927:web:021d6dae14a84320627322",
  measurementId: "G-S7M1VMZCFR"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization failed:", error);
}
const db = firebase.firestore();

// Initialize Leaflet map
let map;
try {
  navigator.geolocation.getCurrentPosition(position => {
    const { latitude, longitude } = position.coords;
    console.log("Geolocation success:", latitude, longitude);
    map = L.map('map').setView([latitude, longitude], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    // Load approved pins
    db.collection('pins').where('status', '==', 'approved').onSnapshot(snapshot => {
      console.log("Fetching approved pins...");
      snapshot.forEach(doc => {
        const pin = doc.data();
        L.marker([pin.latitude, pin.longitude])
          .addTo(map)
          .bindPopup(`<b>${pin.name}</b><br>${pin.description}`);
      });
    });
  }, () => {
    // Fallback if geolocation fails
    console.log("Geolocation failed, using fallback location");
    map = L.map('map').setView([51.505, -0.09], 13); // Default: London
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);
  });
} catch (error) {
  console.error("Map initialization failed:", error);
}

function showForm() {
  console.log("Go Live button clicked");
  const form = document.getElementById('form');
  if (form) {
    form.style.display = 'block';
  } else {
    console.error("Form element not found");
  }
}

document.getElementById('business-form').onsubmit = async (e) => {
  e.preventDefault();
  console.log("Form submitted");
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
};
