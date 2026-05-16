import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import './styles.css';

/* 
  FARM ASSIST PRO v7.0 - PREMIUM REDESIGN
  - Modern Glassmorphism UI
  - Full Multi-language Support
  - Voice-to-Text Integration
  - Weather & Market Features
*/

const API_BASE_URL = 'http://localhost:5000';

function App() {
  const { t, i18n } = useTranslation();

  // Navigation
  const [page, setPage] = useState('login');

  // Auth
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [isListening, setIsListening] = useState(false); // Visual feedback for voice


  // Soil Analysis
  const [soilData, setSoilData] = useState({
    ph: '',
    nitrogen: '',
    phosphorus: '',
    moisture: '',
    soilType: 'loamy'
  });
  const [recommendation, setRecommendation] = useState(null);

  // Disease Detection
  const [image, setImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [diseaseResult, setDiseaseResult] = useState(null);

  // Weather
  const [weather, setWeather] = useState({
    temp: '28°C',
    condition: 'weather_clear', // Key for translation
    humidity: '65%',
    rainfall: 'weather_low' // Key for translation
  });

  // Market Prices
  const [marketPrices, setMarketPrices] = useState([
    { crop: 'crop_wheat', price: '₹2,150/q', trend: '↑' },
    { crop: 'crop_rice', price: '₹1,950/q', trend: '↓' },
    { crop: 'crop_maize', price: '₹1,800/q', trend: '→' }
  ]);

  const [loading, setLoading] = useState(false);

  // Chat Assistant
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Initialize data (Chat, Weather, Market)
  useEffect(() => {
    setChatHistory([{ role: 'bot', text: t('chat_welcome') }]);

    // Fetch Weather
    const fetchWeather = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/weather`);
        setWeather(res.data);
      } catch (err) {
        console.error("Weather fetch error:", err);
      }
    };

    // Fetch Market Prices
    const fetchMarket = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/market`);
        setMarketPrices(res.data);
      } catch (err) {
        console.error("Market fetch error:", err);
      }
    };

    fetchWeather();
    fetchMarket();
  }, [i18n.language, t]);

  // Handlers
  const handleAuth = async (e) => {
    e.preventDefault();
    if (isSignup) {
      if (username && password && phone && age) {
        try {
          await axios.post(`${API_BASE_URL}/api/signup`, { username, password, phone, age });
          alert(t('signup_success') || 'Account created successfully!');
          setIsSignup(false);
        } catch (err) {
          console.error("Signup Error:", err);
          alert(err.response?.data?.error || "Signup failed. Please try again.");
        }
      } else {
        alert(t('error_fill_fields') || 'Please fill all fields');
      }
    } else {
      if (username && password) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/login`, { username, password });
          if (response.data.success) {
            setPage('home');
          }
        } catch (err) {
          console.error("Login Error:", err);
          alert(err.response?.data?.error || (t('error_credentials') || 'Please enter valid credentials'));
        }
      } else {
        alert(t('error_credentials') || 'Please enter valid credentials');
      }
    }
  };

  const getRecommendation = async () => {
    if (!soilData.ph || !soilData.nitrogen || !soilData.phosphorus) {
      alert(t('error_fill_fields') || 'Please fill all required fields!');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/recommendate`, {
        ph: soilData.ph,
        nitrogen: soilData.nitrogen,
        phosphorus: soilData.phosphorus,
        moisture: soilData.moisture,
        soilType: soilData.soilType
      });

      const data = response.data;

      // Map the backend response to the frontend state
      setRecommendation({
        primaryCrop: data.crop,
        crops: data.top_crops || [],
        expected_yield: data.expected_yield,
        confidence: data.confidence,
        season: data.season || 'N/A',
        irrigation: data.irrigation || 'irrigation_medium',
        fertilizer: `N:${soilData.nitrogen} P:${soilData.phosphorus}`,
        notes: data.advice_key || data.advice
      });

      // Announce the result
      setTimeout(() => {
        const translatedCrop = t(data.crop);
        let announcement = translatedCrop;

        if (i18n.language === 'en') announcement = `The recommended crop is ${translatedCrop}`;
        else if (i18n.language === 'hi') announcement = `आपके लिए सुझाई गई फसल ${translatedCrop} है`;
        else if (i18n.language === 'te') announcement = `మీకు సిఫార్సు చేయబడిన పంట ${translatedCrop}`;
        else if (i18n.language === 'ta') announcement = `உங்களுக்கு பரிந்துரைக்கப்பட்ட பயிர் ${translatedCrop}`;
        else if (i18n.language === 'bn') announcement = `আপনার জন্য প্রস্তাবित ফসল হলো ${translatedCrop}`;
        else if (i18n.language === 'mr') announcement = `तुमच्यासाठी शिफारस केलेले पीक ${translatedCrop} आहे`;
        else if (i18n.language === 'or') announcement = `ଆପଣଙ୍କ ପାଇଁ ସୁପାରିଶ କରାଯାଇଥିବା ଫସଲ ହେଉଛି ${translatedCrop}`;

        speakText(announcement);
      }, 1000);

      setPage('soil_result');
    } catch (error) {
      console.error("Soil recommendation error:", error);
      alert(t('error_connect_ai') || "Soil server unreachable");
    } finally {
      setLoading(false);
    }
  };

  const analyzeDisease = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setDiseaseResult(null);

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      // Updated to point to the main backend on port 5000
      const response = await axios.post(`${API_BASE_URL}/predict`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;
      if (data.error) {
        alert("Error: " + data.error);
        return;
      }

      setDiseaseResult({
        disease_key: data.disease_key,
        confidence: data.confidence,
        severity_key: data.severity_key || 'severity_moderate',
        remedy_key: data.remedy_key,
        prevention_key: data.prevention_key || 'prevention_tips',
        is_plant: data.is_plant,
        debug_label: data.debug_label
      });

      // Announce Disease Result logic
      setTimeout(() => {
        let textToRead = "";
        if (data.is_plant) {
          textToRead += `${t(data.disease_key)}. `;
          textToRead += `${t('remedy')} ${t(data.remedy_key)}`;
        } else {
          textToRead += t('disease_unknown_object');
        }
        speakText(textToRead);
      }, 500);

    } catch (error) {
      console.error("Disease detection error:", error);
      alert(t('error_connect_ai') || "AI Server unreachable");
    }
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) {
      console.error("Speech Synthesis not supported");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'te': 'te-IN',
      'ta': 'ta-IN',
      'bn': 'bn-IN',
      'mr': 'mr-IN',
      'or': 'or-IN'
    };
    utterance.lang = langMap[i18n.language] || 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  // Generic Voice Input Handler
  const performVoiceInput = (setCallback) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(t('voice_not_supported'));
      return;
    }
    const recognition = new SpeechRecognition();

    // Map internal language codes to BCP 47 tags
    const langMap = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'te': 'te-IN',
      'ta': 'ta-IN',
      'bn': 'bn-IN',
      'mr': 'mr-IN',
      'or': 'or-IN'
    };

    recognition.lang = langMap[i18n.language] || 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      if (text) {
        setCallback(text);
      }
      setIsListening(false);
    };

    recognition.onerror = (e) => {
      console.error("Speech Error", e);
      setIsListening(false);
      if (e.error === 'not-allowed') {
        alert(t('voice_permission_denied') || 'Microphone permission denied. Please allow access.');
      }
    };

    recognition.start();
  };

  // Helper to read the page content
  const readPageContent = () => {
    let textToRead = "";
    if (page === 'soil_result' && recommendation) {
      textToRead += `${t('recommended_crops')}. ${t(recommendation.primaryCrop)}. `;
      textToRead += `${t('yield')} ${recommendation.expected_yield} quintal per hectare. `;
      textToRead += `${t('season')} ${t(recommendation.season)}. `;
      textToRead += `${t('expert_advice')} ${t(recommendation.notes)}`;
    } else if (page === 'disease' && diseaseResult) {
      textToRead += `${t(diseaseResult.disease_key)}. `;
      textToRead += `${t('remedy')} ${t(diseaseResult.remedy_key)}`;
    } else {
      textToRead = t('app_tagline');
    }
    speakText(textToRead);
  };

  const startVoiceInput = () => {
    performVoiceInput(setChatInput);
  };

  const startUsernameVoice = () => {
    performVoiceInput(setUsername);
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;

    const userMsg = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput('');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/chat`, {
        message: currentInput,
        language: i18n.language
      });

      setChatHistory(prev => [...prev, {
        role: 'bot',
        text: response.data.text
      }]);
    } catch (err) {
      console.error("Chat Error:", err);
      setChatHistory(prev => [...prev, {
        role: 'bot',
        text: t('error_connect_ai') || "I'm having trouble connecting to my brain right now. Please try again soon!"
      }]);
    }
  };

  // LOGIN PAGE
  if (page === 'login') {
    return (
      <div className="login-container">
        <div className="login-background"></div>
        <div className="govt-badge">
          <div className="govt-icon">🏛️</div>
          <div className="govt-text">
            <div className="govt-name">Government of Tamilnadu</div>
            <div className="govt-dept">{t('govt_title')}</div>
          </div>
        </div>

        <div className="login-card">
          <div className="login-header">
            <div className="app-icon">🌾</div>
            <h1 className="app-title">{t('app_name')}</h1>
            <p className="app-subtitle">{t('app_tagline') || 'Smart Agriculture Advisory System'}</p>
          </div>

          <form onSubmit={handleAuth} className="login-form">
            <div className="form-field">
              <label>{t('username')}</label>
              <div className="input-with-icon">
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={t('username_placeholder') || 'Enter Farmer ID or Mobile'}
                  required
                />
                <button type="button" onClick={startUsernameVoice} className="btn-icon-input" title="Speak Name">
                  🎤
                </button>
              </div>
            </div>

            {isSignup && (
              <>
                <div className="form-field">
                  <label>{t('phone_number') || 'Phone Number'}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    required
                  />
                </div>
                <div className="form-field">
                  <label>{t('age') || 'Age'}</label>
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    placeholder="e.g. 45"
                    required
                    min="18"
                    max="100"
                  />
                </div>
              </>
            )}
            <div className="form-field">
              <label>{t('password')}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className="btn-login">
              {isSignup ? t('signup_link') : t('login_btn')}
            </button>
          </form>

          <div className="login-footer">
            <button className="link-btn" onClick={() => setIsSignup(!isSignup)}>
              {isSignup ? t('back_to_login') : t('signup_msg')}
            </button>
          </div>

          <div className="language-selector">
            <label>{t('select_language') || 'Language'}</label>
            <select
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="lang-dropdown"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="bn">বাংলা (Bengali)</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="or">ଓଡ଼ିଆ (Odia)</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  // MAIN APP LAYOUT
  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo" onClick={() => setPage('home')}>
            <span className="logo-icon">🌾</span>
            <span className="logo-text">{t('app_name')}</span>
          </div>
          <div className="govt-label">Government of Tamilnadu</div>
        </div>
        <div className="header-right">
          <div className="user-badge">
            <span className="user-icon">👤</span>
            <span className="user-name">{t('welcome_user')} {username}</span>
          </div>
          <select
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="lang-select-header"
          >
            <option value="en">EN</option>
            <option value="hi">हि</option>
            <option value="te">తె</option>
            <option value="ta">த</option>
            <option value="bn">বা</option>
            <option value="mr">म</option>
            <option value="or">ଓ</option>
          </select>
          <button className="btn-logout" onClick={() => setPage('login')}>
            {t('logout') || 'Logout'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-container">

        {/* DASHBOARD */}
        {page === 'home' && (
          <div className="dashboard">
            <h1 className="page-title">{t('dashboard_title')}</h1>

            {/* Quick Stats */}
            <div className="stats-grid">
              <div className="stat-card weather-card">
                <div className="stat-icon">⛅</div>
                <div className="stat-content">
                  <div className="stat-label">{t('weather') || 'Weather'}</div>
                  <div className="stat-value">{weather.temp}</div>
                  <div className="stat-detail">{t(weather.condition)}</div>
                </div>
              </div>
              <div className="stat-card market-card">
                <div className="stat-icon">📈</div>
                <div className="stat-content">
                  <div className="stat-label">{t('market') || 'Market'}</div>
                  <div className="stat-value">{marketPrices[0]?.price || 'N/A'}</div>
                  <div className="stat-detail">
                    {t(marketPrices[0]?.crop) || 'Loading...'}
                    <span className={`trend-${marketPrices[0]?.trend === '↑' ? 'up' : 'down'}`}> {marketPrices[0]?.trend}</span>
                  </div>
                </div>
              </div>
              <div className="stat-card alert-card">
                <div className="stat-icon">🔔</div>
                <div className="stat-content">
                  <div className="stat-label">{t('alerts') || 'Alerts'}</div>
                  <div className="stat-value">2</div>
                  <div className="stat-detail">{t('new_alerts') || 'New Updates'}</div>
                </div>
              </div>
            </div>

            {/* Main Services */}
            <div className="services-grid">
              <div className="service-card soil-service" onClick={() => setPage('soil_input')}>
                <div className="service-icon">🧪</div>
                <h3 className="service-title">{t('card_soil_title')}</h3>
                <p className="service-desc">{t('card_soil_desc')}</p>
                <button className="btn-service">{t('get_started') || 'Get Started'} →</button>
              </div>

              <div className="service-card disease-service" onClick={() => setPage('disease')}>
                <div className="service-icon">📸</div>
                <h3 className="service-title">{t('card_disease_title')}</h3>
                <p className="service-desc">{t('card_disease_desc')}</p>
                <button className="btn-service">{t('scan_now') || 'Scan Now'} →</button>
              </div>

              <div className="service-card market-service" onClick={() => setPage('market')}>
                <div className="service-icon">💰</div>
                <h3 className="service-title">{t('market_prices') || 'Market Prices'}</h3>
                <p className="service-desc">{t('market_desc') || 'Live crop prices and trends'}</p>
                <button className="btn-service">{t('view_prices') || 'View Prices'} →</button>
              </div>
            </div>
          </div>
        )}

        {/* SOIL INPUT PAGE */}
        {page === 'soil_input' && (
          <div className="content-page">
            <button className="btn-back" onClick={() => setPage('home')}>
              ← {t('back') || 'Back'}
            </button>

            <div className="page-card">
              <div className="page-header">
                <div className="page-icon">🧪</div>
                <div>
                  <h2 className="page-heading">{t('enter_soil_details')}</h2>
                  <p className="page-subheading">{t('soil_instruction') || 'Enter your soil test results below'}</p>
                </div>
              </div>

              <div className="input-grid">
                <div className="input-field">
                  <label className="input-label">{t('ph_level')} *</label>
                  <div className="input-with-icon">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={soilData.ph}
                      onChange={e => setSoilData({ ...soilData, ph: e.target.value })}
                      placeholder="6.5"
                      className="input-box"
                    />
                    <button
                      type="button"
                      onClick={() => performVoiceInput(val => setSoilData(prev => ({ ...prev, ph: val })))}
                      className="btn-icon-input"
                    >
                      🎤
                    </button>
                  </div>
                  <span className="input-hint">Range: 5.5 - 8.5</span>
                </div>

                <div className="input-field">
                  <label className="input-label">{t('nitrogen')} *</label>
                  <div className="input-with-icon">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={soilData.nitrogen}
                      onChange={e => setSoilData({ ...soilData, nitrogen: e.target.value })}
                      placeholder="120"
                      className="input-box"
                    />
                    <button
                      type="button"
                      onClick={() => performVoiceInput(val => setSoilData(prev => ({ ...prev, nitrogen: val })))}
                      className="btn-icon-input"
                    >
                      🎤
                    </button>
                  </div>
                  <span className="input-hint">kg/ha</span>
                </div>

                <div className="input-field">
                  <label className="input-label">{t('phosphorus')} *</label>
                  <div className="input-with-icon">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={soilData.phosphorus}
                      onChange={e => setSoilData({ ...soilData, phosphorus: e.target.value })}
                      placeholder="50"
                      className="input-box"
                    />
                    <button
                      type="button"
                      onClick={() => performVoiceInput(val => setSoilData(prev => ({ ...prev, phosphorus: val })))}
                      className="btn-icon-input"
                    >
                      🎤
                    </button>
                  </div>
                  <span className="input-hint">kg/ha</span>
                </div>

                <div className="input-field">
                  <label className="input-label">{t('moisture')}</label>
                  <div className="input-with-icon">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={soilData.moisture}
                      onChange={e => setSoilData({ ...soilData, moisture: e.target.value })}
                      placeholder="40"
                      className="input-box"
                    />
                    <button
                      type="button"
                      onClick={() => performVoiceInput(val => setSoilData(prev => ({ ...prev, moisture: val })))}
                      className="btn-icon-input"
                    >
                      🎤
                    </button>
                  </div>
                  <span className="input-hint">%</span>
                </div>

                <div className="input-field full-width">
                  <label className="input-label">{t('soil_type')}</label>
                  <select
                    value={soilData.soilType}
                    onChange={e => setSoilData({ ...soilData, soilType: e.target.value })}
                    className="input-box"
                  >
                    <option value="loamy">{t('soil_loamy')}</option>
                    <option value="sandy">{t('soil_sandy')}</option>
                    <option value="clay">{t('soil_clay')}</option>
                    <option value="black">{t('soil_black') || 'Black Soil'}</option>
                    <option value="red">{t('soil_red') || 'Red Soil'}</option>
                    <option value="laterite">{t('soil_laterite') || 'Laterite Soil'}</option>
                    <option value="yellow">{t('soil_yellow') || 'Yellow Soil'}</option>
                    <option value="mica">{t('soil_mica') || 'Mica-rich Soil'}</option>
                  </select>
                </div>
              </div>

              <div className="action-buttons">
                {loading ? (
                  <div className="loader">{t('processing_msg')}</div>
                ) : (
                  <button className="btn-primary" onClick={getRecommendation}>
                    {t('get_recommendation_btn')} 🚀
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SOIL RESULT PAGE */}
        {page === 'soil_result' && recommendation && (
          <div className="content-page">
            <button className="btn-back" onClick={() => setPage('soil_input')}>
              ← {t('back') || 'Back'}
            </button>

            <div className="result-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="result-badge">✅ {t('ai_verified') || 'AI Verified'}</div>
                <button onClick={readPageContent} className="btn-icon-input" style={{ fontSize: '1.5rem' }} title="Read Aloud">🔊</button>
              </div>
              <h2 className="result-title">{t('recommended_crops') || 'Recommended Crops'}</h2>

              <div className="crop-highlight floating-card">
                <div className="crop-icon moving-icon">🌾</div>
                <div className="crop-name">{t(recommendation.primaryCrop)}</div>
                <div className="crop-subtitle">{t('best_match') || 'Best Match for Your Soil'}</div>
              </div>

              <div className="result-grid">
                <div className="result-item">
                  <span className="result-label">{t('yield')}</span>
                  <span className="result-value">{recommendation.expected_yield} {t('unit_yield')}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">{t('profit')}</span>
                  <span className="result-value">{t('confidence')}: {recommendation.confidence}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">{t('season') || 'Season'}</span>
                  <span className="result-value">{t(recommendation.season)}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">{t('irrigation') || 'Irrigation'}</span>
                  <span className="result-value">{t(recommendation.irrigation)}</span>
                </div>
              </div>

              <div className="alternatives">
                <h4>{t('alternative_crops') || 'Alternative Crops'}</h4>
                <div className="crop-tags">
                  {recommendation.crops.slice(1).map((crop, i) => (
                    <span key={i} className="crop-tag">{t(crop)}</span>
                  ))}
                </div>
              </div>

              <div className="advice-box">
                <h4>💡 {t('expert_advice') || 'Expert Advice'}</h4>
                <p>{t(recommendation.notes)}</p>
                <p><strong>{t('fertilizer') || 'Fertilizer'}:</strong> {recommendation.fertilizer}</p>
              </div>
            </div>
          </div>
        )}

        {/* DISEASE DETECTION PAGE */}
        {page === 'disease' && (
          <div className="content-page">
            <button className="btn-back" onClick={() => setPage('home')}>
              ← {t('back') || 'Back'}
            </button>

            <div className="page-card">
              <div className="page-header">
                <div className="page-icon">📸</div>
                <div>
                  <h2 className="page-heading">{t('card_disease_title')}</h2>
                  <p className="page-subheading">{t('disease_instruction') || 'Upload a clear photo of the affected leaf'}</p>
                </div>
              </div>

              <div
                className="upload-area"
                onClick={() => document.getElementById('file-input').click()}
              >
                {image ? (
                  <img src={image} alt="Upload" className="uploaded-image" />
                ) : (
                  <div className="upload-placeholder">
                    <div className="upload-icon">☁️</div>
                    <div className="upload-text">{t('upload_instruction')}</div>
                    <div className="upload-hint">{t('upload_hint') || 'Click or drag image here'}</div>
                  </div>
                )}
              </div>
              <input
                type="file"
                id="file-input"
                hidden
                accept="image/*"
                onChange={e => {
                  if (e.target.files[0]) {
                    setImage(URL.createObjectURL(e.target.files[0]));
                    setSelectedFile(e.target.files[0]);
                    setDiseaseResult(null);
                  }
                }}
              />

              {image && !diseaseResult && (
                <div className="action-buttons">
                  {loading ? (
                    <div className="loader">{t('analyzing') || 'Analyzing...'}</div>
                  ) : (
                    <button className="btn-primary" onClick={analyzeDisease}>
                      {t('analyze_disease_btn')} 🔍
                    </button>
                  )}
                </div>
              )}

              {diseaseResult && (
                <div className="disease-result">
                  <div className="disease-header">
                    <div>
                      <h3>
                        {diseaseResult.is_plant
                          ? t(diseaseResult.disease_key)
                          : `${t('disease_unknown_object') || 'Unknown Object'} (${diseaseResult.debug_label})`}
                      </h3>
                      <div className="confidence-badge">{diseaseResult.confidence}</div>
                    </div>
                    <button onClick={readPageContent} className="btn-icon-input" style={{ fontSize: '1.5rem' }} title="Read Aloud">🔊</button>
                  </div>
                  <div className="severity-indicator">
                    <span>{t('severity') || 'Severity'}:</span>
                    <span className={`severity ${diseaseResult.severity_key.replace('severity_', '')}`}>
                      {t(diseaseResult.severity_key)}
                    </span>
                  </div>
                  <div className="remedy-section">
                    <h4>💊 {t('remedy')}</h4>
                    <p>{t(diseaseResult.remedy_key)}</p>
                  </div>
                  <div className="prevention-section">
                    <h4>🛡️ {t('prevention') || 'Prevention'}</h4>
                    <p>{t(diseaseResult.prevention_key)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MARKET PRICES PAGE */}
        {page === 'market' && (
          <div className="content-page">
            <button className="btn-back" onClick={() => setPage('home')}>
              ← {t('back') || 'Back'}
            </button>

            <div className="page-card">
              <div className="page-header">
                <div className="page-icon">💰</div>
                <div>
                  <h2 className="page-heading">{t('market_prices') || 'Market Prices'}</h2>
                  <p className="page-subheading">{t('market_updated') || 'Updated today at 10:00 AM'}</p>
                </div>
              </div>

              <div className="market-list">
                {marketPrices.map((item, i) => (
                  <div key={i} className="market-item">
                    <div className="market-crop">{t(item.crop)}</div>
                    <div className="market-price">{item.price}</div>
                    <div className={`market-trend ${item.trend === '↑' ? 'up' : item.trend === '↓' ? 'down' : 'stable'}`}>
                      {item.trend}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Chat Assistant */}
      <div className={`chat-widget ${showChat ? 'open' : 'closed'}`}>
        <div className="chat-header" onClick={() => setShowChat(!showChat)}>
          <span>💬 AI CONNECT </span>
          <span>{showChat ? '▼' : '▲'}</span>
        </div>
        {showChat && (
          <div className="chat-body">
            <div className="chat-messages">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`chat-message ${msg.role}`}>
                  <div className="message-avatar">{msg.role === 'bot' ? '🤖' : '👤'}</div>
                  <div className="message-text">{msg.text}</div>
                </div>
              ))}
            </div>
            <div className="chat-input-area">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && sendChat()}
                placeholder={t('type_message') || 'Type your question...'}
                className="chat-input"
              />
              <button
                onClick={startVoiceInput}
                className={`btn-voice ${isListening ? 'listening' : ''}`}
                title="Speak Now"
              >
                {isListening ? '🔴' : '🎤'}
              </button>
              <button onClick={sendChat} className="btn-send">➤</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;