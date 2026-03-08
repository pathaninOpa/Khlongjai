import { useState, useEffect, useMemo, useRef } from 'react'
import { Heart, Wind, MapPin, ShieldCheck, Clock, Home, User, Phone, Navigation } from 'lucide-react'
import { useBroadcastSync } from './useBroadcastSync'
import './App.css'

// Helper for chart data generation
function gen(n: number, base: number, noise: number, mn: number, mx: number) {
  const pts: number[] = []; let v = base;
  for (let i = 0; i < n; i++) {
    v = Math.max(mn, Math.min(mx, v + (Math.random() - .47) * noise));
    pts.push(Math.round(v * 10) / 10);
  }
  return pts;
}

function nightDip(arr: number[]) {
  const s = Math.floor(arr.length * .25), e = Math.floor(arr.length * .44);
  const newArr = [...arr];
  for (let i = s; i < e; i++) newArr[i] = Math.max(56, Math.round(newArr[i] * .82));
  return newArr;
}

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
  const pts: number[] = [];
  for (let i = 0; i < displayData.length; i += step) pts.push(displayData[i]);
  const yMin = Math.min(Math.min(...pts) - 4, minY), yMax = Math.max(Math.max(...pts) + 4, maxY);
  const px = (i: number) => padX + (i / (pts.length - 1)) * (W - padX * 2);
  const py = (v: number) => padY + (1 - (v - yMin) / (yMax - yMin)) * (H - padY * 2);

  let area = `M${px(0)},${H}`;
  pts.forEach((v, i) => { area += ` L${px(i)},${py(v)}`; });
  area += ` L${px(pts.length - 1)},${H} Z`;

  let line = `M${px(0)},${py(pts[0])}`;
  for (let i = 1; i < pts.length; i++) {
    const mx0 = (px(i - 1) + px(i)) / 2;
    line += ` Q${mx0},${py(pts[i - 1])} ${px(i)},${py(pts[i])}`;
  }

  const gridLines = isHR ? [{ v: 60, l: '60' }, { v: 80, l: '80' }, { v: 100, l: '100' }] : [{ v: 95, l: '95%' }, { v: 98, l: '98%' }];
  const avg = Math.round(pts.reduce((a, b) => a + b, 0) / pts.length);
  const pMn = Math.min(...pts), pMx = Math.max(...pts);

  return (
    <div className="drawer-body">
      <div className="range-bar-wrap">
        <div className="range-label-row">
          <span className="range-lbl">{minY}{isHR ? ' BPM' : '%'}</span>
          <span className="range-lbl" style={{ color: color, fontWeight: 600 }}>Normal {isHR ? '60–100' : '≥ 95%'}</span>
          <span className="range-lbl">{isHR ? '200' : '100'}{isHR ? ' BPM' : '%'}</span>
        </div>
        <div className="range-bar">
          <div className="range-fill" style={{ left: isHR ? '16%' : '58%', width: isHR ? '50%' : '42%', background: `${color}22` }}></div>
          <div className="range-thumb" style={{ background: color, left: `${Math.max(2, Math.min(98, ((pts[pts.length - 1] - minY) / ((isHR ? 200 : 100) - minY)) * 100))}%` }}></div>
        </div>
      </div>
      <div className="chart-wrap">
        <svg className="chart-svg" viewBox="0 0 370 100" preserveAspectRatio="none" height="100">
          <defs><linearGradient id="g-drawer" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".25" /><stop offset="85%" stopColor={color} stopOpacity=".02" /></linearGradient></defs>
          {gridLines.map(g => (
            <g key={g.v}>
              <line x1="0" y1={py(g.v)} x2="370" y2={py(g.v)} stroke="#EAE5DF" strokeWidth="1" strokeDasharray="3 3" />
              <text x="368" y={py(g.v) - 3} textAnchor="end" fontSize="8" fill="#C8C2BC" fontFamily="DM Sans">{g.l}</text>
            </g>
          ))}
          <path d={area} fill="url(#g-drawer)" />
          <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={px(pts.length - 1)} cy={py(pts[pts.length - 1])} r="6" fill={color} opacity=".18" />
          <circle cx={px(pts.length - 1)} cy={py(pts[pts.length - 1])} r="3.5" fill={color} />
        </svg>
      </div>
      <div className="x-labels">
        {[0, 1, 2, 3, 4].map(i => (
            <span key={i} className="x-lbl">{range === '7d' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'][i] : `${12 + i}:00`}</span>
        ))}
      </div>
      <div className="insight-strip">
        <div className="insight-pill"><div className="pip-dot" style={{ background: color }}></div><span style={{ color: 'var(--text-muted)' }}>Avg</span><span className="val">{avg}{isHR?' BPM':'%'}</span></div>
        <div className="insight-pill"><div className="pip-dot" style={{ background: '#6BAE80' }}></div><span style={{ color: 'var(--text-muted)' }}>Low</span><span className="val">{pMn}{isHR?' BPM':'%'}</span></div>
        <div className="insight-pill"><div className="pip-dot" style={{ background: color }}></div><span style={{ color: 'var(--text-muted)' }}>Peak</span><span className="val">{pMx}{isHR?' BPM':'%'}</span></div>
      </div>
    </div>
  );
};

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

const EmergencyOverlay = ({ data, onDismiss }: { data: any, onDismiss: () => void }) => {
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
            <div className="pulse-dot-wrap">
              <div className="pulse-dot-ring"></div>
              <div className="pulse-dot-core"></div>
            </div>
            <span className="badge-text" style={{ color: '#FCD34D' }}>
              <span className="no-response-text">No response yet</span>
            </span>
            <div className="badge-sep"></div>
            <span className="badge-timer" style={{ color: '#FDE68A' }}>{formatTime(elapsed)}</span>
          </div>
        )}
        <div className="alarm-label">{data.sos ? 'SOS ALERT' : 'FALL DETECTED'}</div>
        <div className="alarm-title">Somchai has {data.sos ? 'requested help' : 'fallen'}</div>
        <div className="alarm-name">Grandfather · Age 74</div>
        <div className="alarm-location"><MapPin size={11} /> Bedroom · Home</div>
        <div className="alarm-timer"><span className="timer-label">{data.sos ? 'Requested' : 'Detected'}</span><span className="timer-val">{elapsed < 5 ? 'just now' : formatTime(elapsed)}</span></div>
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
        <button className="btn-call"><Phone size={18} /> Call Somchai Now</button>
        <button className="btn-map"><Navigation size={15} /> View Live Location</button>
        <button className="btn-dismiss" onClick={onDismiss}>This was a false alarm</button>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useBroadcastSync<any>({ hr: 72, spo2: 98, sos: false, fall: false, lat: 13.7563, lng: 100.5018, lastUpdate: new Date().toISOString() });
  const [hrHistory, setHrHistory] = useState<number[]>([]);
  const [spo2History, setSpo2History] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [range, setRange] = useState('6h');
  const [showIncident, setShowIncident] = useState(false);
  const lastSyncTime = useRef("");

  useEffect(() => {
    if (data.lastUpdate !== lastSyncTime.current) {
        lastSyncTime.current = data.lastUpdate;
        setHrHistory(prev => {
            const newHist = prev.length === 0 ? gen(288, data.hr, 10, 40, 200) : [...prev, data.hr];
            return newHist.slice(-500);
        });
        setSpo2History(prev => {
            const newHist = prev.length === 0 ? gen(288, data.spo2, 1, 88, 100) : [...prev, data.spo2];
            return newHist.slice(-500);
        });
    }
  }, [data]);

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
  const isEmergency = data.sos || data.fall || hrStatus === 'emergency' || spo2Status === 'emergency';
  const isAnomaly = hrStatus === 'anomaly' || spo2Status === 'anomaly';
  const isWatch = hrStatus === 'watch' || spo2Status === 'watch';
  const globalState = isEmergency ? 'emergency' : isAnomaly ? 'anomaly' : isWatch ? 'watch' : 'normal';

  const stateConfig: any = {
    normal:    { heroIcon:'🌿', heroTitle:'All is well', heroSub:'Somchai is healthy and at home', badge:'Normal' },
    watch:     { heroIcon:'👀', heroTitle:'Worth keeping an eye on', heroSub:'Vitals slightly elevated', badge:'Watch' },
    anomaly:   { heroIcon:'⚠️', heroTitle:'Something needs attention', heroSub:'Metric dropping, watching closely', badge:'Anomaly' },
    emergency: { heroIcon:'🚨', heroTitle: data.sos ? 'SOS Alert!' : data.fall ? 'Fall detected!' : 'Emergency Alert!', heroSub:'Somchai may need immediate help', badge:'Emergency' },
  };

  const getBadgeLabel = (status: string) => {
    switch (status) {
      case 'emergency': return 'Emergency';
      case 'anomaly': return 'Anomaly';
      case 'watch': return 'Watch';
      default: return 'Normal';
    }
  };

  const getHeroSub = () => {
    if (data.fall) return 'Fall detected! Immediate help might be needed.';
    if (data.sos) return 'Somchai is requesting assistance.';
    const hrAlert = hrStatus !== 'normal';
    const spo2Alert = spo2Status !== 'normal';
    if (hrAlert && spo2Alert) return 'Both heart rate and SpO₂ need attention.';
    if (hrAlert) return data.hr > 100 ? 'Heart rate is elevated / increasing.' : 'Heart rate is low / dropping.';
    if (spo2Alert) return 'Blood oxygen level is dropping.';
    return 'Somchai is healthy and at home';
  };

  const cfg = stateConfig[globalState];

  return (
    <div className="dashboard-container">
      {(data.sos || data.fall) && <EmergencyOverlay data={data} onDismiss={() => setData({...data, sos: false, fall: false, lastUpdate: new Date().toISOString()})} />}
      
      <div className="topbar">
        <div className="logo">KhlongJai</div>
        <button className="profile-btn">C</button>
      </div>

      <div className="scroll-area">
        <div className={`hero ${globalState}`}>
          <div className="hero-icon">{cfg.heroIcon}</div>
          <div>
            <div className="hero-title">{cfg.heroTitle}</div>
            <div className="hero-sub">{getHeroSub()}</div>
            <div className="live-row"><span className="live-dot"></span><span className="live-text">Live · Updated {new Date(data.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
          </div>
        </div>

        <div className="vitals-block">
          <div className="vitals-row">
            <div className={`vital-card state-${hrStatus} ${activeTab === 'hr' ? 'drawer-open' : ''}`} onClick={() => setActiveTab(activeTab === 'hr' ? null : 'hr')}>
              <div className="vital-top"><div className="vital-label"><svg className="pulse-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A0522D" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> Heart Rate</div><div><span className="vital-num">{data.hr}</span><span className="vital-unit">BPM</span></div><div className="vital-badge">{getBadgeLabel(hrStatus)}</div></div>
              <MiniSpark id="hr" history={hrHistory} /><div className="tap-hint">Trend <span className="tap-arrow">▾</span></div>
            </div>
            <div className={`vital-card state-${spo2Status} ${activeTab === 'spo2' ? 'drawer-open' : ''}`} onClick={() => setActiveTab(activeTab === 'spo2' ? null : 'spo2')}>
              <div className="vital-top"><div className="vital-label"><svg className="pulse-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3D6E4F" strokeWidth="2.5"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/></svg> SpO₂</div><div><span className="vital-num">{data.spo2}</span><span className="vital-unit">%</span></div><div className="vital-badge">{getBadgeLabel(spo2Status)}</div></div>
              <MiniSpark id="spo2" history={spo2History} /><div className="tap-hint">Trend <span className="tap-arrow">▾</span></div>
            </div>
          </div>
          <div className={`chart-drawer ${activeTab ? 'open' : ''} state-${activeTab === 'hr' ? hrStatus : spo2Status}`}>
            <div className="drawer-header"><div className="drawer-title">{activeTab === 'hr' ? 'Heart Rate' : 'Blood Oxygen'}<div className="drawer-pill" style={{ background: 'var(--state-normal-badge-bg)', color: 'var(--state-normal-badge)' }}>{getBadgeLabel(activeTab === 'hr' ? hrStatus : spo2Status)}</div></div></div>
            <div className="time-tabs">{['6h', '12h', '24h', '7d'].map(r => (<button key={r} className={`ttab ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>{r}</button>))}</div>
            <VitalChart id={activeTab || 'hr'} range={range} history={activeTab === 'hr' ? hrHistory : spo2History} state={activeTab === 'hr' ? hrStatus : spo2Status} />
          </div>
        </div>

        <div className={`fall-card ${data.fall ? 'state-emergency' : ''}`}>
          <div className="sensor-row">
            <div className="sensor-left"><div><div className="sensor-name">Fall Detection</div><div className="sensor-sub">Wristband · Active</div></div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div className="sensor-on"><span className="sensor-dot"></span>ON</div><div className="sensor-since">47 hrs safe<span>since last fall</span></div></div>
          </div>
          <div className="safe-summary">
            <div className="safe-icon">{data.fall ? '🚨' : '🧍'}</div>
            <div><div className="safe-title" style={{ color: data.fall ? 'var(--red)' : 'var(--green)' }}>{data.fall ? 'Fall detected!' : 'No falls detected'}</div><div className="safe-sub">{data.fall ? 'Somchai has fallen now' : 'Monitoring continuously · All clear'}</div></div>
          </div>
          <div className="history-grid">
            <div className="history-label">Last 7 days<div className="history-legend"><div className="hleg"><div className="hleg-dot" style={{ background: 'var(--green)' }}></div>Clear</div><div className="hleg"><div className="hleg-dot" style={{ background: 'var(--red)' }}></div>Fall</div></div></div>
            <div className="history-days">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                <div key={i} className={`hday ${i === 6 ? 'today' : ''}`} onClick={() => i === 3 ? setShowIncident(!showIncident) : setShowIncident(false)}>
                  <div className="hday-name">{day}</div>
                  <div className={`hday-dot ${i === 3 ? 'incident' : i < 6 ? 'clear' : data.fall ? 'incident' : 'clear'}`}></div>
                  <div className={`hday-count ${i === 3 || (i === 6 && data.fall) ? 'red' : ''}`}>{i === 3 || (i === 6 && data.fall) ? '1' : ''}</div>
                </div>
              ))}
            </div>
          </div>
          {(showIncident || data.fall) && (
            <div className="incident-row">
              <div className="incident-icon">⚠️</div>
              <div>
                <div className="incident-title">Fall detected — {data.fall ? 'Today' : 'Thursday 6 Mar'}</div>
                <div className="incident-detail">Detected at {data.fall ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '14:32'} · Living room area<br />HR spiked to {data.fall ? data.hr : '118'} BPM at time of fall</div>
                {!data.fall && <div className="incident-resolved">✓ Resolved · Caregiver responded 8 min later</div>}
              </div>
            </div>
          )}
        </div>

        <div className="week-card">
          <div className="week-card-header"><div className="week-card-title">Weekly Overview</div><div className="week-legend"><div className="wleg"><div className="wleg-dot" style={{ background: '#C4956A' }}></div>HR</div><div className="wleg"><div className="wleg-dot" style={{ background: 'var(--green-mid)' }}></div>SpO₂</div></div></div>
          <div className="week-grid">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
              const hrVal = [69, 74, 71, 77, 68, 72, Math.round(data.hr)][i];
              const spVal = [97, 98, 97, 96, 98, 99, Math.round(data.spo2)][i];
              return (<div key={day} className={`day-col ${i === 6 ? 'today' : ''}`}><div className="day-name">{day}</div><div className="day-bar-wrap"><div className="day-bar-bg"></div><div className="bar-hr" style={{ height: `${Math.max(2, Math.min(48, ((hrVal - 40) / 160) * 48))}px` }}></div><div className="bar-sp" style={{ height: `${Math.max(2, Math.min(48, ((spVal - 85) / 15) * 48))}px` }}></div></div><div className="day-val">{hrVal}</div></div>)
            })}</div>
        </div>

        <div className="loc-card">
          <div className="loc-header"><div><div className="loc-label"><MapPin size={10} /> Live Location</div><div className="loc-name">🏠 Home</div><div className="loc-sub">Sukhumvit, Bangkok · {new Date(data.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div><div className="geo-badge">Safe zone</div></div>
          <div className="map-box"><svg className="map-svg" viewBox="0 0 400 145" preserveAspectRatio="xMidYMid slice"><rect width="400" height="145" fill="#E4E8E0" /><rect x="0" y="62" width="400" height="8" fill="#D0D5CA" /><rect x="0" y="96" width="400" height="5" fill="#D0D5CA" /><rect x="75" y="0" width="6" height="145" fill="#D0D5CA" /><circle cx="200" cy="68" r="14" fill="none" stroke="#3D6E4F" strokeWidth="2" className="pulse-ring" /><g className="map-pin"><circle cx="200" cy="62" r="13" fill="#3D6E4F" /><circle cx="200" cy="62" r="5" fill="white" /><polygon points="200,75 194,62 206,62" fill="#3D6E4F" /></g></svg></div>
        </div>
      </div>

      <nav className="bottom-nav">
        <button className="ni on"><Clock size={21} /><span className="ni-lbl">Dashboard</span></button>
        <button className="ni"><MapPin size={21} /><span className="ni-lbl">Map</span></button>
        <button className="ni"><Heart size={21} /><span className="ni-lbl">Vitals</span></button>
        <button className="ni"><User size={21} /><span className="ni-lbl">Profile</span></button>
      </nav>
    </div>
  )
}
