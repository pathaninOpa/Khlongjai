import { useState, useEffect } from 'react'
import { db } from './firebase'
import { doc, setDoc } from 'firebase/firestore'
import { Heart, Activity, AlertTriangle, MapPin, Wind } from 'lucide-react'
import './App.css'

const DEVICE_ID = "elderly-01"; // Mock device ID

function App() {
  const [hr, setHr] = useState(75)
  const [spo2, setSpo2] = useState(98)
  const [isAuto, setIsAuto] = useState(true)
  const [location, setLocation] = useState({ lat: 13.7563, lng: 100.5018 }) // Bangkok default

  // Update Firestore every 5 seconds if not in SOS
  useEffect(() => {
    let interval: number;
    if (isAuto) {
      interval = setInterval(() => {
        const newHr = 70 + Math.floor(Math.random() * 20)
        const newSpo2 = 95 + Math.floor(Math.random() * 5)
        setHr(newHr)
        setSpo2(newSpo2)
        updateStatus(newHr, newSpo2, false, false)
      }, 5000)
    }
    return () => clearInterval(interval)
  }, [isAuto])

  // Geolocation stream
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  const updateStatus = async (newHr: number, newSpo2: number, sos: boolean, fall: boolean) => {
    if (!db) {
      console.log("Firebase not configured. Local state updated only.");
      return;
    }
    try {
      await setDoc(doc(db, "devices", DEVICE_ID), {
        hr: newHr,
        spo2: newSpo2,
        sos,
        fall,
        lat: location.lat,
        lng: location.lng,
        lastUpdate: new Date().toISOString()
      }, { merge: true })
    } catch (e) {
      console.error("Error updating status: ", e)
    }
  }

  const triggerSOS = () => {
    updateStatus(hr, spo2, true, false)
    alert("SOS Sent!")
  }

  const triggerFall = () => {
    updateStatus(hr, spo2, false, true)
    alert("Fall Detected (Simulated)!")
  }

  const resetStatus = () => {
    updateStatus(hr, spo2, false, false)
  }

  return (
    <div className="wearable-container">
      <header>
        <h1>KhlongJai Wear</h1>
        <p>Mockup Device: {DEVICE_ID} {!db && "(Demo Mode)"}</p>
      </header>

      <div className="status-grid">
        <div className="card">
          <Heart color="#ff4757" size={32} />
          <h3>Heart Rate</h3>
          <div className="value">{hr} <span>BPM</span></div>
          <input 
            type="range" min="40" max="180" value={hr} 
            onChange={(e) => { setHr(Number(e.target.value)); setIsAuto(false); updateStatus(Number(e.target.value), spo2, false, false) }} 
          />
        </div>

        <div className="card">
          <Wind color="#2ed573" size={32} />
          <h3>Oxygen (SpO2)</h3>
          <div className="value">{spo2} <span>%</span></div>
          <input 
            type="range" min="80" max="100" value={spo2} 
            onChange={(e) => { setSpo2(Number(e.target.value)); setIsAuto(false); updateStatus(hr, Number(e.target.value), false, false) }} 
          />
        </div>
      </div>

      <div className="control-panel">
        <button className="sos-btn" onClick={triggerSOS}>
          <AlertTriangle size={24} /> TRIGGER SOS
        </button>
        <button className="fall-btn" onClick={triggerFall}>
          <Activity size={24} /> SIMULATE FALL
        </button>
        <button className="reset-btn" onClick={resetStatus}>
          RESET ALERTS
        </button>
      </div>

      <div className="info-panel">
        <p><MapPin size={16} /> Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}</p>
        <label>
          <input type="checkbox" checked={isAuto} onChange={(e) => setIsAuto(e.target.checked)} />
          Auto-generate Vitals
        </label>
      </div>
    </div>
  )
}

export default App
