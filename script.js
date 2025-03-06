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

let map, clusterGroup, allPins = [];
const foodTruckIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1048/1048313.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38]
});
let vendorSignupMode = true, customerSignupMode = true;
const PRICE_MARKUP = 1.15;

// Initialize map
navigator.geolocation.getCurrentPosition(position => {
  const { latitude, longitude } = position.coords;
  console.log("Geolocation success:", latitude, longitude);
  map = L.map('map').setView([latitude, longitude], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
  }).addTo(map);
  clusterGroup = L.markerClusterGroup();
  map.addLayer(clusterGroup);
  loadPins();
}, () => {
  console.log("Geolocation failed, using fallback location");
  map = L.map('map').setView([51.505, -0.09], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
  }).addTo(map);
  clusterGroup = L.markerClusterGroup();
  map.addLayer(clusterGroup);
  loadPins();
});

// Auth handling
document.getElementById('vendor-btn').onclick = () => {
  document.getElementById('vendor-modal').classList.remove('hidden');
  updateVendorAuthMode();
};

document.getElementById('customer-btn').onclick = () => {
  document.getElementById('customer-modal').classList.remove('hidden');
  updateCustomerAuthMode();
};

function updateVendorAuthMode() {
  document.getElementById('vendor-title').textContent = vendorSignupMode ? "Vendor Sign Up" : "Vendor Login";
  document.getElementById('vendor-signup-fields').classList.toggle('hidden', !vendorSignupMode);
  document.getElementById('vendor-submit').textContent = vendorSignupMode ? "Sign Up" : "Login";
  document.getElementById('vendor-toggle').innerHTML = vendorSignupMode
    ? 'Already have an account? <a href="#" onclick="toggleVendorAuthMode()" class="text-red-600">Login</a>'
    : 'Need an account? <a href="#" onclick="toggleVendorAuthMode()" class="text-red-600">Sign Up</a>';
  if (vendorSignupMode) initializeVendorAutocomplete();
}

function updateCustomerAuthMode() {
  document.getElementById('customer-title').textContent = customerSignupMode ? "Foodie Sign Up" : "Foodie Login";
  document.getElementById('customer-signup-fields').classList.toggle('hidden', !customerSignupMode);
  document.getElementById('customer-submit').textContent = customerSignupMode ? "Sign Up" : "Login";
  document.getElementById('customer-toggle').innerHTML = customerSignupMode
    ? 'Already have an account? <a href="#" onclick="toggleCustomerAuthMode()" class="text-red-600">Login</a>'
    : 'Need an account? <a href="#" onclick="toggleCustomerAuthMode()" class="text-red-600">Sign Up</a>';
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

let vendorAutocomplete, dashAutocomplete;
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

document.getElementById('vendor-submit').onclick = async () => {
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
      if (vendorDoc.exists && vendorDoc.data().approved) showVendorDashboard(vendorDoc.data());
    }
    document.getElementById('vendor-modal').classList.add('hidden');
  } catch (error) {
    console.error("Vendor auth failed:", error);
    alert("Error: " + error.message);
  }
};

document.getElementById('customer-submit').onclick = async () => {
  const email = document.getElementById('customer-email').value;
  const password = document.getElementById('customer-password').value;
  try {
    let user;
    if (customerSignupMode) {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      user = userCredential.user;
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
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      user = userCredential.user;
    }
    document.getElementById('customer-modal').classList.add('hidden');
  } catch (error) {
    console.error("Customer auth failed:", error);
    alert("Error: " + error.message);
  }
};

auth.onAuthStateChanged(async user => {
  const logoutBtn = document.getElementById('logout');
  if (user) {
    logoutBtn.classList.remove('hidden');
    const vendorDoc = await db.collection('vendors').doc(user.uid).get();
    const customerDoc = await db.collection('customers').doc(user.uid).get();
    if (!vendorDoc.exists) document.getElementById('vendor-btn').textContent = "Become a Vendor";
    if (!customerDoc.exists) document.getElementById('customer-btn').textContent = "Join as Foodie";
  } else {
    logoutBtn.classList.add('hidden');
    document.getElementById('vendor-btn').textContent = "Vendor Portal";
    document.getElementById('customer-btn').textContent = "Foodie Hub";
    document.getElementById('vendor-dashboard').classList.add('hidden');
  }
});

document.getElementById('logout').onclick = async () => {
  await auth.signOut();
  console.log("User logged out");
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
    return matchesSearch && matchesFoodType && matchesStatus;
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
      card.className = `truck-card bg-white shadow-md ${pin.live ? 'border-t-4 border-red-500' : ''}`;
      card.innerHTML = `
        <img src="${pin.productPhotos?.[0] || 'https://via.placeholder.com/300x150'}" alt="${pin.name}" class="w-full h-40 object-cover">
        <div class="p-4">
          <h3 class="text-xl font-semibold text-gray-900">${pin.name}</h3>
          <p class="text-gray-600">${pin.foodType} • ${pin.live ? 'Live Now' : 'Offline'}</p>
          <p class="text-red-600 font-medium">${pin.avgRating || 'No'} ★ (${pin.ratingCount || 0} reviews)</p>
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
  const businessPage = document.getElementById('business-page');
  const actions = document.getElementById('business-actions');
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
      img.className = 'w-full h-32 object-cover rounded-lg';
      img.loading = 'lazy';
      photosDiv.appendChild(img);
    });
  }

  actions.innerHTML = auth.currentUser ? `
    <div class="rating space-y-4">
      <label class="text-gray-700 font-medium">Rate:</label>
      <select id="rating" class="w-full">
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
      </select>
      <textarea id="comment" placeholder="Leave a comment about your visit" rows="3" class="w-full"></textarea>
      <button id="submit-rating" class="btn-primary w-full">Submit Review</button>
    </div>
    <button onclick="showVisitModal('${pin.id}', '${pin.name}')" class="btn-primary w-full">Mark as Visited</button>
    <button onclick="showOrderModal('${pin.id}', '${pin.name}')" class="btn-primary w-full">Order Now</button>
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
}

function closeBusinessPage() {
  document.getElementById('business-page').classList.add('hidden');
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
        <p class="text-red-600 font-semibold">${data.rating} ★ <span class="text-gray-600">by ${data.reviewerName}</span></p>
        <p class="text-gray-700">${data.comment}</p>
      `;
      reviewList.appendChild(reviewDiv);
    });
  }
  reviewsModal.classList.remove('hidden');
}

async function showVisitModal(pinId, truckName) {
  document.getElementById('visit-truck-name').textContent = truckName;
  document.getElementById('submit-visit').onclick = () => markVisited(pinId);
  document.getElementById('visit-modal').classList.remove('hidden');
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
  document.getElementById('visit-modal').classList.add('hidden');
}

async function showOrderModal(pinId, truckName) {
  const orderModal = document.getElementById('order-modal');
  const orderMenu = document.getElementById('order-menu');
  document.getElementById('order-truck-name').textContent = truckName;
  orderMenu.innerHTML = '';

  const pinDoc = await db.collection('pins').doc(pinId).get();
  const menu = pinDoc.data().menu || [];
  if (menu.length === 0) {
    orderMenu.innerHTML = '<p class="text-gray-600">No menu items available.</p>';
  } else {
    menu.forEach((item, index) => {
      const adjustedPrice = (item.price * PRICE_MARKUP).toFixed(2);
      const div = document.createElement('div');
      div.className = 'flex justify-between items-center';
      div.innerHTML = `
        <p class="text-gray-900">${item.name} - $${adjustedPrice}</p>
        <select id="quantity-${index}" class="w-20">
          <option value="0">0</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
      `;
      orderMenu.appendChild(div);
    });
  }

  document.getElementById('place-order').onclick = () => placeOrder(pinId, truckName, menu);
  orderModal.classList.remove('hidden');
}

async function placeOrder(pinId, truckName, menu) {
  if (!auth.currentUser) return alert("Please log in as a customer to place an order.");
  const userId = auth.currentUser.uid;
  const customerDoc = await db.collection('customers').doc(userId).get();
  if (!customerDoc.exists) return alert("Only customers can place orders.");

  const orderItems = menu.map((item, index) => {
    const quantity = parseInt(document.getElementById(`quantity-${index}`).value);
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
  document.getElementById('order-modal').classList.add('hidden');
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
  const dashboard = document.getElementById('vendor-dashboard');
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
  document.getElementById('live-toggle').textContent = vendorData.live ? "Go Offline" : "Go Live";
  document.getElementById('live-toggle').onclick = () => toggleLiveStatus(auth.currentUser.uid, vendorData.live);
  document.getElementById('update-profile').onclick = () => updateVendorProfile(auth.currentUser.uid);
  initializeDashAutocomplete();
  dashboard.classList.remove('hidden');
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
    const menuItems = Array.from(document.querySelectorAll('.menu-item')).map(item => ({
      name: item.querySelector('.menu-name').value,
      price: parseFloat(item.querySelector('.menu-price').value) || 0
    })).filter(item => item.name && item.price > 0);
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
