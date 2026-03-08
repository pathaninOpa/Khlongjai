import { useState, useEffect, useRef } from 'react'
import { Heart, Activity, AlertTriangle, MapPin, Wind, RotateCcw } from 'lucide-react'
import { useBroadcastSync } from './useBroadcastSync'
import './Wearable.css'

const DEVICE_ID = "elderly-01";

export default function Wearable() {
  const [data, setData] = useBroadcastSync<any>({
    hr: 72,
    spo2: 98,
    sos: false,
    fall: false,
    lat: 13.7563,
    lng: 100.5018,
    lastUpdate: new Date().toISOString()
  });

  const [isAuto, setIsAuto] = useState(true);
  const dataRef = useRef(data);

  // Keep ref in sync with state for the worker/interval to access latest data
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!isAuto) return;

    // Use a Web Worker blob to prevent background throttling
    const workerCode = `
      let interval;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          interval = setInterval(() => self.postMessage('tick'), 5000);
        } else if (e.data === 'stop') {
          clearInterval(interval);
        }
      };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = () => {
      // Only update if no active emergency
      if (!dataRef.current.sos && !dataRef.current.fall) {
        const newHr = 70 + Math.floor(Math.random() * 15);
        const newSpo2 = 96 + Math.floor(Math.random() * 4);
        
        setData({
          ...dataRef.current,
          hr: newHr,
          spo2: newSpo2,
          lastUpdate: new Date().toISOString()
        });
      }
    };

    worker.postMessage('start');

    return () => {
      worker.postMessage('stop');
      worker.terminate();
    };
  }, [isAuto, setData]);

  const updateStatus = (updates: any) => {
    setData({
      ...data,
      ...updates,
      lastUpdate: new Date().toISOString()
    });
  };

  return (
    <div className={`wearable-container ${data.sos || data.fall ? 'emergency' : ''}`}>
      <header>
        <div className="status-indicator">
          <div className="dot online"></div>
          Background Sync Enabled
        </div>
        <h1>KhlongJai Wear</h1>
        <p>Device: {DEVICE_ID}</p>
      </header>

      <div className="vitals-section">
        <div className="card-wear">
          <div className="card-header-wear">
            <Heart color="#D94F4F" size={20} />
            <span>HEART RATE</span>
          </div>
          <div className="card-value-wear">{data.hr}<span className="unit-wear">BPM</span></div>
          <input 
            type="range" min="40" max="200" value={data.hr} 
            onChange={(e) => { 
                setIsAuto(false); 
                updateStatus({ hr: Number(e.target.value) });
            }} 
          />
        </div>

        <div className="card-wear">
          <div className="card-header-wear">
            <Wind color="#3D6E4F" size={20} />
            <span>SPO2 %</span>
          </div>
          <div className="card-value-wear">{data.spo2}<span className="unit-wear">%</span></div>
          <input 
            type="range" min="85" max="100" value={data.spo2} 
            onChange={(e) => { 
                setIsAuto(false); 
                updateStatus({ spo2: Number(e.target.value) });
            }} 
          />
        </div>
      </div>

      <div className="emergency-controls">
        <button className={`sos-trigger ${data.sos ? 'active' : ''}`} onClick={() => updateStatus({ sos: true, fall: false })} disabled={data.sos}>
          <AlertTriangle size={24} /> {data.sos ? 'SOS SENT' : 'TRIGGER SOS'}
        </button>
        <button className={`fall-trigger ${data.fall ? 'active' : ''}`} onClick={() => updateStatus({ fall: true, sos: false })} disabled={data.fall}>
          <Activity size={24} /> {data.fall ? 'FALL DETECTED' : 'SIMULATE FALL'}
        </button>
        {(data.sos || data.fall) && (
          <button className="reset-trigger" onClick={() => updateStatus({ sos: false, fall: false })}>
            <RotateCcw size={20} /> RESOLVE INCIDENT
          </button>
        )}
      </div>

      <div className="wearable-footer">
        <div className="loc-badge">
          <MapPin size={14} /> {data.lat.toFixed(4)}, {data.lng.toFixed(4)}
        </div>
        <label className="toggle-label">
          <input type="checkbox" checked={isAuto} onChange={(e) => setIsAuto(e.target.checked)} />
          Auto-simulating
        </label>
      </div>
    </div>
  )
}
