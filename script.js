console.log("Script.js loaded at:", new Date().toLocaleString());

const firebaseConfig = {
  apiKey: "AIzaSyDFRyLHLDumJpteFlannZMcEX3l8VpuQlM",
  authDomain: "streats-site.firebaseapp.com",
  projectId: "streats-site",
  storageBucket: "streats-site.firebasestorage.app",
  messagingSenderId: "435856449927",
  appId: "1:435856449927:web:021d6dae14a84320627322",
};

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

// Initialize Leaflet map with OpenStreetMap
console.log("Attempting to load map...");
let map, clusterGroup = L.markerClusterGroup();
const foodTruckIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1048/1048313.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38]
});
navigator.geolocation.getCurrentPosition(position => {
  const { latitude, longitude } = position.coords;
  console.log("Geolocation success:", latitude, longitude);
  map = L.map('map').setView([latitude, longitude], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
  }).addTo(map);
  map.addLayer(clusterGroup);
  loadPins();
}, () => {
  console.log("Geolocation failed, using fallback location");
  map = L.map('map').setView([51.505, -0.09], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
  }).addTo(map);
  map.addLayer(clusterGroup);
  loadPins();
});

// Sidebar toggle
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const content = document.getElementById('content');
sidebarToggle.onclick = () => {
  sidebar.classList.toggle('hidden');
  content.classList.toggle('full');
  sidebarToggle.classList.toggle('hidden');
};

// Authentication handling
const vendorAuthBtn = document.getElementById('vendor-auth-btn');
const customerAuthBtn = document.getElementById('customer-auth-btn');
const authModal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const signupFields = document.getElementById('signup-fields');
const authSubmit = document.getElementById('auth-submit');
const authToggle = document.getElementById('auth-toggle');
const dashboard = document.getElementById('dashboard');
const dashboardBtn = document.getElementById('dashboard-btn');
const logoutBtn = document.getElementById('logout');
const updateProfileBtn = document.getElementById('update-profile');
const liveToggle = document.getElementById('live-toggle');
const vendorFields = document.getElementById('vendor-fields');
let isSignupMode = true;
let authType = null;

vendorAuthBtn.onclick = () => {
  authType = 'vendor';
  authModal.style.display = 'block';
  dashboard.style.display = 'none';
  updateAuthMode();
};

customerAuthBtn.onclick = () => {
  authType = 'customer';
  authModal.style.display = 'block';
  dashboard.style.display = 'none';
  updateAuthMode();
};

function updateAuthMode() {
  if (isSignupMode) {
    authTitle.textContent = authType === 'vendor' ? "Vendor Sign Up" : "Customer Sign Up";
    signupFields.style.display = 'block';
    vendorFields.style.display = authType === 'vendor' ? 'block' : 'none';
    authSubmit.textContent = "Sign Up";
    authToggle.innerHTML = 'Already have an account? <a href="#" onclick="toggleAuthMode()">Login</a>';
  } else {
    authTitle.textContent = authType === 'vendor' ? "Vendor Login" : "Customer Login";
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
let signupAutocomplete, dashAutocomplete;
function initializeSignUpAutocomplete() {
  const input = document.getElementById('address');
  if (!input) return;
  signupAutocomplete = new google.maps.places.Autocomplete(input, {
    types: ['address'],
    componentRestrictions: { country: 'us' },
    fields: ['formatted_address', 'geometry.location']
  });
  signupAutocomplete.addListener('place_changed', () => {
    const place = signupAutocomplete.getPlace();
    if (place.geometry) {
      document.getElementById('address-preview').textContent = `Selected: ${place.formatted_address}`;
      console.log("Sign-up address selected:", place.formatted_address, "Coords:", place.geometry.location.lat(), place.geometry.location.lng());
    }
  });
}

function initializeDashAutocomplete() {
  const input = document.getElementById('dash-address');
  if (!input) return;
  dashAutocomplete = new google.maps.places.Autocomplete(input, {
    types: ['address'],
    componentRestrictions: { country: 'us' },
    fields: ['formatted_address', 'geometry.location']
  });
  dashAutocomplete.addListener('place_changed', () => {
    const place = dashAutocomplete.getPlace();
    if (place.geometry) {
      document.getElementById('dash-address-preview').textContent = `Selected: ${place.formatted_address}`;
      console.log("Dashboard address selected:", place.formatted_address, "Coords:", place.geometry.location.lat(), place.geometry.location.lng());
    }
  });
}

initializeSignUpAutocomplete();

authSubmit.onclick = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    if (isSignupMode) {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      const userData = {
        email,
        name: document.getElementById('name').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (authType === 'vendor') {
        const place = signupAutocomplete.getPlace();
        if (!place || !place.geometry) throw new Error("Please select an address from the dropdown");
        const address = place.formatted_address;
        const coords = { latitude: place.geometry.location.lat(), longitude: place.geometry.location.lng() };
        Object.assign(userData, {
          foodType: document.getElementById('foodType').value,
          contact: document.getElementById('contact').value,
          description: document.getElementById('description').value,
          address,
          latitude: coords.latitude,
          longitude: coords.longitude,
          startTime: document.getElementById('startTime').value,
          startPeriod: document.getElementById('startPeriod').value,
          endTime: document.getElementById('endTime').value,
          endPeriod: document.getElementById('endPeriod').value,
          specials: document.getElementById('specials').value,
          approved: false,
          productPhotos: []
        });
        await db.collection('vendors').doc(user.uid).set(userData);
        await uploadInitialPhotos(user.uid);
        console.log("Vendor signed up:", user.uid);
      } else {
        userData.visitedTrucks = [];
        await db.collection('customers').doc(user.uid).set(userData);
        console.log("Customer signed up:", user.uid);
      }
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
  console.log("Uploading initial photos:", photos.length, "files detected");
  if (photos.length > 0) {
    const photoUrls = await uploadPhotos(photos, userId);
    await db.collection('vendors').doc(userId).update({ productPhotos: photoUrls });
    console.log("Initial product photos uploaded:", photoUrls);
  }
}

auth.onAuthStateChanged(async user => {
  if (user) {
    vendorAuthBtn.style.display = 'none';
    customerAuthBtn.style.display = 'none';
    logoutBtn.style.display = 'block';
    const vendorDoc = await db.collection('vendors').doc(user.uid).get();
    const customerDoc = await db.collection('customers').doc(user.uid).get();

    if (vendorDoc.exists) {
      const vendorData = vendorDoc.data();
      document.getElementById('sidebar-name').textContent = vendorData.name;
      document.getElementById('sidebar-status').textContent = vendorData.approved ? "Approved" : "Pending Approval";
      if (vendorData.approved) {
        dashboardBtn.style.display = 'block';
        const pinDoc = await db.collection('pins').doc(user.uid).get();
        const isLive = pinDoc.exists && pinDoc.data().live;
        liveToggle.textContent = isLive ? "Go Offline" : "Go Live";
        liveToggle.onclick = () => toggleLiveStatus(user.uid, isLive);
        dashboardBtn.onclick = () => showDashboard(vendorData);
      } else {
        dashboardBtn.style.display = 'none';
      }
    } else if (customerDoc.exists) {
      const customerData = customerDoc.data();
      document.getElementById('sidebar-name').textContent = customerData.name;
      document.getElementById('sidebar-status').textContent = "Foodie";
      dashboardBtn.style.display = 'none';
      loadVisitedTrucks(user.uid);
    }
  } else {
    vendorAuthBtn.style.display = 'block';
    customerAuthBtn.style.display = 'block';
    dashboardBtn.style.display = 'none';
    logoutBtn.style.display = 'none';
    dashboard.style.display = 'none';
    document.getElementById('visited-trucks').style.display = 'none';
    document.getElementById('sidebar-name').textContent = '';
    document.getElementById('sidebar-status').textContent = '';
  }
});

async function toggleLiveStatus(userId, isLive) {
  const vendorDoc = await db.collection('vendors').doc(userId).get();
  const vendorData = vendorDoc.data();
  if (!vendorData.approved) {
    alert("Your account must be approved before going live.");
    return;
  }
  if (isLive) {
    await db.collection('pins').doc(userId).delete();
    console.log("Vendor went offline:", userId);
    liveToggle.textContent = "Go Live";
  } else {
    await db.collection('pins').doc(userId).set({
      ...vendorData,
      live: true,
      latitude: vendorData.latitude,
      longitude: vendorData.longitude,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("Vendor went live:", userId);
    liveToggle.textContent = "Go Offline";
  }
}

function showDashboard(vendorData) {
  authModal.style.display = 'none';
  dashboard.style.display = 'block';
  document.getElementById('dash-name').value = vendorData.name || '';
  document.getElementById('dash-foodType').value = vendorData.foodType || '';
  document.getElementById('dash-contact').value = vendorData.contact || '';
  document.getElementById('dash-address').value = vendorData.address || '';
  document.getElementById('dash-startTime').value = vendorData.startTime || '';
  document.getElementById('dash-startPeriod').value = vendorData.startPeriod || 'AM';
  document.getElementById('dash-endTime').value = vendorData.endTime || '';
  document.getElementById('dash-endPeriod').value = vendorData.endPeriod || 'PM';
  document.getElementById('dash-description').value = vendorData.description || '';
  document.getElementById('dash-specials').value = vendorData.specials || '';
  initializeDashAutocomplete();
}

updateProfileBtn.onclick = async () => {
  const userId = auth.currentUser.uid;
  try {
    const vendorDoc = await db.collection('vendors').doc(userId).get();
    if (!vendorDoc.data().approved) {
      alert("Your account must be approved to edit your profile.");
      return;
    }
    const place = dashAutocomplete.getPlace();
    let address = document.getElementById('dash-address').value;
    let coords = { latitude: null, longitude: null };
    if (place && place.geometry) {
      address = place.formatted_address;
      coords.latitude = place.geometry.location.lat();
      coords.longitude = place.geometry.location.lng();
    } else {
      const existingData = vendorDoc.data();
      coords.latitude = existingData.latitude;
      coords.longitude = existingData.longitude;
    }
    const updatedData = {
      name: document.getElementById('dash-name').value,
      foodType: document.getElementById('dash-foodType').value,
      contact: document.getElementById('dash-contact').value,
      address,
      latitude: coords.latitude,
      longitude: coords.longitude,
      startTime: document.getElementById('dash-startTime').value,
      startPeriod: document.getElementById('dash-startPeriod').value,
      endTime: document.getElementById('dash-endTime').value,
      endPeriod: document.getElementById('dash-endPeriod').value,
      specials: document.getElementById('dash-specials').value,
      description: document.getElementById('dash-description').value,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('vendors').doc(userId).update(updatedData);
    const photos = document.getElementById('dash-photos').files;
    if (photos.length > 0) {
      const photoUrls = await uploadPhotos(photos, userId);
      await db.collection('vendors').doc(userId).update({
        productPhotos: firebase.firestore.FieldValue.arrayUnion(...photoUrls)
      });
      const pinDoc = await db.collection('pins').doc(userId).get();
      if (pinDoc.exists && pinDoc.data().live) {
        await db.collection('pins').doc(userId).update({
          productPhotos: firebase.firestore.FieldValue.arrayUnion(...photoUrls),
          ...updatedData
        });
      }
    }
    console.log("Profile updated for:", userId);
    alert("Profile updated successfully!");
  } catch (error) {
    console.error("Profile update failed:", error);
    alert("Error: " + error.message);
  }
};

logoutBtn.onclick = async () => {
  await auth.signOut();
  console.log("User logged out");
  dashboard.style.display = 'none';
};

// Search and Filter logic
const truckSearch = document.getElementById('truck-search');
const foodTypeFilter = document.getElementById('food-type-filter');
const statusFilter = document.getElementById('status-filter');
let allPins = [];

function loadPins() {
  db.collection('pins').onSnapshot(snapshot => {
    allPins = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateTruckList();
  });

  db.collection('pins').get().then(snapshot => {
    const foodTypes = [...new Set(snapshot.docs.map(doc => doc.data().foodType))];
    foodTypes.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      foodTypeFilter.appendChild(option);
    });
  });
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function updateTruckList() {
  const searchQuery = truckSearch.value.toLowerCase();
  const foodType = foodTypeFilter.value;
  const status = statusFilter.value;

  const filteredPins = allPins.filter(pin => {
    const matchesSearch = pin.name.toLowerCase().includes(searchQuery) || pin.description.toLowerCase().includes(searchQuery);
    const matchesFoodType = !foodType || pin.foodType === foodType;
    const matchesStatus = !status || (status === 'live' ? pin.live : !pin.live);
    return matchesSearch && matchesFoodType && matchesStatus;
  });

  const truckList = document.getElementById('truck-list');
  truckList.innerHTML = '';
  console.log("Filtered pins for truck list:", filteredPins);

  filteredPins.forEach(pin => {
    if (!pin.startTime || !pin.endTime || !pin.startPeriod || !pin.endPeriod) {
      console.log(`Skipping ${pin.name || 'unnamed pin'} due to missing time fields:`, pin);
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

    console.log(`Checking ${pin.name}: Now=${currentHours}, Start=${startHours}, End=${endHours}`);

    if (currentHours >= startHours && currentHours <= endHours) {
      const card = document.createElement('div');
      card.className = `truck-card ${pin.live ? 'live' : ''}`;
      card.innerHTML = `
        <h3>${pin.name}</h3>
        <p>${pin.foodType} • ${pin.live ? 'Live Now' : 'Offline'}</p>
      `;
      card.onclick = () => showBusinessPage(pin);
      truckList.appendChild(card);
    } else {
      console.log(`${pin.name} excluded from list due to hours`);
    }
  });

  clusterGroup.clearLayers();
  filteredPins.forEach(pin => {
    if (pin.latitude && pin.longitude) {
      console.log(`Adding marker for ${pin.name} at ${pin.latitude}, ${pin.longitude}`);
      const marker = L.marker([pin.latitude, pin.longitude], { icon: foodTruckIcon })
        .bindPopup(`<b>${pin.name}</b><br>${pin.description}`)
        .on('click', () => showBusinessPage(pin));
      clusterGroup.addLayer(marker);
    } else {
      console.log(`No valid coords for ${pin.name}: lat=${pin.latitude}, lng=${pin.longitude}`);
    }
  });
  if (clusterGroup.getLayers().length > 0) {
    map.fitBounds(clusterGroup.getBounds().pad(0.1));
  }
}

truckSearch.oninput = debounce(updateTruckList, 300);
foodTypeFilter.onchange = updateTruckList;
statusFilter.onchange = updateTruckList;

// Business page with ratings and sharing
async function showBusinessPage(pin) {
  document.getElementById('page-name').textContent = pin.name;
  document.getElementById('page-foodType').textContent = `Food Type: ${pin.foodType}`;
  document.getElementById('page-contact').textContent = `Contact: ${pin.contact}`;
  document.getElementById('page-address').textContent = `Address: ${pin.address}`;
  document.getElementById('page-hours').textContent = `Hours: ${pin.startTime} ${pin.startPeriod} - ${pin.endTime} ${pin.endPeriod}`;
  document.getElementById('page-description').textContent = `Description: ${pin.description}`;
  document.getElementById('page-specials').textContent = `Specials: ${pin.specials}`;
  const photosDiv = document.getElementById('page-photos');
  photosDiv.innerHTML = '';
  if (pin.productPhotos && pin.productPhotos.length > 0) {
    pin.productPhotos.forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.loading = 'lazy';
      photosDiv.appendChild(img);
    });
  }
  const businessPage = document.getElementById('business-page');
  let ratingHTML = `
    <div class="rating">
      <label>Rate:</label>
      <select id="rating">
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
      </select>
      <button id="submit-rating">Submit</button>
    </div>
  `;
  businessPage.innerHTML += `
    ${ratingHTML}
    <button onclick="shareOnX('${pin.name}')">Share on X</button>
    <button onclick="markVisited('${pin.id}')">Mark as Visited</button>
  `;
  
  const submitBtn = document.getElementById('submit-rating');
  if (!auth.currentUser) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Login as Customer to Rate";
  } else {
    const customerDoc = await db.collection('customers').doc(auth.currentUser.uid).get();
    if (!customerDoc.exists) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Customer Account Required";
    } else {
      const userId = auth.currentUser.uid;
      const existingReview = await db.collection('ratings').where('pinId', '==', pin.id).where('userId', '==', userId).get();
      if (!existingReview.empty) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Already Rated";
      } else {
        submitBtn.onclick = () => submitRating(pin.id);
      }
    }
  }
  businessPage.style.display = 'block';
}

function closeBusinessPage() {
  document.getElementById('business-page').style.display = 'none';
}

async function submitRating(pinId) {
  if (!auth.currentUser) {
    alert("Please log in as a customer to submit a rating.");
    return;
  }
  const userId = auth.currentUser.uid;
  const customerDoc = await db.collection('customers').doc(userId).get();
  if (!customerDoc.exists) {
    alert("Only customers can submit ratings.");
    return;
  }
  const existingReview = await db.collection('ratings').where('pinId', '==', pinId).where('userId', '==', userId).get();
  if (!existingReview.empty) {
    alert("You have already rated this truck.");
    return;
  }
  const rating = document.getElementById('rating').value;
  try {
    await db.collection('ratings').add({
      pinId,
      userId,
      rating: parseInt(rating),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("Rating submitted for pin:", pinId);
    alert("Rating submitted successfully!");
    document.getElementById('submit-rating').disabled = true;
    document.getElementById('submit-rating').textContent = "Already Rated";
  } catch (error) {
    console.error("Rating submission failed:", error);
    alert("Error submitting rating: " + error.message);
  }
}

async function markVisited(pinId) {
  if (!auth.currentUser) {
    alert("Please log in as a customer to mark a visit.");
    return;
  }
  const userId = auth.currentUser.uid;
  const customerDoc = await db.collection('customers').doc(userId).get();
  if (!customerDoc.exists) {
    alert("Only customers can mark visits.");
    return;
  }
  const visitedTrucks = customerDoc.data().visitedTrucks || [];
  if (!visitedTrucks.includes(pinId)) {
    visitedTrucks.push(pinId);
    await db.collection('customers').doc(userId).update({
      visitedTrucks: visitedTrucks
    });
    console.log("Truck marked as visited:", pinId);
    loadVisitedTrucks(userId);
  }
}

async function loadVisitedTrucks(userId) {
  const customerDoc = await db.collection('customers').doc(userId).get();
  if (!customerDoc.exists) return;
  const visitedTrucks = customerDoc.data().visitedTrucks || [];
  const visitedList = document.getElementById('visited-list');
  visitedList.innerHTML = '';
  if (visitedTrucks.length > 0) {
    document.getElementById('visited-trucks').style.display = 'block';
    for (const pinId of visitedTrucks) {
      const pinDoc = await db.collection('pins').doc(pinId).get();
      if (pinDoc.exists) {
        const li = document.createElement('li');
        li.textContent = pinDoc.data().name;
        visitedList.appendChild(li);
      }
    }
  } else {
    document.getElementById('visited-trucks').style.display = 'none';
  }
}

function shareOnX(name) {
  const url = window.location.href;
  window.open(`https://x.com/intent/tweet?text=Check out ${name} on Streats Live!&url=${url}`, '_blank');
}

async function uploadPhotos(files, pinId) {
  const photoUrls = [];
  for (const file of files) {
    const ref = storage.ref().child(`pins/${pinId}/${Date.now()}_${file.name}`);
    console.log("Attempting to upload file:", file.name);
    try {
      const snapshot = await ref.put(file);
      const url = await snapshot.ref.getDownloadURL();
      photoUrls.push(url);
      console.log("Successfully uploaded photo:", url);
    } catch (error) {
      console.error("Failed to upload photo:", file.name, error);
      throw error;
    }
  }
  return photoUrls;
}

// Error handling
window.onerror = (msg, url, lineNo, columnNo, error) => {
  console.error(`Unhandled error: ${msg} at ${url}:${lineNo}:${columnNo}`, error);
};
