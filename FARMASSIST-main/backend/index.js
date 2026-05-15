const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Dataset
let cropData = [];
try {
  const dataPath = path.join(__dirname, 'data', 'crop_dataset.json');
  const rawData = fs.readFileSync(dataPath);
  cropData = JSON.parse(rawData);
  console.log(`Loaded ${cropData.length} crops from dataset.`);
} catch (err) {
  console.error("Error loading dataset:", err.message);
}

// ------------------------------------------
// USER DATABASE
// ------------------------------------------
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// Ensure data dir exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

const getUsers = () => {
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE));
  } catch (e) { return []; }
};

const saveUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// ------------------------------------------
// API ENDPOINTS
// ------------------------------------------

// 0. AUTHENTICATION
app.post('/api/signup', (req, res) => {
  const { username, password, phone, age } = req.body;
  if (!username || !password || !phone || !age) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const users = getUsers();
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: "User already exists. Please login." });
  }
  // Simple storage (IN REAL APP, HASH PASSWORDS!)
  users.push({ username, password, phone, age });
  saveUsers(users);
  res.json({ success: true, message: "Account created successfully" });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    res.json({ success: true, username: user.username });
  } else {
    res.status(401).json({ error: "Invalid username or password" });
  }
});

// 1. RECOMMENDATION ENGINE
app.post('/api/recommendate', (req, res) => {
  console.log("Received Soil Data:", req.body);
  const { ph, nitrogen, phosphorus, moisture, soilType } = req.body;

  if (!soilType) {
    return res.status(400).json({ error: "Soil Type is required" });
  }

  // Normalize Inputs
  const userSoil = soilType.toLowerCase();
  const userPh = parseFloat(ph) || 7.0;
  const userN = parseFloat(nitrogen) || 0;
  const userP = parseFloat(phosphorus) || 0;

  // LOGIC: Filter by Soil Type first (Exact or Partial Match)
  // E.g. "loamy" matches "loamy", "clay loam"
  let possibleCrops = cropData.filter(c => {
    // If dataset soil_type is 'any' or matches user input
    if (c.soil_type === 'any') return true;
    return userSoil.includes(c.soil_type) || c.soil_type.includes(userSoil);
  });

  // If no soil match, fall back to all crops but penalize score
  if (possibleCrops.length === 0) {
    possibleCrops = [...cropData];
  }

  // SCORING ALGORITHM
  const results = possibleCrops.map(crop => {
    let score = 100;

    // pH Score
    const avgPh = (crop.ph_min + crop.ph_max) / 2;
    const phDiff = Math.abs(userPh - avgPh);
    if (userPh < crop.ph_min || userPh > crop.ph_max) {
      score -= (phDiff * 15); // Penalty for pH mismatch
    } else {
      score -= (phDiff * 3); // Small penalty if not exactly at average
    }

    // Nutrient Score (N, P)
    // We treat nutrient levels as 'sufficient' if they meet a threshold
    const nDiff = Math.max(0, crop.n_min - userN);
    const pDiff = Math.max(0, crop.p_min - userP);
    score -= (nDiff * 0.1); // Missing Nitrogen penalty
    score -= (pDiff * 0.1); // Missing Phosphorus penalty

    // Soil Type Bonus
    if (userSoil === crop.soil_type) score += 10;

    // Determine Season Based on Advice keywords
    let season = "Year Round";
    let season_key = "season_year_round";
    const advice = crop.advice.toLowerCase();
    if (advice.includes("kharif") || advice.includes("june")) {
      season = "Kharif (Monsoon)";
      season_key = "season_kharif";
    }
    else if (advice.includes("rabi") || advice.includes("winter") || advice.includes("october") || advice.includes("november")) {
      season = "Rabi (Winter)";
      season_key = "season_rabi";
    }
    else if (advice.includes("zaid") || advice.includes("summer")) {
      season = "Zaid (Summer)";
      season_key = "season_zaid";
    }

    // Estimate Profit (Simplified: Yield * standard rate)
    // Paddy: 40q/ha * 2000rs = 80,000 gross
    const estimatedProfit = `₹${(crop.yield_per_ha * 1500 + Math.random() * 5000).toLocaleString()} - ₹${(crop.yield_per_ha * 2500).toLocaleString()}`;

    return {
      ...crop,
      matching_score: score,
      matching_score: score,
      season: season,
      season_key: season_key,
      estimated_profit: estimatedProfit
    };
  });

  // Sort by Best Score
  results.sort((a, b) => b.matching_score - a.matching_score);

  const bestMatch = results[0];
  const topCrops = results.slice(0, 3).map(c => c.crop);

  console.log(`Recommended: ${bestMatch?.crop} (Score: ${bestMatch?.matching_score?.toFixed(1)})`);

  res.json({
    crop: bestMatch ? bestMatch.crop : "Unknown",
    confidence: bestMatch ? `${Math.min(99, Math.max(50, Math.round(bestMatch.matching_score)))}%` : "0%",
    details: bestMatch ? `Ideal for ${bestMatch.soil_type} soil. pH Range: ${bestMatch.ph_min}-${bestMatch.ph_max}.` : "No matching crop found.",
    advice: bestMatch ? bestMatch.advice : "Please adjust your soil parameters.",
    advice_key: bestMatch ? bestMatch.advice_key : "advice_generic",
    top_crops: topCrops,
    expected_yield: bestMatch ? bestMatch.yield_per_ha : 0,
    season: bestMatch ? bestMatch.season_key : "N/A",
    estimated_profit: bestMatch ? bestMatch.estimated_profit : "N/A"
  });
});

// 2. GET DATASET (For debugging or user view)
app.get('/api/dataset', (req, res) => {
  res.json(cropData);
});

// 3. DISEASE PREDICTION (MOCK AI)
// Simulates the AI model by returning random results from the supported list.
const multer = require('multer');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// 3. DISEASE PREDICTION (MOCK AI)
// Handles image upload and returns a prediction.
// CLUE LOGIC: If the filename contains hints (e.g. 'early', 'late'), it detects that disease!
app.post('/predict', upload.single('image'), (req, res) => {
  console.log("Received Disease Analysis Request");

  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  const filename = req.file.originalname.toLowerCase();
  console.log("Analyzing file:", filename);

  // List of possible results matching the translation keys
  const diseases = [
    { key: 'disease_early_blight', remedy: 'remedy_fungicide_copper', prevent: 'prevention_water', severity: 'severity_moderate', keywords: ['early', 'blight'] },
    { key: 'disease_late_blight', remedy: 'remedy_remove_infected', prevent: 'prevention_monitor', severity: 'severity_severe', keywords: ['late'] },
    { key: 'disease_bacterial_spot', remedy: 'remedy_fungicide_copper', prevent: 'prevention_seed', severity: 'severity_moderate', keywords: ['spot', 'bacterial'] },
    { key: 'disease_leaf_mold', remedy: 'remedy_neem', prevent: 'prevention_water', severity: 'severity_moderate', keywords: ['mold'] },
    { key: 'disease_powdery_mildew', remedy: 'remedy_neem', prevent: 'prevention_water', severity: 'severity_moderate', keywords: ['powdery', 'mildew'] },
    { key: 'disease_healthy', remedy: 'remedy_none', prevent: 'prevention_monitor', severity: 'severity_low', keywords: ['healthy', 'green'] },
    { key: 'disease_rust', remedy: 'remedy_fungicide_copper', prevent: 'prevention_monitor', severity: 'severity_moderate', keywords: ['rust'] },
    { key: 'disease_greening', remedy: 'remedy_remove_infected', prevent: 'prevention_monitor', severity: 'severity_severe', keywords: ['greening', 'citrus'] }
  ];

  // Try to find a match based on filename keywords
  let detected = diseases.find(d => d.keywords.some(k => filename.includes(k)));

  // If no keyword match, pick a random one
  if (!detected) {
    detected = diseases[Math.floor(Math.random() * diseases.length)];
  }

  console.log("Detected:", detected.key);

  // Simulate processing delay
  setTimeout(() => {
    res.json({
      disease_key: detected.key,
      confidence: (88 + Math.random() * 11).toFixed(1) + "%",
      remedy_key: detected.remedy,
      prevention_key: detected.prevent,
      severity_key: detected.severity,
      is_plant: true,
      debug_label: "Mock AI (Keywords matched)"
    });
  }, 1500);
});

// 4. SMART CHAT ADVISOR
app.post('/api/chat', (req, res) => {
  const { message, language } = req.body;
  const input = message.toLowerCase();
  console.log(`Chat Request: "${message}"`);

  // Shared Data handles
  const temp = "18°C";
  const wheatPrice = "₹2,275";

  let response = "";

  // Simple Keyword-based Advisory Logic
  if (input.includes("disease") || input.includes("protect") || input.includes("reduction")) {
    response = "To reduce plant diseases, ensure proper spacing for air circulation and remove infected leaves. Currently, the cool dry weather in Ranchi is good for reducing fungal risks, but keep monitoring!";
  } else if (input.includes("soil") || input.includes("fertilizer")) {
    response = "Good soil health starts with pH testing. For the current Rabi season, Wheat needs balanced NPK. Have you tested your secondary nutrients?";
  } else if (input.includes("jharkhand") || input.includes("crop")) {
    response = "In Jharkhand, we are currently in the Rabi season. Wheat, Mustard, and Potato are the primary crops being traded in the market right now.";
  } else if (input.includes("weather") || input.includes("rain") || input.includes("temperature")) {
    response = `The current temperature in Ranchi is ${temp} with clear skies. It is ideal weather for Rabi crops. No rain is expected in the next 3 days.`;
  } else if (input.includes("market") || input.includes("price") || input.includes("wheat")) {
    response = `Market prices are looking positive! Wheat is currently at ${wheatPrice}/quintal, up from last week. Check the Market section for detailed trends.`;
  } else if (input.includes("hello") || input.includes("hi") || input.includes("namaste")) {
    response = "Namaste! I am your Kisan Sahay AI. I can help you with live weather, market prices, and disease detection. What is on your mind today?";
  } else {
    response = "That is an interesting question! I can provide specific advice on current Ranchi weather, market prices for Wheat, or plant diseases. Try asking 'What is the price of wheat?'";
  }

  // Simulate AI "thinking" time
  setTimeout(() => {
    res.json({ text: response });
  }, 800);
});

// 5. LIVE WEATHER (MOCK)
app.get('/api/weather', (req, res) => {
  // Simulate Ranchi weather for Dec-Jan
  const weatherData = {
    temp: "18°C",
    condition: "weather_clear", // Key for translation
    humidity: "45%",
    wind: "8 km/h",
    location: "Ranchi, Jharkhand",
    sunset: "5:15 PM",
    forecast: [
      { day: "Mon", temp: "19°C", icon: "☀️" },
      { day: "Tue", temp: "17°C", icon: "⛅" },
      { day: "Wed", temp: "18°C", icon: "☀️" }
    ]
  };
  res.json(weatherData);
});

// 6. MARKET PRICES (MOCK)
app.get('/api/market', (req, res) => {
  const prices = [
    { crop: "crop_wheat", price: "₹2,275/q", trend: "↑", change: "+15" },
    { crop: "crop_mustard", price: "₹5,400/q", trend: "↓", change: "-50" },
    { crop: "crop_potato", price: "₹1,150/q", trend: "→", change: "0" },
    { crop: "Paddy (Rice)", price: "₹2,183/q", trend: "↑", change: "+5" },
    { crop: "Maize", price: "₹2,090/q", trend: "↓", change: "-10" }
  ];
  res.json(prices);
});

// Start Server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`FARM AI Backend running on port ${PORT}`);
});
