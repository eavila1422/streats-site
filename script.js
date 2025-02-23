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

        if (!pin.startTime || !pin.endTime || !pin.latitude || !pin.longitude) {
          console.log(`Pin ${pin.name || 'unknown'} skipped - missing required fields`);
          return;
        }

        const now = new Date();
        let currentHours = now.getHours() + now.getMinutes() / 60;
        let startHours = parseInt(pin.startTime.split(':')[0]) + parseInt(pin.startTime.split(':')[1]) / 60;
        let endHours = parseInt(pin.endTime.split(':')[0]) + parseInt(pin.endTime.split(':')[1]) / 60;

        if (pin.startPeriod === 'PM' && startHours
