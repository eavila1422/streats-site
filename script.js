console.log("Script.js loaded at:", new Date().toLocaleString());

const firebaseConfig = {
  apiKey: "AIzaSyDFRyLHLDumJpteFlannZMcEX3l8VpuQlM",
  authDomain: "streats-site.firebaseapp.com",
  projectId: "streats-site",
  storageBucket: "streats-site.firebasestorage.app",
  messagingSenderId: "435856449927",
  appId: "1:435856449927:web:021d6dae14a84320627322",
};

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZWF2aWxhMTQyMiIsImEiOiJjbTdpMjZsYngwY2IxMm1vaWtjM3ZieGRmIn0.C9ja6tcQ-iNu91gSDggyxg';

let db, storage, auth;
if (typeof firebase !== 'undefined') {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
    db = firebase.firestore();
    storage = firebase.storage();
    auth = firebase.auth();
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
  L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=' + MAPBOX_TOKEN, {
    attribution: '© <a href="https://www.mapbox.com/">Mapbox</a> © <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
    tileSize: 512,
    zoomOffset: -1
  }).addTo(map);

  const foodTruckIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1048/1048313.png',
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38]
  });

  if (db) {
    db.collection('pins').where('live', '==', true).onSnapshot(snapshot => {
      console.log("Fetching live pins...");
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

        console.log(`Checking hours for ${pin.name}: Now=${currentHours}, Start=${startHours}, End=${endHours}`);

        if (currentHours >= startHours && currentHours <= endHours) {
          const marker = L.marker([pin.latitude, pin.longitude], { icon: foodTruckIcon })
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
  L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=' + MAPBOX_TOKEN, {
    attribution: '© <a href="https://www.mapbox.com/">Mapbox</a> © <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
    tileSize: 512,
    zoomOffset: -1
  }).addTo(map);
});

// Authentication handling
const authBtn = document.getElementById('auth-btn');
const authModal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const signupFields = document.getElementById('signup-fields');
const authSubmit = document.getElementById('auth-submit');
const authToggle = document.getElementById('auth-toggle');
const vendorDashboard = document.getElementById('vendor-dashboard');
const liveToggle = document.getElementById('live-toggle');
const logoutBtn = document.getElementById('logout');
let isSignupMode = true;

authBtn.onclick = () => {
  authModal.style.display = 'block';
  updateAuthMode();
};

function updateAuthMode() {
  if (isSignupMode) {
    authTitle.textContent = "Sign Up";
    signupFields.style.display = 'block';
    authSubmit.textContent = "Sign Up";
    authToggle.innerHTML = 'Already have an account? <a href="#" onclick="toggleAuthMode()">Login</a>';
  } else {
    authTitle.textContent = "Login";
    signupFields.style.display = 'none';
    authSubmit.textContent = "Login";
    authToggle.innerHTML = 'Need an account? <a href="#" onclick="toggleAuthMode()">Sign Up</a>';
  }
}

function toggleAuthMode() {
  isSignupMode = !isSignupMode;
  updateAuthMode();
  event.preventDefault();
}

// Autocomplete setup
let autocomplete;
function initializeAutocomplete() {
  const input = document.getElementById('address');
  if (!input) {
    console.error("Address input not found");
    return;
  }
  autocomplete = new google.maps.places.Autocomplete(input, {
    types: ['address'],
    componentRestrictions: { country: 'us' },
    fields: ['formatted_address', 'geometry.location']
  });
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (place.geometry) {
      const preview = document.getElementById('address-preview');
      preview.textContent = `Selected: ${place.formatted_address}`;
      preview.style.color = '#28a745';
      console.log("Address selected:", place.formatted_address, "Coords:", place.geometry.location.lat(), place.geometry.location.lng());
    }
  });
}

initializeAutocomplete();

authSubmit.onclick = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    if (isSignupMode) {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      const place = autocomplete.getPlace();
      if (!place || !place.geometry) {
        throw new Error("Please select an address from the dropdown");
      }
      const address = place.formatted_address;
      const coords = {
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng()
      };
      const userData = {
        email: email,
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
        approved: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection('users').doc(user.uid).set(userData);
      console.log("User signed up:", user.uid);
      uploadInitialPhotos(user.uid);
    } else {
      await auth.signInWithEmailAndPassword(email, password);
      console.log("User logged in:", auth.currentUser.uid);
    }
    authModal.style.display = 'none';
  } catch (error) {
    console.error("Auth failed:", error);
    alert("Error: " + error.message);
  }
};

async function uploadInitialPhotos(userId) {
  const photos = document.getElementById('photos').files;
  if (photos.length > 0) {
    const photoUrls = await uploadPhotos(photos, userId);
    await db.collection('users').doc(userId).update({ photos: photoUrls });
    console.log("Initial photos uploaded:", photoUrls);
  }
}

auth.onAuthStateChanged(async user => {
  if (user) {
    authBtn.style.display = 'none';
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      document.getElementById('vendor-name').textContent = userData.name;
      document.getElementById('approval-status').textContent = userData.approved ? "Approved" : "Pending Approval";
      liveToggle.style.display = userData.approved ? 'block' : 'none';
      liveToggle.textContent = userData.live ? "Go Offline" : "Go Live";
      vendorDashboard.style.display = 'block';
      if (userData.approved) {
        const pinDoc = await db.collection('pins').doc(user.uid).get();
        liveToggle.onclick = () => toggleLiveStatus(user.uid, pinDoc.exists && pinDoc.data().live);
      }
    }
  } else {
    authBtn.style.display = 'block';
    vendorDashboard.style.display = 'none';
  }
});

async function toggleLiveStatus(userId, isLive) {
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  if (isLive) {
    await db.collection('pins').doc(userId).delete();
    console.log("Vendor went offline:", userId);
    liveToggle.textContent = "Go Live";
  } else {
    await db.collection('pins').doc(userId).set({
      ...userData,
      live: true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("Vendor went live:", userId);
    liveToggle.textContent = "Go Offline";
  }
}

logoutBtn.onclick = async () => {
  await auth.signOut();
  console.log("User logged out");
};

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
