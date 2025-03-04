<!DOCTYPE html>
<html>
<head>
  <title>Streats Live</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
  <style>
    body { 
      margin: 0; 
      font-family: 'Inter', sans-serif; 
      background: #0f0f0f; 
      color: #d4d4d4; 
      overflow-x: hidden; 
    }
    .container { 
      display: flex; 
      min-height: 100vh; 
    }
    #sidebar { 
      width: 250px; 
      background: #171717; 
      padding: 15px; 
      transition: width 0.3s ease; 
      position: fixed; 
      height: 100%; 
      z-index: 1000; 
    }
    #sidebar.hidden { 
      width: 60px; 
    }
    #sidebar-toggle { 
      position: fixed; 
      top: 10px; 
      left: 270px; 
      background: transparent; 
      color: #00d4ff; 
      border: 1px solid #00d4ff; 
      padding: 6px 10px; 
      border-radius: 4px; 
      cursor: pointer; 
      z-index: 1001; 
      transition: left 0.3s ease, background 0.2s; 
    }
    #sidebar-toggle.hidden { 
      left: 70px; 
    }
    #sidebar-toggle:hover { 
      background: #00d4ff; 
      color: #0f0f0f; 
    }
    #sidebar .user-info { 
      text-align: center; 
      margin-bottom: 20px; 
    }
    #sidebar .user-info h2 { 
      color: #00d4ff; 
      font-size: 1.4em; 
      margin: 8px 0; 
      white-space: nowrap; 
    }
    #sidebar button { 
      background: none; 
      color: #d4d4d4; 
      border: none; 
      padding: 12px; 
      width: 100%; 
      text-align: left; 
      border-radius: 4px; 
      cursor: pointer; 
      font-size: 0.95em; 
      margin: 5px 0; 
      transition: background 0.2s, color 0.2s; 
      display: flex; 
      align-items: center; 
    }
    #sidebar.hidden button { 
      text-align: center; 
      padding: 12px 0; 
    }
    #sidebar.hidden button span { 
      display: none; 
    }
    #sidebar.hidden button i { 
      margin: 0; 
    }
    #sidebar button:hover { 
      background: #00d4ff; 
      color: #0f0f0f; 
    }
    #content { 
      flex: 1; 
      padding: 20px; 
      margin-left: 250px; 
      transition: margin-left 0.3s ease; 
    }
    #content.full { 
      margin-left: 60px; 
    }
    .hero { 
      background: url('https://via.placeholder.com/1200x400?text=Food+Truck') no-repeat center/cover; 
      height: 50vh; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      text-align: center; 
      color: #fff; 
      position: relative; 
    }
    .hero-content { 
      background: rgba(0, 0, 0, 0.5); 
      padding: 20px; 
      border-radius: 8px; 
    }
    .hero h1 { 
      color: #00d4ff; 
      font-size: 2.5em; 
      margin-bottom: 10px; 
    }
    .hero p { 
      font-size: 1.2em; 
    }
    .hero button { 
      background: #00d4ff; 
      color: #0f0f0f; 
      padding: 10px 20px; 
      border: none; 
      border-radius: 4px; 
      cursor: pointer; 
      margin-top: 10px; 
    }
    .hero button:hover { 
      background: #ff4081; 
    }
    .search-filter { 
      display: flex; 
      gap: 10px; 
      margin: 20px 0; 
    }
    .search-filter input, .search-filter select { 
      padding: 8px; 
      border: 1px solid #2a2a2a; 
      border-radius: 4px; 
      background: #222; 
      color: #d4d4d4; 
      flex: 1; 
    }
    #map { 
      height: 60vh; 
      width: 100%; 
      border-radius: 8px; 
      box-shadow: 0 0 8px rgba(0, 212, 255, 0.1); 
      margin-bottom: 20px; 
      background: #171717; 
    }
    #truck-list { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
      gap: 15px; 
      max-height: 40vh; 
      overflow-y: auto; 
    }
    .truck-card { 
      background: #171717; 
      padding: 15px; 
      border-radius: 8px; 
      cursor: pointer; 
      transition: transform 0.2s; 
    }
    .truck-card:hover { 
      transform: scale(1.02); 
    }
    .truck-card.live { 
      border: 2px solid #00d4ff; 
    }
    #auth-modal, #dashboard { 
      display: none; 
      background: #171717; 
      padding: 30px; 
      border-radius: 8px; 
      box-shadow: 0 0 12px rgba(0, 212, 255, 0.15); 
      max-width: 600px; 
      margin: 0 auto 20px; 
      animation: slideIn 0.3s ease; 
    }
    @keyframes slideIn { 
      from { opacity: 0; transform: translateY(10px); } 
      to { opacity: 1; transform: translateY(0); } 
    }
    #auth-modal input, #dashboard input, #dashboard textarea, #dashboard select { 
      width: 100%; 
      padding: 10px; 
      margin: 6px 0; 
      border: 1px solid #2a2a2a; 
      border-radius: 4px; 
      background: #222; 
      color: #d4d4d4; 
      font-size: 0.9em; 
      transition: border-color 0.2s; 
    }
    #auth-modal input:focus, #dashboard input:focus, #dashboard textarea:focus, #dashboard select:focus { 
      border-color: #00d4ff; 
      outline: none; 
    }
    #dashboard textarea { 
      height: 90px; 
      resize: vertical; 
    }
    #auth-modal button, #dashboard button { 
      background: #00d4ff; 
      color: #0f0f0f; 
      border: none; 
      padding: 10px; 
      width: 100%; 
      border-radius: 4px; 
      cursor: pointer; 
      font-size: 0.95em; 
      margin-top: 6px; 
      transition: background 0.2s, transform 0.1s; 
    }
    #auth-modal button:hover, #dashboard button:hover { 
      background: #ff4081; 
      transform: translateY(-1px); 
    }
    .time-group { 
      display: flex; 
      gap: 6px; 
    }
    .time-group input { 
      width: 65%; 
    }
    .time-group select { 
      width: 35%; 
    }
    #address-preview, #dash-address-preview { 
      font-size: 0.8em; 
      color: #00d4ff; 
      margin-top: 4px; 
    }
    #business-page { 
      display: none; 
      position: fixed; 
      top: 50%; 
      left: 50%; 
      transform: translate(-50%, -50%); 
      background: #171717; 
      padding: 30px; 
      border-radius: 8px; 
      box-shadow: 0 0 12px rgba(0, 212, 255, 0.15); 
      max-width: 700px; 
      z-index: 1000; 
      animation: slideIn 0.3s ease; 
    }
    #business-page h2 { 
      color: #00d4ff; 
      margin-bottom: 12px; 
    }
    #business-page p { 
      margin: 6px 0; 
      font-size: 0.95em; 
    }
    #business-page img { 
      max-width: 100%; 
      border-radius: 4px; 
      margin: 8px 0; 
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2); 
    }
    #business-page .rating { 
      margin: 10px 0; 
    }
    #business-page .rating select { 
      padding: 5px; 
      background: #222; 
      color: #d4d4d4; 
      border: 1px solid #2a2a2a; 
      border-radius: 4px; 
    }
    #business-page button { 
      background: #00d4ff; 
      color: #0f0f0f; 
      border: none; 
      padding: 8px 16px; 
      border-radius: 4px; 
      cursor: pointer; 
      margin: 5px; 
      transition: background 0.2s; 
    }
    #business-page button:hover { 
      background: #ff4081; 
    }
    #about { 
      background: #171717; 
      padding: 30px; 
      border-radius: 8px; 
      box-shadow: 0 0 8px rgba(0, 212, 255, 0.1); 
      text-align: left; 
    }
    #about h2 { 
      color: #00d4ff; 
      font-size: 1.6em; 
      margin-bottom: 12px; 
    }
    #about p { 
      font-size: 0.95em; 
      margin-bottom: 8px; 
    }
    @media (max-width: 768px) {
      #sidebar { width: 200px; }
      #sidebar.hidden { width: 0; padding: 0; }
      #sidebar-toggle { left: 10px; }
      #sidebar-toggle.hidden { left: 10px; }
      #content { margin-left: 0; padding: 10px; }
      #content.full { margin-left: 0; }
      .search-filter { flex-direction: column; }
      .hero { height: 40vh; }
      #map { height: 50vh; }
    }
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="container">
    <button id="sidebar-toggle" aria-label="Toggle sidebar">☰</button>
    <div id="sidebar" class="hidden">
      <div class="user-info">
        <h2 id="sidebar-name"></h2>
        <p id="sidebar-status"></p>
      </div>
      <button id="auth-btn"><i class="fas fa-user"></i> <span>Sign Up / Login</span></button>
      <button id="dashboard-btn" style="display: none;"><i class="fas fa-tachometer-alt"></i> <span>Dashboard</span></button>
      <button id="logout" style="display: none;"><i class="fas fa-sign-out-alt"></i> <span>Logout</span></button>
    </div>
    <div id="content" class="full">
      <section class="hero">
        <div class="hero-content">
          <h1>Streats Live</h1>
          <p>Discover local food trucks in real-time</p>
          <button onclick="document.getElementById('map').scrollIntoView()">Find Trucks Now</button>
        </div>
      </section>
      <div class="search-filter">
        <input type="text" id="truck-search" placeholder="Search food trucks...">
        <select id="food-type-filter">
          <option value="">All Food Types</option>
        </select>
        <select id="status-filter">
          <option value="">All Status</option>
          <option value="live">Live Now</option>
          <option value="offline">Offline</option>
        </select>
      </div>
      <div id="map"></div>
      <div id="truck-list" class="truck-grid"></div>
      <div id="auth-modal">
        <h2 id="auth-title">Sign Up</h2>
        <input type="email" id="email" placeholder="Email" required><br>
        <input type="password" id="password" placeholder="Password" required><br>
        <div id="signup-fields" style="display: none;">
          <input type="text" id="name" placeholder="Business Name" required><br>
          <input type="text" id="foodType" placeholder="Food Type (e.g., Tacos)" required><br>
          <input type="text" id="contact" placeholder="Contact Info" required><br>
          <input type="text" id="address" placeholder="Start typing address..." required><br>
          <div id="address-preview"></div>
          <div class="time-group">
            <input type="text" id="startTime" placeholder="Start (e.g., 9:00)" pattern="^(1[0-2]|0?[1-9]):[0-5][0-9]$" required>
            <select id="startPeriod" required>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
          <div class="time-group">
            <input type="text" id="endTime" placeholder="End (e.g., 5:00)" pattern="^(1[0-2]|0?[1-9]):[0-5][0-9]$" required>
            <select id="endPeriod" required>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
          <textarea id="description" placeholder="Description" required></textarea><br>
          <input type="text" id="specials" placeholder="Specials (e.g., Taco Tuesday)" required><br>
          <input type="file" id="photos" accept="image/*" multiple><br>
        </div>
        <button id="auth-submit">Submit</button>
        <p id="auth-toggle">Already have an account? <a href="#" onclick="toggleAuthMode()">Login</a></p>
      </div>
      <div id="dashboard">
        <h2>Dashboard</h2>
        <input type="text" id="dash-name" placeholder="Business Name"><br>
        <input type="text" id="dash-foodType" placeholder="Food Type"><br>
        <input type="text" id="dash-contact" placeholder="Contact Info"><br>
        <input type="text" id="dash-address" placeholder="Start typing address..."><br>
        <div id="dash-address-preview"></div>
        <div class="time-group">
          <input type="text" id="dash-startTime" placeholder="Start (e.g., 9:00)" pattern="^(1[0-2]|0?[1-9]):[0-5][0-9]$">
          <select id="dash-startPeriod">
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
        <div class="time-group">
          <input type="text" id="dash-endTime" placeholder="End (e.g., 5:00)" pattern="^(1[0-2]|0?[1-9]):[0-5][0-9]$">
          <select id="dash-endPeriod">
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
        <textarea id="dash-description" placeholder="Description"></textarea><br>
        <input type="text" id="dash-specials" placeholder="Specials"><br>
        <input type="file" id="dash-photos" accept="image/*" multiple><br>
        <button id="update-profile">Update Profile</button>
        <button id="live-toggle">Go Live</button>
      </div>
      <div id="about">
        <h2>About Streats Live</h2>
        <p>Connecting food lovers with local food trucks in real-time.</p>
        <p><strong>Goals:</strong> Empower vendors, boost local cuisine.</p>
        <p><strong>Team:</strong> Foodies and tech innovators.</p>
      </div>
    </div>
    <div id="business-page">
      <h2 id="page-name"></h2>
      <p id="page-foodType"></p>
      <p id="page-contact"></p>
      <p id="page-address"></p>
      <p id="page-hours"></p>
      <p id="page-description"></p>
      <p id="page-specials"></p>
      <div id="page-photos"></div>
      <!-- Rating and Share buttons added dynamically in JS -->
      <button id="close-page" onclick="closeBusinessPage()">Close</button>
    </div>
  </div>
  <script src="https://www.gstatic.com/firebasejs/7.24.0/firebase-app.js"></script>
  <script src="https://www.gstatic.com/firebasejs/7.24.0/firebase-firestore.js"></script>
  <script src="https://www.gstatic.com/firebasejs/7.24.0/firebase-storage.js"></script>
  <script src="https://www.gstatic.com/firebasejs/7.24.0/firebase-auth.js"></script>
  <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDeaGTuprL_qbUkydv-DdDYiIgh0_XPu88&libraries=places"></script>
  <script src="script.js" defer></script>
</body>
</html>
