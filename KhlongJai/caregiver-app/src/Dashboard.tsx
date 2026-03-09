import { useState, useEffect, useMemo, useRef } from 'react'
import { Heart, Wind, MapPin, ShieldCheck, Clock, Home, User, Phone, Navigation, ChevronRight, ChevronDown, AlertTriangle, LayoutDashboard } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import { useBroadcastSync } from './useBroadcastSync'
import './App.css'

// Leaflet Marker Icon Fix
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper to update map center
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center); }, [center, map]);
  return null;
}

// Helper for chart data generation
function gen(n: number, base: number, noise: number, mn: number, mx: number) {
  const pts: number[] = []; let v = base;
  for (let i = 0; i < n; i++) {
    v = Math.max(mn, Math.min(mx, v + (Math.random() - .47) * noise));
    pts.push(Math.round(v * 10) / 10);
  }
  return pts;
}

const MiniSpark = ({ id, history }: { id: string, history: number[] }) => {
  const isHR = id === 'hr';
  const pts = useMemo(() => {
      const data = history.slice(-30);
      if (data.length < 30) {
          const padding = gen(30 - data.length, data[0] || (isHR ? 72 : 98), 2, 60, 100);
          return [...padding, ...data];
      }
      return data;
  }, [history, isHR]);
  const mn = Math.min(...pts), mx = Math.max(...pts), W = 200, H = 26;
  const px = (i: number) => i / (pts.length - 1) * W;
  const py = (v: number) => H - (v - mn) / (mx - mn + .01) * (H - 4) - 2;
  let d = `M${px(0)},${py(pts[0])}`;
  for (let i = 1; i < pts.length; i++) {
    const m = (px(i - 1) + px(i)) / 2;
    d += ` Q${m},${py(pts[i - 1])} ${px(i)},${py(pts[i])}`;
  }
  const color = isHR ? '#A0522D' : '#3D6E4F';
  return (
    <div className="mini-spark">
      <svg viewBox="0 0 200 26" preserveAspectRatio="none" style={{ width: '100%', height: '26px' }}>
        <path d={`${d} L${W},${H} L0,${H} Z`} fill={color} opacity=".1" /><path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity=".7" />
      </svg>
    </div>
  );
};

const EmergencyOverlay = ({ data, onDismiss, onResolve, onCall, onFalseAlarm, address }: { data: any, onDismiss: () => void, onResolve: () => void, onCall: () => void, onFalseAlarm: () => void, address: string }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="emergency-overlay">
      <div className="overlay-top">
        <div className="overlay-logo">KhlongJai</div>
        <button className="overlay-dismiss" onClick={onDismiss}>Dismiss</button>
      </div>
      <div className="overlay-alarm">
        <div className="alarm-ring"><div className="alarm-ring-inner">🚨</div></div>
        {elapsed > 5 && (
          <div className="elapsed-badge">
            <div className="pulse-dot-wrap"><div className="pulse-dot-ring"></div><div className="pulse-dot-core"></div></div>
            <span className="badge-text" style={{ color: '#FCD34D' }}><span className="no-response-text">No response yet</span></span>
            <div className="badge-sep"></div>
            <span className="badge-timer" style={{ color: '#FDE68A' }}>{formatTime(elapsed)}</span>
          </div>
        )}
        <div className="alarm-label">{data.sos ? 'SOS ALERT' : 'FALL DETECTED'}</div>
        <div className="alarm-title">Somchai needs help</div>
        <div className="alarm-name">Grandfather · Age 74</div>
        <div className="alarm-location"><MapPin size={11} /> {address}</div>
        <div className="alarm-timer">
          <span className="timer-label">{data.sos ? 'Requested' : 'Detected'}</span>
          <span className="timer-val">{elapsed < 5 ? 'just now' : formatTime(elapsed)}</span>
          {elapsed >= 5 && <span className="timer-label" style={{ marginLeft: '4px' }}>ago</span>}
        </div>
      </div>
      <div className="overlay-vitals">
        <div className="ov-vital">
          <div className="ov-label">Heart Rate</div>
          <div><span className="ov-val">{data.hr}</span><span className="ov-unit"> BPM</span></div>
          <div className={`ov-status ${data.hr > 100 ? 'warn' : 'ok'}`}>{data.hr > 100 ? '↑ Elevated' : '✓ Normal'}</div>
        </div>
        <div className="ov-vital">
          <div className="ov-label">SpO₂</div>
          <div><span className="ov-val">{data.spo2}</span><span className="ov-unit"> %</span></div>
          <div className={`ov-status ${data.spo2 < 95 ? 'warn' : 'ok'}`}>{data.spo2 < 95 ? '↓ Low' : '✓ Normal'}</div>
        </div>
        <div className="ov-vital">
          <div className="ov-label">Movement</div>
          <div><span className="ov-val" style={{ fontSize: '22px' }}>{elapsed > 10 ? 'Still' : 'Active'}</span></div>
          <div className="ov-status warn">{elapsed > 10 ? formatTime(elapsed) : 'Moving'}</div>
        </div>
      </div>
      <div className="overlay-actions">
        <button className="btn-call" onClick={onCall}><Phone size={18} /> Call Somchai Now</button>
        <SlideToResolve onResolve={onResolve} />
        <button className="btn-map" style={{ marginTop: '10px' }}><Navigation size={15} /> View Live Location</button>
        <button className="btn-dismiss" onClick={onFalseAlarm}>This was a false alarm</button>
      </div>
    </div>
  );
};

const SlideToResolve = ({ onResolve }: { onResolve: () => void }) => {
  const [dragX, setDragX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const handleStart = (clientX: number) => { isDragging.current = true; startX.current = clientX - dragX; };
  const handleMove = (clientX: number) => {
    if (!isDragging.current || !containerRef.current) return;
    const maxDrag = containerRef.current.offsetWidth - 64;
    let newX = clientX - startX.current;
    newX = Math.max(0, Math.min(maxDrag, newX));
    setDragX(newX);
    if (newX >= maxDrag - 5) { isDragging.current = false; onResolve(); }
  };
  const handleEnd = () => { if (!isDragging.current) return; isDragging.current = false; setDragX(0); };
  return (
    <div className="slide-to-resolve" ref={containerRef}>
      <div className="slide-track-text">slide to resolve</div>
      <div className="slide-handle" style={{ transform: `translateX(${dragX}px)` }} onMouseDown={(e) => handleStart(e.clientX)} onTouchStart={(e) => handleStart(e.touches[0].clientX)} onMouseMove={(e) => handleMove(e.clientX)} onTouchMove={(e) => handleMove(e.touches[0].clientX)} onMouseUp={handleEnd} onMouseLeave={handleEnd} onTouchEnd={handleEnd}><ChevronRight size={24} /></div>
    </div>
  );
};

const VitalChart = ({ id, range, history, state }: { id: string, range: string, history: number[], state: string }) => {
  const isHR = id === 'hr';
  const displayData = useMemo(() => {
    const counts: Record<string, number> = { '6h': 72, '12h': 144, '24h': 288, '7d': 168 };
    const n = counts[range];
    if (history.length >= n) return history.slice(-n);
    const padding = gen(n - history.length, history[0] || (isHR ? 72 : 98), isHR ? 5 : 0.5, isHR ? 40 : 88, isHR ? 200 : 100);
    return [...padding, ...history];
  }, [range, history, isHR]);
  const getStateColor = () => {
    switch (state) {
      case 'watch': return '#D97706';
      case 'anomaly': return '#C45A1A';
      case 'emergency': return '#C0392B';
      default: return isHR ? '#A0522D' : '#3D6E4F';
    }
  };
  const color = getStateColor();
  const minY = isHR ? 40 : 88;
  const maxY = isHR ? 200 : 100;
  const W = 370, H = 100, padX = 4, padY = 8;
  const step = Math.max(1, Math.floor(displayData.length / 60));
  const pts: number[] = []; for (let i = 0; i < displayData.length; i += step) pts.push(displayData[i]);
  const yMin = Math.min(Math.min(...pts) - 4, minY), yMax = Math.max(Math.max(...pts) + 4, maxY);
  const px = (i: number) => padX + (i / (pts.length - 1)) * (W - padX * 2);
  const py = (v: number) => padY + (1 - (v - yMin) / (yMax - yMin)) * (H - padY * 2);
  let area = `M${px(0)},${H}`; pts.forEach((v, i) => { area += ` L${px(i)},${py(v)}`; }); area += ` L${px(pts.length - 1)},${H} Z`;
  let line = `M${px(0)},${py(pts[0])}`; for (let i = 1; i < pts.length; i++) { const mx0 = (px(i - 1) + px(i)) / 2; line += ` Q${mx0},${py(pts[i - 1])} ${px(i)},${py(pts[i])}`; }
  const gridLines = isHR ? [{ v: 60, l: '60' }, { v: 80, l: '80' }, { v: 100, l: '100' }] : [{ v: 95, l: '95%' }, { v: 98, l: '98%' }];
  const avg = Math.round(pts.reduce((a, b) => a + b, 0) / pts.length);
  const pMn = Math.min(...pts), pMx = Math.max(...pts);
  return (
    <div className="drawer-body">
      <div className="range-bar-wrap">
        <div className="range-label-row"><span className="range-lbl">{minY}{isHR ? ' BPM' : '%'}</span><span className="range-lbl" style={{ color: color, fontWeight: 600 }}>Normal {isHR ? '60–100' : '≥ 95%'}</span><span className="range-lbl">{isHR ? '200' : '100'}{isHR ? ' BPM' : '%'}</span></div>
        <div className="range-bar"><div className="range-fill" style={{ left: isHR ? '16%' : '58%', width: isHR ? '50%' : '42%', background: `${color}22` }}></div><div className="range-thumb" style={{ background: color, left: `${Math.max(2, Math.min(98, ((pts[pts.length - 1] - minY) / ((isHR ? 200 : 100) - minY)) * 100))}%` }}></div></div>
      </div>
      <div className="chart-wrap">
        <svg className="chart-svg" viewBox="0 0 370 100" preserveAspectRatio="none" height="100">
          <defs><linearGradient id="g-drawer" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".25" /><stop offset="85%" stopColor={color} stopOpacity=".02" /></linearGradient></defs>
          {gridLines.map(g => (
            <g key={g.v}><line x1="0" y1={py(g.v)} x2="370" y2={py(g.v)} stroke="#EAE5DF" strokeWidth="1" strokeDasharray="3 3" /><text x="368" y={py(g.v) - 3} textAnchor="end" fontSize="8" fill="#C8C2BC" fontFamily="DM Sans">{g.l}</text></g>
          ))}
          <path d={area} fill="url(#g-drawer)" /><path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /><circle cx={px(pts.length - 1)} cy={py(pts[pts.length - 1])} r="6" fill={color} opacity=".18" /><circle cx={px(pts.length - 1)} cy={py(pts[pts.length - 1])} r="3.5" fill={color} />
        </svg>
      </div>
      <div className="x-labels">{[0, 1, 2, 3, 4].map(i => (<span key={i} className="x-lbl">{range === '7d' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'][i] : `${12 + i}:00`}</span>))}</div>
      <div className="insight-strip">
        <div className="insight-pill"><div className="pip-dot" style={{ background: color }}></div><span style={{ color: 'var(--text-muted)' }}>Avg</span><span className="val">{avg}{isHR?' BPM':'%'}</span></div>
        <div className="insight-pill"><div className="pip-dot" style={{ background: '#6BAE80' }}></div><span style={{ color: 'var(--text-muted)' }}>Low</span><span className="val">{pMn}{isHR?' BPM':'%'}</span></div>
        <div className="insight-pill"><div className="pip-dot" style={{ background: color }}></div><span style={{ color: 'var(--text-muted)' }}>Peak</span><span className="val">{pMx}{isHR?' BPM':'%'}</span></div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [data, setData, requestSync] = useBroadcastSync<any>({ hr: 72, spo2: 98, sos: false, fall: false, lat: 0, lng: 0, lastUpdate: "" });
  const [hrHistory, setHrHistory] = useState<number[]>([]);
  const [spo2History, setSpo2History] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [range, setRange] = useState('6h');
  const [showIncident, setShowIncident] = useState(false);
  const [overlayActive, setOverlayActive] = useState(false);
  const [todayFallCount, setTodayFallCount] = useState(0);
  const [address, setAddress] = useState("Locating...");
  const [homeCoords, setHomeCoords] = useState({ lat: 0, lng: 0 });
  const [weekExpanded, setWeekExpanded] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [trendMetric, setTrendMetric] = useState('hr');
  const [lastIncident, setLastIncident] = useState<any>(null);
  const lastSyncTime = useRef("");
  const lastFetchedCoords = useRef({ lat: 0, lng: 0 });
  const audioCtx = useRef<AudioContext | null>(null);
  const sirenInterval = useRef<any>(null);
  const audioUnlocked = useRef(false);

  // Siren generator using Web Audio API
  const startSiren = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();
    if (sirenInterval.current) return;

    let high = true;
    const playTone = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle'; // Softer, "Warm Minimal" tone
      osc.frequency.setValueAtTime(high ? 780 : 520, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      high = !high;
    };

    playTone();
    sirenInterval.current = setInterval(playTone, 500);
  };

  const stopSiren = () => {
    if (sirenInterval.current) {
      clearInterval(sirenInterval.current);
      sirenInterval.current = null;
    }
  };

  // Play/Stop alert sound based on overlay state
  useEffect(() => {
    if (overlayActive && (data.sos || data.fall)) {
      startSiren();
    } else {
      stopSiren();
    }
    return () => stopSiren();
  }, [overlayActive, data.sos, data.fall]);

  const unlockAudio = () => {
    if (!audioUnlocked.current) {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      audioCtx.current.resume().then(() => {
        audioUnlocked.current = true;
        console.log("Audio system active.");
      });
    }
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setHomeCoords(coords);
    });
    // Proactively request sync on mount
    requestSync();
  }, []);

  useEffect(() => {
    if (data.lat === 0) return;
    const distMoved = Math.sqrt(Math.pow(data.lat - lastFetchedCoords.current.lat, 2) + Math.pow(data.lng - lastFetchedCoords.current.lng, 2));
    if (distMoved > 0.0005 || address === "Locating...") {
      const fetchAddress = async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${data.lat}&lon=${data.lng}&zoom=18&addressdetails=1`, { headers: { 'User-Agent': 'KhlongJai-Caregiver-App' } });
          const json = await res.json();
          const addr = json.address;
          const display = addr.suburb || addr.neighbourhood || addr.road || addr.village || addr.city || "Current Location";
          const city = addr.city || addr.province || addr.state || "";
          setAddress(city ? `${display}, ${city}` : display);
          lastFetchedCoords.current = { lat: data.lat, lng: data.lng };
        } catch (e) { console.error(e); }
      };
      const timeout = setTimeout(fetchAddress, 1000);
      return () => clearTimeout(timeout);
    }
  }, [data.lat, data.lng, address]);

  useEffect(() => {
    if (data.lastUpdate !== lastSyncTime.current && data.lastUpdate !== "") {
        if ((data.sos || data.fall) && !overlayActive) {
            setOverlayActive(true);
            if (data.fall && (!lastIncident || !lastIncident.active)) {
                setLastIncident({ active: true, time: new Date(), hr: data.hr, address: address, resolvedTime: null });
            }
        }
        lastSyncTime.current = data.lastUpdate;
        setHrHistory(prev => { const newHist = prev.length === 0 ? gen(288, data.hr, 10, 40, 200) : [...prev, data.hr]; return newHist.slice(-500); });
        setSpo2History(prev => { const newHist = prev.length === 0 ? gen(288, data.spo2, 1, 88, 100) : [...prev, data.spo2]; return newHist.slice(-500); });
    }
  }, [data, overlayActive, lastIncident, address]);

  const getStatus = (type: 'hr' | 'spo2', val: number) => {
    if (type === 'hr') {
      if (val > 140 || val < 40) return 'emergency';
      if (val > 120 || val < 50) return 'anomaly';
      if (val > 100 || val < 60) return 'watch';
      return 'normal';
    } else {
      if (val < 88) return 'emergency';
      if (val < 92) return 'anomaly';
      if (val < 95) return 'watch';
      return 'normal';
    }
  };

  const hrStatus = getStatus('hr', data.hr);
  const spo2Status = getStatus('spo2', data.spo2);
  const isAtHome = useMemo(() => {
    if (data.lat === 0 || homeCoords.lat === 0) return true;
    return Math.sqrt(Math.pow(data.lat - homeCoords.lat, 2) + Math.pow(data.lng - homeCoords.lng, 2)) < 0.001;
  }, [data.lat, data.lng, homeCoords]);
  const isEmergency = data.sos || data.fall || hrStatus === 'emergency' || spo2Status === 'emergency';
  const isAnomaly = hrStatus === 'anomaly' || spo2Status === 'anomaly';
  const isWatch = hrStatus === 'watch' || spo2Status === 'watch' || !isAtHome;
  const globalState = isEmergency ? 'emergency' : isAnomaly ? 'anomaly' : isWatch ? 'watch' : 'normal';

  const stateConfig: any = {
    normal: { heroIcon: '🌿', heroTitle: 'All is well', heroSub: 'Somchai is healthy and at home', badge: 'Normal' },
    watch: { heroIcon: isAtHome ? '👀' : '📍', heroTitle: isAtHome ? 'Worth keeping an eye on' : 'Somchai is out', heroSub: 'Vitals slightly elevated', badge: 'Watch' },
    anomaly: { heroIcon: '⚠️', heroTitle: 'Something needs attention', heroSub: 'Metric dropping, watching closely', badge: 'Anomaly' },
    emergency: { heroIcon: '🚨', heroTitle: data.sos ? 'SOS Alert!' : data.fall ? 'Fall detected!' : 'Emergency Alert!', heroSub: 'Somchai may need immediate help', badge: 'Emergency' },
  };

  const getBadgeLabel = (status: string) => ({ emergency: 'Emergency', anomaly: 'Anomaly', watch: 'Watch' }[status] || 'Normal');
  const getHeroSub = () => {
    if (data.fall) return 'Fall detected! Immediate help might be needed.';
    if (data.sos) return 'Somchai is requesting assistance.';
    if (hrStatus !== 'normal' && spo2Status !== 'normal') return 'Both heart rate and SpO₂ need attention.';
    if (hrStatus !== 'normal') return data.hr > 100 ? 'Heart rate is elevated / increasing.' : 'Heart rate is low / dropping.';
    if (spo2Status !== 'normal') return 'Blood oxygen level is dropping.';
    if (!isAtHome) return 'Somchai is currently away from home.';
    return 'Somchai is healthy and at home';
  };

  const cfg = stateConfig[globalState];

  const handleResolve = () => {
    if (data.fall) { setTodayFallCount(prev => prev + 1); setLastIncident((prev: any) => ({ ...prev, active: false, resolvedTime: new Date() })); }
    setData({ ...data, sos: false, fall: false, lastUpdate: new Date().toISOString() });
    setOverlayActive(false);
  };

  const handleFalseAlarm = () => { setLastIncident(null); setData({ ...data, sos: false, fall: false, lastUpdate: new Date().toISOString() }); setOverlayActive(false); };
  const handleCall = () => { window.open('tel:911'); handleResolve(); };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayDataMock = [
    { state: 'clear', icon: '✓', date: 'Monday, 3 Mar', hrAvg: 69, hrMin: 57, hrMax: 88, spo2Avg: 97, spo2Min: 95, activity: 'Light', events: [{ time: '07:20', icon: '🌅', text: '<strong>Woke up</strong> · HR 68 BPM' }, { time: '10:00', icon: '🚶', text: '<strong>Morning walk</strong> · 18 min · HR peaked 88' }, { time: '22:10', icon: '😴', text: '<strong>Sleep</strong> · HR settled 58 BPM' }] },
    { state: 'clear', icon: '✓', date: 'Tuesday, 4 Mar', hrAvg: 74, hrMin: 60, hrMax: 96, spo2Avg: 98, spo2Min: 96, activity: 'Moderate', events: [{ time: '08:00', icon: '🌅', text: '<strong>Woke up</strong> · HR 70 BPM' }, { time: '15:30', icon: '🚶', text: '<strong>Afternoon walk</strong> · 25 min · HR peaked 96' }, { time: '21:45', icon: '😴', text: '<strong>Sleep</strong> · HR 61 BPM' }] },
    { state: 'watch', icon: '⚠', date: 'Wednesday, 5 Mar', hrAvg: 82, hrMin: 62, hrMax: 108, spo2Avg: 97, spo2Min: 94, activity: 'Elevated HR', events: [{ time: '08:10', icon: '🌅', text: '<strong>Woke up</strong> · HR 74 BPM' }, { time: '13:00', icon: '⚠️', text: '<strong>HR elevated</strong> · Peaked 108 BPM for 8 min' }, { time: '14:30', icon: '✓', text: 'HR returned to normal · 72 BPM' }, { time: '22:30', icon: '😴', text: '<strong>Sleep</strong> · HR 62 BPM' }] },
    { state: 'fall', icon: '!', date: 'Thursday, 6 Mar', hrAvg: 77, hrMin: 58, hrMax: 118, spo2Avg: 96, spo2Min: 93, activity: '1 fall detected', events: [{ time: '08:00', icon: '🌅', text: '<strong>Woke up</strong> · HR 66 BPM' }, { time: '14:32', icon: '🚨', text: '<strong>Fall detected</strong> · HR spiked 118 · Living room', highlight: true }, { time: '14:40', icon: '📞', text: 'Caregiver responded · 8 min after fall' }, { time: '15:10', icon: '✓', text: 'All clear · Somchai confirmed okay' }, { time: '22:00', icon: '😴', text: '<strong>Sleep</strong> · HR 58 BPM' }] },
    { state: 'clear', icon: '✓', date: 'Friday, 7 Mar', hrAvg: 68, hrMin: 55, hrMax: 84, spo2Avg: 98, spo2Min: 96, activity: 'Restful', events: [{ time: '08:30', icon: '🌅', text: '<strong>Woke up</strong> · HR 65 BPM' }, { time: '11:00', icon: '🚶', text: '<strong>Short walk</strong> · 12 min · HR peaked 84' }, { time: '22:00', icon: '😴', text: '<strong>Sleep</strong> · HR 55 BPM' }] },
    { state: 'clear', icon: '✓', date: 'Saturday, 8 Mar', hrAvg: 72, hrMin: 58, hrMax: 90, spo2Avg: 99, spo2Min: 97, activity: 'Normal', events: [{ time: '07:50', icon: '🌅', text: '<strong>Woke up</strong> · HR 68 BPM' }, { time: '14:00', icon: '🚶', text: '<strong>Walk</strong> · 20 min · HR peaked 90' }, { time: '23:00', icon: '😴', text: '<strong>Sleep</strong> · HR 58 BPM' }] },
    { state: todayFallCount > 0 ? 'fall' : 'clear', icon: todayFallCount > 0 ? '!' : '✓', date: 'Sunday, 9 Mar', hrAvg: Math.round(data.hr), hrMin: 60, hrMax: Math.round(data.hr), spo2Avg: Math.round(data.spo2), spo2Min: 95, activity: todayFallCount > 0 ? `${todayFallCount} fall detected` : 'Normal', events: todayFallCount > 0 ? [{ time: 'Detected', icon: '🚨', text: `Fall detected today. ${todayFallCount} incident(s).` }] : [{ time: 'Live', icon: '✓', text: 'Monitoring continuously' }] },
  ];

  return (
    <div className="dashboard-container" onClick={unlockAudio}>
      <div className={`urgency-aura ${isEmergency ? 'active' : ''}`} />
      {overlayActive && (data.sos || data.fall) && <EmergencyOverlay data={data} onDismiss={() => setOverlayActive(false)} onResolve={handleResolve} onCall={handleCall} onFalseAlarm={handleFalseAlarm} address={address} />}
      <div className="topbar">
        <div className="logo">KhlongJai</div>
        <div style={{ fontFamily: 'DM Serif Display', fontSize: '18px' }}>Dashboard</div>
      </div>

      <div className="scroll-area">
        <div className={`hero ${globalState}`} style={{ cursor: (data.sos || data.fall) ? 'pointer' : 'default' }} onClick={() => (data.sos || data.fall) && setOverlayActive(true)}>
          <div className="hero-icon">{cfg.heroIcon}</div>
          <div><div className="hero-title">{cfg.heroTitle}</div><div className="hero-sub">{getHeroSub()}</div><div className="live-row"><span className="live-dot"></span><span className="live-text">Live · Updated {new Date(data.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div></div>
        </div>

        <div className="vitals-row">
          <div className={`vital-card state-${hrStatus} ${activeTab === 'hr' ? 'drawer-open' : ''}`} onClick={() => setActiveTab(activeTab === 'hr' ? null : 'hr')}>
            <div className="vital-top"><div className="vital-label"><svg className="pulse-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A0522D" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> Heart Rate</div><div><span className="vital-num">{data.hr}</span><span className="vital-unit">BPM</span></div><div className="vital-badge">{getBadgeLabel(hrStatus)}</div></div>
            <MiniSpark id="hr" history={hrHistory} /><div className="tap-hint">Trend <span className="tap-arrow">▾</span></div>
          </div>
          <div className={`vital-card state-${spo2Status} ${activeTab === 'spo2' ? 'drawer-open' : ''}`} onClick={() => setActiveTab(activeTab === 'spo2' ? null : 'spo2')}>
            <div className="vital-top"><div className="vital-label"><svg className="pulse-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3D6E4F" strokeWidth="2.5"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/></svg> SpO₂</div><div><span className="vital-num">{data.spo2}</span><span className="vital-unit">%</span></div><div className="vital-badge">{getBadgeLabel(spo2Status)}</div></div>
            <MiniSpark id="spo2" history={spo2History} /><div className="tap-hint">Trend <span className="tap-arrow">▾</span></div>
          </div>
          {activeTab && (
            <div className={`chart-drawer open state-${activeTab === 'hr' ? hrStatus : spo2Status}`}>
              <div className="drawer-header"><div className="drawer-title">{activeTab === 'hr' ? 'Heart Rate' : 'Blood Oxygen'}<div className="drawer-pill" style={{ background: 'var(--state-normal-badge-bg)', color: 'var(--state-normal-badge)' }}>{getBadgeLabel(activeTab === 'hr' ? hrStatus : spo2Status)}</div></div></div>
              <div className="time-tabs">{['6h', '12h', '24h', '7d'].map(r => (<button key={r} className={`ttab ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>{r}</button>))}</div>
              <VitalChart id={activeTab} range={range} history={activeTab === 'hr' ? hrHistory : spo2History} state={activeTab === 'hr' ? hrStatus : spo2Status} />
            </div>
          )}
        </div>

        <div className={`fall-card ${data.fall ? 'state-emergency' : ''}`}>
          <div className="sensor-row">
            <div className="sensor-left"><div><div className="sensor-name">Fall Detection</div><div className="sensor-sub">Wristband · Active</div></div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="sensor-on"><span className="sensor-dot"></span>ON</div>
              <div className="sensor-since">
                {data.fall ? (<span style={{ color: 'var(--red)', fontWeight: 700 }}>Active Alert</span>) : todayFallCount > 0 ? (<>0 hrs safe<span>since today's fall</span></>) : (<>47 hrs safe<span>since last fall</span></>)}
              </div>
            </div>
          </div>
          <div className="safe-summary">
            <div className="safe-icon">{data.fall ? '🚨' : '🧍'}</div>
            <div><div className="safe-title" style={{ color: data.fall ? 'var(--red)' : 'var(--green)' }}>{data.fall ? 'Fall detected!' : 'No falls detected'}</div><div className="safe-sub">{data.fall ? 'Somchai has fallen now' : 'Monitoring continuously · All clear'}</div></div>
          </div>
          <div className="history-grid">
            <div className="history-label">Last 7 days<div className="history-legend"><div className="hleg"><div className="hleg-dot" style={{ background: 'var(--green)' }}></div>Clear</div><div className="hleg"><div className="hleg-dot" style={{ background: 'var(--red)' }}></div>Fall</div></div></div>
            <div className="history-days">
              {weekDays.map((day, i) => {
                const isToday = i === 6;
                const hasIncident = (i === 3) || (isToday && (data.fall || todayFallCount > 0));
                return (
                  <div key={i} className={`hday ${isToday ? 'today' : ''}`} onClick={() => (i === 3 || (isToday && (data.fall || todayFallCount > 0))) ? setShowIncident(!showIncident) : setShowIncident(false)}>
                    <div className="hday-name">{day[0]}</div>
                    <div className={`hday-dot ${hasIncident ? 'incident' : 'clear'}`}></div>
                    <div className={`hday-count ${hasIncident ? 'red' : ''}`}>{(isToday && todayFallCount > 0) ? todayFallCount : i === 3 ? '1' : ''}</div>
                  </div>
                )
              })}
            </div>
          </div>
          {(showIncident || data.fall) && (
            <div className="incident-row">
              <div className="incident-icon">⚠️</div>
              <div>
                <div className="incident-title">Fall detected — {data.fall || (todayFallCount > 0 && selectedDay === null) || selectedDay === 6 ? 'Today' : 'Thursday 6 Mar'}</div>
                <div className="incident-detail">Detected at {data.fall ? (lastIncident?.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'just now') : (lastIncident?.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '14:32')} · {data.fall ? address : (lastIncident?.address || 'Living room area')}<br />HR spiked to {data.fall ? data.hr : (lastIncident?.hr || '118')} BPM at time of fall</div>
                {(!data.fall && (todayFallCount > 0 && selectedDay === null || selectedDay === 6) && lastIncident?.resolvedTime) && (
                    <div className="incident-resolved">✓ Resolved · Caregiver responded {Math.round((lastIncident.resolvedTime.getTime() - lastIncident.time.getTime()) / 60000)} min later</div>
                )}
                {(!data.fall && selectedDay === 3) && (<div className="incident-resolved">✓ Resolved · Caregiver responded 8 min later</div>)}
              </div>
            </div>
          )}
        </div>

        <div className={`week-card ${weekExpanded ? 'expanded' : ''}`}>
          <div className="week-header" onClick={() => setWeekExpanded(!weekExpanded)}>
            <div className="week-header-left"><h3>This Week</h3><p>3 Mar – 9 Mar · Somchai</p></div>
            <div className="week-header-right">
              {todayFallCount > 0 && <div className="week-summary-badge" style={{ background: 'var(--c-fall-bg)', color: 'var(--c-fall)', border: '1px solid var(--c-fall-b)' }}><AlertTriangle size={10} /> {todayFallCount} incident</div>}
              <div className="week-chevron"><ChevronDown size={16} /></div>
            </div>
          </div>
          <div className="day-pills">
            {weekDays.map((d, i) => (
              <div key={i} className={`day-pill ${dayDataMock[i].state} ${selectedDay === i ? 'selected' : ''} ${i === 6 ? 'today' : ''}`} onClick={(e) => { e.stopPropagation(); if (!weekExpanded) setWeekExpanded(true); setSelectedDay(selectedDay === i ? null : i); }}>
                <div className="pill-name">{d}</div>
                <div className="pill-icon">{dayDataMock[i].icon}</div>
                <div className="pill-dot"></div>
              </div>
            ))}
          </div>
          <div className="week-body">
            <div className={`day-detail ${selectedDay !== null ? 'open' : ''}`}>
              {selectedDay !== null && (
                <div className="detail-inner">
                  <div className="detail-date">{dayDataMock[selectedDay].date} <span className="detail-state-badge" style={{ background: `var(--c-${dayDataMock[selectedDay].state}-bg)`, color: `var(--c-${dayDataMock[selectedDay].state})` }}>{dayDataMock[selectedDay].state === 'clear' ? 'All Clear' : dayDataMock[selectedDay].state === 'watch' ? 'Watch' : 'Fall Detected'}</span></div>
                  <div className="detail-stats">
                    <div className="dstat"><div className="dstat-label">❤ Avg HR</div><div className="dstat-val">{dayDataMock[selectedDay].hrAvg} <span className="dstat-unit">BPM</span></div><div className="dstat-sub">{dayDataMock[selectedDay].hrMin}-{dayDataMock[selectedDay].hrMax}</div></div>
                    <div className="dstat"><div className="dstat-label">💧 SpO₂</div><div className="dstat-val">{dayDataMock[selectedDay].spo2Avg} <span className="dstat-unit">%</span></div><div className="dstat-sub">Min {dayDataMock[selectedDay].spo2Min}%</div></div>
                    <div className="dstat"><div className="dstat-label">🚶 Activity</div><div className="dstat-val" style={{ fontSize: '14px', paddingTop: '4px' }}>{dayDataMock[selectedDay].activity}</div></div>
                  </div>
                  <div className="detail-events">
                    {dayDataMock[selectedDay].events.map((ev, ei) => (
                      <div key={ei} className={`event-row ${ev.highlight ? 'highlight' : ''}`}><span className="event-time">{ev.time}</span><span className="event-icon">{ev.icon}</span><span className="event-text" dangerouslySetInnerHTML={{ __html: ev.text }}></span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="insight-callout warning">
              <div className="insight-icon">💡</div>
              <div className="insight-text"><strong>{todayFallCount > 0 ? 'Incident today' : '1 fall this week'}</strong> on {todayFallCount > 0 ? 'Sunday' : 'Thursday'} — check in with Somchai later today.</div>
            </div>
            <div className="trend-section">
              <div className="trend-header">
                <div className="trend-title">{trendMetric === 'hr' ? 'Heart Rate' : 'Blood Oxygen'} — 7 day trend</div>
                <div className="trend-tabs">
                  <button className={`ttab ${trendMetric === 'hr' ? 'active' : ''}`} onClick={() => setTrendMetric('hr')}>HR</button>
                  <button className={`ttab ${trendMetric === 'spo2' ? 'active' : ''}`} onClick={() => setTrendMetric('spo2')}>SpO₂</button>
                </div>
              </div>
              <div className="trend-chart-wrap">
                <svg className="trend-svg" viewBox="0 0 370 80" height="80" preserveAspectRatio="none">
                  <path d="M0,60 Q50,20 100,55 T200,40 T370,50" fill="none" stroke={trendMetric === 'hr' ? '#A0522D' : '#3D6E4F'} strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="loc-card">
          <div className="loc-header"><div><div className="loc-label"><MapPin size={10} /> Live Location</div><div className="loc-name">{data.lat === 0 ? 'Locating...' : (isAtHome ? '🏠 Home' : '📍 Away')}</div><div className="loc-sub">{address} · {data.lastUpdate ? new Date(data.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Waiting for sync...'}</div></div><div className="geo-badge">Safe zone</div></div>
          <div className="map-box">
            {data.lat === 0 ? (
              <div className="map-loading" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', color: '#999', fontSize: '12px' }}>Initializing GPS...</div>
            ) : (
              <MapContainer center={[data.lat, data.lng]} zoom={15} zoomControl={false} attributionControl={false} style={{ height: '100%', width: '100%' }}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Marker position={[data.lat, data.lng]} /><ChangeView center={[data.lat, data.lng]} /></MapContainer>
            )}
          </div>
        </div>
      </div>
      <nav className="bottom-nav">
        <Link to="/" className="ni on"><Clock size={21} /><span className="ni-lbl">Dashboard</span></Link>
        <Link to="/map" className="ni"><MapPin size={21} /><span className="ni-lbl">Map</span></Link>
        <Link to="/vitals" className="ni"><Heart size={21} /><span className="ni-lbl">Vitals</span></Link>
        <Link to="/profile" className="ni"><User size={21} /><span className="ni-lbl">Profile</span></Link>
      </nav>
    </div>
  )
}
