console.log("Script.js loaded at:", new Date().toLocaleString());

const firebaseConfig = {
  apiKey: "AIzaSyDFRyLHLDumJpteFlannZMcEX3l8VpuQlM",
  authDomain: "streats-site.firebaseapp.com",
  projectId: "streats-site",
  storageBucket: "streats-site.firebasestorage.app",
  messagingSenderId: "435856449927",
  appId: "1:435856449927:web:021d6dae14a84320627322",
};

let db, storage, auth, map, clusterGroup, allPins = [], userCoords = { lat: 51.505, lng: -0.09 };
const foodTruckIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1048/1048313.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38]
});
let vendorSignupMode = true, customerSignupMode = true;
const PRICE_MARKUP = 1.15;

// Initialize Firebase
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

// Initialize map
function initMap() {
  map = L.map('map').setView([userCoords.lat, userCoords.lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
  }).addTo(map);
  clusterGroup = L.markerClusterGroup();
  map.addLayer(clusterGroup);
}

navigator.geolocation.getCurrentPosition(position => {
  userCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
  console.log("Geolocation success:", userCoords.lat, userCoords.lng);
  initMap();
  loadPins();
}, () => {
  console.log("Geolocation failed, using fallback location");
  initMap();
  loadPins();
});

// UI Helpers
function showLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  overlay.classList.remove('hidden');
  overlay.classList.add('active');
  document.getElementById('main-content').classList.add('hidden');
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  overlay.classList.remove('active');
  setTimeout(() => {
    overlay.classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
  }, 300);
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
  hideLoadingOverlay();
}

// Auth handling
document.getElementById('vendor-btn').onclick = () => {
  showLoadingOverlay();
  if (auth.currentUser) {
    db.collection('vendors').doc(auth.currentUser.uid).get().then(doc => {
      if (doc.exists && doc.data().approved) {
        showVendorDashboard(doc.data());
      } else {
        document.getElementById('vendor-modal').classList.remove('hidden');
        updateVendorAuthMode();
      }
      hideLoadingOverlay();
    }).catch(error => {
      console.error("Error fetching vendor data:", error);
      hideLoadingOverlay();
    });
  } else {
    document.getElementById('vendor-modal').classList.remove('hidden');
    updateVendorAuthMode();
    hideLoadingOverlay();
  }
};

document.getElementById('customer-btn').onclick = () => {
  showLoadingOverlay();
  document.getElementById('customer-modal').classList.remove('hidden');
  updateCustomerAuthMode();
  hideLoadingOverlay();
};

function updateVendorAuthMode() {
  document.getElementById('vendor-title').textContent = vendorSignupMode ? "Vendor Sign Up" : "Vendor Login";
  document.getElementById('vendor-signup-fields').classList.toggle('hidden', !vendorSignupMode);
  document.getElementById('vendor-submit').textContent = vendorSignupMode ? "Sign Up" : "Login";
  document.getElementById('vendor-toggle').innerHTML = vendorSignupMode
    ? 'Already have an account? <a href="#" onclick="toggleVendorAuthMode()" class="text-pink-600">Login</a>'
    : 'Need an account? <a href="#" onclick="toggleVendorAuthMode()" class="text-pink-600">Sign Up</a>';
  if (vendorSignupMode) initializeVendorAutocomplete();
}

function updateCustomerAuthMode() {
  document.getElementById('customer-title').textContent = customerSignupMode ? "Foodie Sign Up" : "Foodie Login";
  document.getElementById('customer-signup-fields').classList.toggle('hidden', !customerSignupMode);
  document.getElementById('customer-submit').textContent = customerSignupMode ? "Sign Up" : "Login";
  document.getElementById('customer-toggle').innerHTML = customerSignupMode
    ? 'Already have an account? <a href="#" onclick="toggleCustomerAuthMode()" class="text-pink-600">Login</a>'
    : 'Need an account? <a href="#" onclick="toggleCustomerAuthMode()" class="text-pink-600">Sign Up</a>';
}

function toggleVendorAuthMode() {
  vendorSignupMode = !vendorSignupMode;
  updateVendorAuthMode();
  event.preventDefault();
}

function toggleCustomerAuthMode() {
  customerSignupMode = !customerSignupMode;
  updateCustomerAuthMode();
  event.preventDefault();
}

let vendorAutocomplete, dashAutocomplete, locationAutocomplete;
function initializeVendorAutocomplete() {
  const input = document.getElementById('vendor-address');
  if (!input) return;
  vendorAutocomplete = new google.maps.places.Autocomplete(input, {
    types: ['address'],
    componentRestrictions: { country: 'us' },
    fields: ['formatted_address', 'geometry.location']
  });
  vendorAutocomplete.addListener('place_changed', () => {
    const place = vendorAutocomplete.getPlace();
    if (place.geometry) {
      document.getElementById('vendor-address-preview').textContent = `Selected: ${place.formatted_address}`;
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
    }
  });
}

function initializeLocationAutocomplete() {
  const input = document.getElementById('location-filter');
  if (!input) return;
  locationAutocomplete = new google.maps.places.Autocomplete(input, {
    types: ['geocode'],
    componentRestrictions: { country: 'us' },
    fields: ['formatted_address', 'geometry.location']
  });
  locationAutocomplete.addListener('place_changed', () => {
    const place = locationAutocomplete.getPlace();
    if (place.geometry) {
      userCoords = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
      map.setView([userCoords.lat, userCoords.lng], 13);
      updateTruckList();
    }
  });
}

document.getElementById('vendor-submit').onclick = async () => {
  showLoadingOverlay();
  const email = document.getElementById('vendor-email').value;
  const password = document.getElementById('vendor-password').value;
  try {
    let user;
    if (vendorSignupMode) {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      user = userCredential.user;
      const place = vendorAutocomplete.getPlace();
      if (!place || !place.geometry) throw new Error("Please select an address from the dropdown");
      const address = place.formatted_address;
      const coords = { latitude: place.geometry.location.lat(), longitude: place.geometry.location.lng() };
      const vendorData = {
        email,
        name: document.getElementById('vendor-name').value,
        bio: document.getElementById('vendor-bio').value,
        phone: document.getElementById('vendor-phone').value,
        foodType: document.getElementById('vendor-foodType').value,
        contact: document.getElementById('vendor-contact').value,
        address,
        latitude: coords.latitude,
        longitude: coords.longitude,
        startTime: document.getElementById('vendor-startTime').value,
        startPeriod: document.getElementById('vendor-startPeriod').value,
        endTime: document.getElementById('vendor-endTime').value,
        endPeriod: document.getElementById('vendor-endPeriod').value,
        description: document.getElementById('vendor-description').value,
        specials: document.getElementById('vendor-specials').value,
        approved: false,
        productPhotos: [],
        menu: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection('vendors').doc(user.uid).set(vendorData);
      await uploadInitialPhotos(user.uid, 'vendor-photos');
    } else {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      user = userCredential.user;
      const vendorDoc = await db.collection('vendors').doc(user.uid).get();
      if (vendorDoc.exists && vendorDoc.data().approved) {
        showVendorDashboard(vendorDoc.data());
      }
    }
    document.getElementById('vendor-modal').classList.add('hidden');
  } catch (error) {
    console.error("Vendor auth failed:", error);
    alert("Error: " + error.message);
  }
  hideLoadingOverlay();
};

document.getElementById('customer-submit').onclick = async () => {
  showLoadingOverlay();
  const email = document.getElementById('customer-email').value;
  const password = document.getElementById('customer-password').value;
  try {
    if (customerSignupMode) {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      const customerData = {
        email,
        name: document.getElementById('customer-name').value,
        points: 0,
        badges: [],
        coupons: {},
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection('customers').doc(user.uid).set(customerData);
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
    document.getElementById('customer-modal').classList.add('hidden');
  } catch (error) {
    console.error("Customer auth failed:", error);
    alert("Error: " + error.message);
  }
  hideLoadingOverlay();
};

auth.onAuthStateChanged(async user => {
  showLoadingOverlay();
  const logoutBtn = document.getElementById('logout');
  const vendorBtn = document.getElementById('vendor-btn');
  const customerBtn = document.getElementById('customer-btn');
  if (user) {
    logoutBtn.classList.remove('hidden');
    const vendorDoc = await db.collection('vendors').doc(user.uid).get();
    const customerDoc = await db.collection('customers').doc(user.uid).get();
    if (vendorDoc.exists) {
      vendorBtn.textContent = vendorDoc.data().approved ? "Dashboard" : "Vendor Portal (Pending Approval)";
      if (vendorDoc.data().approved) {
        document.getElementById('vendor-modal').classList.add('hidden');
        showVendorDashboard(vendorDoc.data());
      }
    } else {
      vendorBtn.textContent = "Become a Vendor";
    }
    customerBtn.textContent = customerDoc.exists ? "Foodie Hub" : "Join as Foodie";
  } else {
    logoutBtn.classList.add('hidden');
    vendorBtn.textContent = "Vendor Portal";
    customerBtn.textContent = "Foodie Hub";
    document.getElementById('vendor-dashboard').classList.add('hidden');
  }
  initializeLocationAutocomplete();
  hideLoadingOverlay();
});

document.getElementById('logout').onclick = async () => {
  showLoadingOverlay();
  await auth.signOut();
  console.log("User logged out");
  hideLoadingOverlay();
};

async function loadPins() {
  db.collection('pins').onSnapshot(async snapshot => {
    allPins = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    for (let pin of allPins) {
      const ratings = await db.collection('ratings').where('pinId', '==', pin.id).get();
      const ratingCount = ratings.size;
      const avgRating = ratingCount ? ratings.docs.reduce((sum, doc) => sum + doc.data().rating, 0) / ratingCount : 0;
      pin.ratingCount = ratingCount;
      pin.avgRating = avgRating.toFixed(1);
    }
    updateTruckList();
  });

  db.collection('pins').get().then(snapshot => {
    const foodTypes = [...new Set(snapshot.docs.map(doc => doc.data().foodType))];
    const filter = document.getElementById('food-type-filter');
    filter.innerHTML = '<option value="">All Food Types</option>';
    foodTypes.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      filter.appendChild(option);
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
  const searchQuery = document.getElementById('truck-search').value.toLowerCase();
  const foodType = document.getElementById('food-type-filter').value;
  const status = document.getElementById('status-filter').value;

  const filteredPins = allPins.filter(pin => {
    const matchesSearch = pin.name.toLowerCase().includes(searchQuery) || pin.description.toLowerCase().includes(searchQuery);
    const matchesFoodType = !foodType || pin.foodType === foodType;
    const matchesStatus = !status || (status === 'live' ? pin.live : !pin.live);
    const distance = getDistance(userCoords.lat, userCoords.lng, pin.latitude, pin.longitude);
    return matchesSearch && matchesFoodType && matchesStatus && distance < 50;
  });

  const truckList = document.getElementById('truck-list');
  truckList.innerHTML = '';
  filteredPins.forEach(pin => {
    if (!pin.startTime || !pin.endTime || !pin.startPeriod || !pin.endPeriod) return;
    const now = new Date();
    let currentHours = now.getHours() + now.getMinutes() / 60;
    let startHours = parseInt(pin.startTime.split(':')[0]) + parseInt(pin.startTime.split(':')[1]) / 60;
    let endHours = parseInt(pin.endTime.split(':')[0]) + parseInt(pin.endTime.split(':')[1]) / 60;
    if (pin.startPeriod === 'PM' && startHours < 12) startHours += 12;
    if (pin.startPeriod === 'AM' && startHours === 12) startHours = 0;
    if (pin.endPeriod === 'PM' && endHours < 12) endHours += 12;
    if (pin.endPeriod === 'AM' && endHours === 12) endHours = 0;

    if (currentHours >= startHours && currentHours <= endHours) {
      const card = document.createElement('div');
      card.className = `truck-card bg-white shadow-md ${pin.live ? 'border-t-4 border-pink-500' : ''}`;
      card.innerHTML = `
        <img src="${pin.productPhotos?.[0] || 'https://placehold.co/300x150'}" alt="${pin.name}" class="w-full h-40 object-cover">
        <div class="p-4">
          <h3 class="text-xl font-semibold text-gray-900">${pin.name}</h3>
          <p class="text-gray-600">${pin.foodType} • ${pin.live ? 'Live Now' : 'Offline'}</p>
          <p class="text-pink-600 font-medium">${pin.avgRating || 'No'} ★ (${pin.ratingCount || 0} reviews)</p>
        </div>
      `;
      card.onclick = () => showBusinessPage(pin);
      truckList.appendChild(card);
    }
  });

  clusterGroup.clearLayers();
  filteredPins.forEach(pin => {
    if (pin.latitude && pin.longitude) {
      const marker = L.marker([pin.latitude, pin.longitude], { icon: foodTruckIcon })
        .bindPopup(`<b>${pin.name}</b><br>${pin.description}<br>${pin.avgRating || 'No'} ★ (${pin.ratingCount || 0} reviews)`)
        .on('click', () => showBusinessPage(pin));
      clusterGroup.addLayer(marker);
    }
  });
  if (clusterGroup.getLayers().length > 0) map.fitBounds(clusterGroup.getBounds().pad(0.1));
}

document.getElementById('truck-search').oninput = debounce(updateTruckList, 300);
document.getElementById('food-type-filter').onchange = updateTruckList;
document.getElementById('status-filter').onchange = updateTruckList;

async function showBusinessPage(pin) {
  showLoadingOverlay();
  const businessPage = document.getElementById('business-page');
  const actions = document.getElementById('business-actions');
  document.getElementById('page-name').textContent = pin.name;
  document.getElementById('page-foodType').textContent = `Food Type: ${pin.foodType}`;
  document.getElementById('page-hours').textContent = `Hours: ${pin.startTime} ${pin.startPeriod} - ${pin.endTime} ${pin.endPeriod}`;
  document.getElementById('page-description').textContent = pin.description;
  document.getElementById('page-specials').textContent = `Specials: ${pin.specials}`;
  document.getElementById('page-vendor-name').textContent = `Vendor: ${pin.name}`;
  document.getElementById('page-vendor-bio').textContent = pin.bio || "No bio provided.";
  document.getElementById('page-vendor-phone').textContent = `Phone: ${pin.phone || 'N/A'}`;
  const photosDiv = document.getElementById('page-photos');
  photosDiv.innerHTML = '';
  if (pin.productPhotos && pin.productPhotos.length > 0) {
    pin.productPhotos.forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.className = 'w-full h-32 object-cover rounded-lg';
      img.loading = 'lazy';
      photosDiv.appendChild(img);
    });
  }

  const menuDiv = document.getElementById('page-menu');
  menuDiv.innerHTML = '';
  if (pin.menu && pin.menu.length > 0) {
    pin.menu.forEach((item, index) => {
      const adjustedPrice = (item.price * PRICE_MARKUP).toFixed(2);
      const div = document.createElement('div');
      div.className = 'flex justify-between items-center';
      div.innerHTML = `
        <p class="text-gray-900">${item.name}</p>
        <div class="flex items-center space-x-2">
          <p class="text-gray-600">$${adjustedPrice}</p>
          <select id="cart-quantity-${index}" class="w-20">
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </div>
      `;
      menuDiv.appendChild(div);
    });
  } else {
    menuDiv.innerHTML = '<p class="text-gray-600">No menu available yet.</p>';
  }

  actions.innerHTML = auth.currentUser ? `
    <div class="rating space-y-4">
      <label class="text-gray-700 font-medium">Rate this truck</label>
      <select id="rating" class="w-full">
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
      </select>
      <textarea id="comment" placeholder="Tell us about your experience" rows="3" class="w-full"></textarea>
      <button id="submit-rating" class="btn-primary w-full">Submit Review</button>
    </div>
    <button onclick="showVisitModal('${pin.id}', '${pin.name}')" class="btn-primary w-full">Mark as Visited</button>
    <button onclick="showOrderModal('${pin.id}', '${pin.name}', '${JSON.stringify(pin.menu)}')" class="btn-primary w-full">Order Now</button>
  ` : `
    <p class="text-gray-600">Log in to leave a review, mark as visited, or order.</p>
    <button onclick="document.getElementById('customer-modal').classList.remove('hidden'); updateCustomerAuthMode()" class="btn-primary w-full">Log In</button>
  `;

  if (auth.currentUser) {
    const customerDoc = await db.collection('customers').doc(auth.currentUser.uid).get();
    if (customerDoc.exists) {
      const existingReview = await db.collection('ratings').where('pinId', '==', pin.id).where('userId', '==', auth.currentUser.uid).get();
      const submitBtn = document.getElementById('submit-rating');
      if (!existingReview.empty) {
        submitBtn.disabled = true;
        submitBtn.textContent = "You’ve Already Reviewed";
      } else {
        submitBtn.onclick = () => submitRating(pin.id);
      }
    }
  }

  document.getElementById('view-reviews').onclick = () => showReviews(pin);
  businessPage.classList.remove('hidden');
  hideLoadingOverlay();
}

function closeBusinessPage() {
  closeModal('business-page');
}

async function submitRating(pinId) {
  if (!auth.currentUser) return alert("Please log in as a customer to submit a rating.");
  const userId = auth.currentUser.uid;
  const customerDoc = await db.collection('customers').doc(userId).get();
  if (!customerDoc.exists) return alert("Only customers can submit ratings.");
  const existingReview = await db.collection('ratings').where('pinId', '==', pinId).where('userId', '==', userId).get();
  if (!existingReview.empty) return alert("You have already rated this truck.");
  const rating = document.getElementById('rating').value;
  const comment = document.getElementById('comment').value;
  try {
    await db.collection('ratings').add({
      pinId,
      userId,
      rating: parseInt(rating),
      comment: comment || "No comment provided.",
      reviewerName: customerDoc.data().name,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Review submitted successfully!");
    document.getElementById('submit-rating').disabled = true;
    document.getElementById('submit-rating').textContent = "You’ve Already Reviewed";
  } catch (error) {
    console.error("Rating submission failed:", error);
    alert("Error submitting rating: " + error.message);
  }
}

async function showReviews(pin) {
  showLoadingOverlay();
  const reviewsModal = document.getElementById('reviews-modal');
  const reviewList = document.getElementById('review-list');
  document.getElementById('review-truck-name').textContent = pin.name;
  reviewList.innerHTML = '';

  const reviews = await db.collection('ratings').where('pinId', '==', pin.id).orderBy('createdAt', 'desc').get();
  if (reviews.empty) {
    reviewList.innerHTML = '<p class="text-gray-600">No reviews yet.</p>';
  } else {
    reviews.forEach(doc => {
      const data = doc.data();
      const reviewDiv = document.createElement('div');
      reviewDiv.className = 'border-b border-gray-200 pb-4';
      reviewDiv.innerHTML = `
        <div class="flex items-center mb-2">
          <p class="text-pink-600 font-semibold">${data.rating} ★</p>
          <p class="text-gray-600 ml-2">${data.reviewerName}</p>
        </div>
        <p class="text-gray-700">${data.comment}</p>
      `;
      reviewList.appendChild(reviewDiv);
    });
  }
  reviewsModal.classList.remove('hidden');
  hideLoadingOverlay();
}

async function showVisitModal(pinId, truckName) {
  showLoadingOverlay();
  document.getElementById('visit-truck-name').textContent = truckName;
  document.getElementById('submit-visit').onclick = () => markVisited(pinId);
  document.getElementById('visit-modal').classList.remove('hidden');
  hideLoadingOverlay();
}

async function markVisited(pinId) {
  if (!auth.currentUser) return alert("Please log in as a customer to mark a visit.");
  const userId = auth.currentUser.uid;
  const customerDoc = await db.collection('customers').doc(userId).get();
  if (!customerDoc.exists) return alert("Only customers can mark visits.");
  const visitRef = db.collection('customers').doc(userId).collection('visits').doc(pinId);
  const visitDoc = await visitRef.get();

  if (visitDoc.exists) {
    alert("You’ve already earned points for visiting this truck.");
    return;
  }

  const receiptFile = document.getElementById('visit-receipt').files[0];
  if (!receiptFile) {
    const lastOrder = await db.collection('orders').where('userId', '==', userId).where('pinId', '==', pinId).orderBy('createdAt', 'desc').limit(1).get();
    if (lastOrder.empty) return alert("Please upload a receipt or order via the app to verify your visit.");
  }

  let receiptUrl = null;
  if (receiptFile) {
    const ref = storage.ref().child(`receipts/${userId}/${pinId}/${Date.now()}_${receiptFile.name}`);
    await ref.put(receiptFile);
    receiptUrl = await ref.getDownloadURL();
  }

  await visitRef.set({
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    pinId,
    receiptUrl
  });

  const visitedTrucks = customerDoc.data().visitedTrucks || {};
  visitedTrucks[pinId] = (visitedTrucks[pinId] || 0) + 1;
  const points = customerDoc.data().points || 0;
  const newPoints = points + 20;
  let badges = customerDoc.data().badges || [];
  const totalVisits = Object.keys(visitedTrucks).length;
  if (totalVisits >= 30 && !badges.includes("Foodie Legend")) badges.push("Foodie Legend");
  else if (totalVisits >= 15 && !badges.includes("Street Food Star")) badges.push("Street Food Star");
  else if (totalVisits >= 5 && !badges.includes("Truck Tracker")) badges.push("Truck Tracker");

  let coupons = customerDoc.data().coupons || {};
  if (totalVisits >= 15 && !coupons[pinId]) coupons[pinId] = { redeemed: false, offer: "10% off next visit" };

  await db.collection('customers').doc(userId).update({ visitedTrucks, points: newPoints, badges, coupons });
  alert("Visit marked successfully! +20 points");
  closeModal('visit-modal');
}

async function showOrderModal(pinId, truckName, menuJson) {
  showLoadingOverlay();
  const orderModal = document.getElementById('order-modal');
  const orderMenu = document.getElementById('order-menu');
  document.getElementById('order-truck-name').textContent = truckName;
  orderMenu.innerHTML = '';

  const menu = JSON.parse(menuJson);
  if (menu && menu.length > 0) {
    menu.forEach((item, index) => {
      const adjustedPrice = (item.price * PRICE_MARKUP).toFixed(2);
      const div = document.createElement('div');
      div.className = 'flex justify-between items-center';
      div.innerHTML = `
        <p class="text-gray-900">${item.name} - $${adjustedPrice}</p>
        <select id="order-quantity-${index}" class="w-20">
          <option value="0">0</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
      `;
      orderMenu.appendChild(div);
    });
  } else {
    orderMenu.innerHTML = '<p class="text-gray-600">No menu items available.</p>';
  }

  document.getElementById('place-order').onclick = () => placeOrder(pinId, truckName, menu);
  orderModal.classList.remove('hidden');
  hideLoadingOverlay();
}

async function placeOrder(pinId, truckName, menu) {
  if (!auth.currentUser) return alert("Please log in as a customer to place an order.");
  const userId = auth.currentUser.uid;
  const customerDoc = await db.collection('customers').doc(userId).get();
  if (!customerDoc.exists) return alert("Only customers can place orders.");

  const orderItems = menu.map((item, index) => {
    const quantity = parseInt(document.getElementById(`order-quantity-${index}`)?.value) || parseInt(document.getElementById(`cart-quantity-${index}`).value);
    return quantity > 0 ? { name: item.name, price: item.price * PRICE_MARKUP, quantity } : null;
  }).filter(item => item);

  if (orderItems.length === 0) return alert("Please select at least one item to order.");

  const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);
  const order = {
    pinId,
    truckName,
    userId,
    customerName: customerDoc.data().name,
    items: orderItems,
    total,
    status: 'pending',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  const orderRef = await db.collection('orders').add(order);
  await db.collection('customers').doc(userId).update({
    points: firebase.firestore.FieldValue.increment(10),
    lastOrderId: orderRef.id
  });
  alert(`Order placed successfully! Total: $${total} (+10 points)`);
  closeModal('order-modal');
}

function addMenuItem() {
  const menuItems = document.getElementById('menu-items');
  const div = document.createElement('div');
  div.className = 'flex space-x-4 mb-4';
  div.innerHTML = `
    <input type="text" placeholder="Item Name" class="menu-name flex-1">
    <input type="number" placeholder="Price ($)" class="menu-price w-1/3" step="0.01">
  `;
  menuItems.appendChild(div);
}

function showVendorDashboard(vendorData) {
  showLoadingOverlay();
  const dashboard = document.getElementById('vendor-dashboard');
  document.getElementById('dash-name').value = vendorData.name || '';
  document.getElementById('dash-bio').value = vendorData.bio || '';
  document.getElementById('dash-phone').value = vendorData.phone || '';
  document.getElementById('dash-foodType').value = vendorData.foodType || '';
  document.getElementById('dash-contact').value = vendorData.contact || '';
  document.getElementById('dash-address').value = vendorData.address || '';
  document.getElementById('dash-startTime').value = vendorData.startTime || '';
  document.getElementById('dash-startPeriod').value = vendorData.startPeriod || 'AM';
  document.getElementById('dash-endTime').value = vendorData.endTime || '';
  document.getElementById('dash-endPeriod').value = vendorData.endPeriod || 'PM';
  document.getElementById('dash-description').value = vendorData.description || '';
  document.getElementById('dash-specials').value = vendorData.specials || '';
  const menuItems = document.getElementById('menu-items');
  menuItems.innerHTML = '';
  (vendorData.menu || []).forEach(item => {
    const div = document.createElement('div');
    div.className = 'flex space-x-4 mb-4';
    div.innerHTML = `
      <input type="text" value="${item.name}" class="menu-name flex-1">
      <input type="number" value="${item.price}" class="menu-price w-1/3" step="0.01">
    `;
    menuItems.appendChild(div);
  });
  db.collection('pins').doc(auth.currentUser.uid).get().then(doc => {
    document.getElementById('live-toggle').textContent = doc.exists && doc.data().live ? "Go Offline" : "Go Live";
  });
  document.getElementById('live-toggle').onclick = () => toggleLiveStatus(auth.currentUser.uid, vendorData.live);
  document.getElementById('update-profile').onclick = () => updateVendorProfile(auth.currentUser.uid);
  initializeDashAutocomplete();
  dashboard.classList.remove('hidden');
  hideLoadingOverlay();
}

async function toggleLiveStatus(userId, isLive) {
  const vendorDoc = await db.collection('vendors').doc(userId).get();
  const vendorData = vendorDoc.data();
  if (!vendorData.approved) return alert("Your account must be approved to go live.");
  if (isLive) {
    await db.collection('pins').doc(userId).delete();
    document.getElementById('live-toggle').textContent = "Go Live";
  } else {
    await db.collection('pins').doc(userId).set({
      ...vendorData,
      live: true,
      latitude: vendorData.latitude,
      longitude: vendorData.longitude,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('live-toggle').textContent = "Go Offline";
  }
}

async function updateVendorProfile(userId) {
  try {
    const vendorDoc = await db.collection('vendors').doc(userId).get();
    if (!vendorDoc.data().approved) return alert("Your account must be approved to edit.");
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
    const menuItems = Array.from(document.querySelectorAll('#menu-items .flex')).map(item => ({
      name: item.querySelector('.menu-name').value,
      price: parseFloat(item.querySelector('.menu-price').value) || 0
    })).filter(item => item.name && item.price > 0);
    const updatedData = {
      name: document.getElementById('dash-name').value,
      bio: document.getElementById('dash-bio').value,
      phone: document.getElementById('dash-phone').value,
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
      menu: menuItems,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('vendors').doc(userId).update(updatedData);
    const photos = document.getElementById('dash-photos').files;
    if (photos.length > 0) {
      const photoUrls = await uploadInitialPhotos(userId, 'dash-photos');
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
    alert("Profile updated successfully!");
  } catch (error) {
    console.error("Profile update failed:", error);
    alert("Error: " + error.message);
  }
}

async function uploadInitialPhotos(userId, inputId) {
  const photos = document.getElementById(inputId).files;
  const photoUrls = [];
  for (const file of photos) {
    const ref = storage.ref().child(`photos/${userId}/${Date.now()}_${file.name}`);
    await ref.put(file);
    const url = await ref.getDownloadURL();
    photoUrls.push(url);
  }
  return photoUrls;
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}
