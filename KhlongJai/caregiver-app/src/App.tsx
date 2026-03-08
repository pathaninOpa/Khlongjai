import { useState, useEffect, useRef, useMemo } from 'react'
import { db } from './firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import './App.css'

const DEVICE_ID = "elderly-01";

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

const VitalChart = ({ id, range, data: realData }: { id: string, range: string, data: any }) => {
  const isHR = id === 'hr';
  const baseValue = isHR ? (realData?.hr || 72) : (realData?.spo2 || 98);
  const historyData = useMemo(() => {
    const counts: Record<string, number> = { '6h': 72, '12h': 144, '24h': 288, '7d': 168 };
    const n = counts[range];
    let d = gen(n, baseValue, isHR ? 10 : 1.2, isHR ? 56 : 93, isHR ? 108 : 100);
    if (isHR && range !== '7d') d = nightDip(d);
    d[d.length - 1] = baseValue;
    return d;
  }, [range, baseValue, isHR]);

  const color = isHR ? '#D94F4F' : '#3D6E4F';
  const minY = isHR ? 40 : 88;
  const maxY = isHR ? 160 : 100;
  const W = 370, H = 100, padX = 4, padY = 8;
  const step = Math.max(1, Math.floor(historyData.length / 60));
  const pts: number[] = [];
  for (let i = 0; i < historyData.length; i += step) pts.push(historyData[i]);
  const mn = Math.min(...pts), mx = Math.max(...pts);
  const yMin = Math.min(mn - 4, minY), yMax = Math.max(mx + 4, maxY);
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

  const gridLines = isHR
    ? [{ v: 60, l: '60' }, { v: 80, l: '80' }, { v: 100, l: '100' }]
    : [{ v: 95, l: '95%' }, { v: 98, l: '98%' }];

  const avg = Math.round(pts.reduce((a, b) => a + b, 0) / pts.length * 10) / 10;
  const pMn = Math.min(...pts), pMx = Math.max(...pts);
  let phase = 'Resting';
  if (isHR) {
    const a8 = pts.slice(-8).reduce((a, b) => a + b, 0) / 8;
    phase = a8 < 68 ? 'Sleeping' : a8 < 82 ? 'Resting' : 'Active';
  }

  const pills = isHR
    ? [{ dot: '#E07070', l: 'Avg', v: avg + ' BPM' }, { dot: '#6BAE80', l: 'Low', v: pMn + ' BPM' }, { dot: '#D94F4F', l: 'Peak', v: pMx + ' BPM' }, { dot: phase === 'Sleeping' ? '#818CF8' : phase === 'Active' ? '#D97706' : '#6BAE80', l: 'State', v: phase }]
    : [{ dot: '#5A9470', l: 'Avg', v: avg + '%' }, { dot: '#D97706', l: 'Low', v: pMn + '%' }, { dot: '#6BAE80', l: 'Peak', v: pMx + '%' }, { dot: pMn >= 95 ? '#6BAE80' : '#D94F4F', l: 'Status', v: pMn >= 95 ? 'Stable' : 'Watch' }];

  return (
    <>
      <div className="range-bar-wrap">
        <div className="range-label-row">
          <span className="range-lbl">{minY}{isHR ? ' BPM' : '%'}</span>
          <span className="range-lbl" style={{ color: 'var(--green)', fontWeight: 600 }}>Normal {isHR ? '60–100' : '≥ 95%'}</span>
          <span className="range-lbl">{maxY}{isHR ? ' BPM' : '%'}</span>
        </div>
        <div className="range-bar">
          <div className="range-fill" style={{ left: isHR ? '16%' : '58%', width: isHR ? '50%' : '42%', background: 'linear-gradient(90deg,#C5E0CE88,#6BAE8066)' }}></div>
          <div className="range-thumb" style={{ background: color, left: `${Math.max(2, Math.min(98, ((baseValue - minY) / (maxY - minY)) * 100))}%` }}></div>
        </div>
      </div>
      <div className="chart-wrap">
        <svg className="chart-svg" viewBox="0 0 370 100" preserveAspectRatio="none" height="100">
          <defs>
            <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity=".28" />
              <stop offset="85%" stopColor={color} stopOpacity=".03" />
            </linearGradient>
          </defs>
          {gridLines.map(g => (
            <g key={g.v}>
              <line x1="0" y1={py(g.v)} x2="370" y2={py(g.v)} stroke="#EAE5DF" strokeWidth="1" strokeDasharray="3 3" />
              <text x="368" y={py(g.v) - 3} textAnchor="end" fontSize="8" fill="#C8C2BC" fontFamily="DM Sans">{g.l}</text>
            </g>
          ))}
          <path d={area} fill={`url(#g-${id})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={px(pts.length - 1)} cy={py(pts[pts.length - 1])} r="6" fill={color} opacity=".18" />
          <circle cx={px(pts.length - 1)} cy={py(pts[pts.length - 1])} r="3.5" fill={color} />
        </svg>
      </div>
      <div className="insight-strip">
        {pills.map((p, i) => (
          <div key={i} className="insight-pill">
            <div className="pip-dot" style={{ background: p.dot }}></div>
            <span style={{ color: 'var(--text-muted)' }}>{p.l}</span>
            <span className="val">{p.v}</span>
          </div>
        ))}
      </div>
    </>
  );
};

const MiniSpark = ({ id, data: realData }: { id: string, data: any }) => {
  const isHR = id === 'hr';
  const baseValue = isHR ? (realData?.hr || 72) : (realData?.spo2 || 98);
  const pts = useMemo(() => gen(30, baseValue, isHR ? 5 : 0.6, isHR ? 60 : 94, isHR ? 100 : 99), [baseValue, isHR]);
  const mn = Math.min(...pts), mx = Math.max(...pts), W = 200, H = 28;
  const px = (i: number) => i / (pts.length - 1) * W;
  const py = (v: number) => H - (v - mn) / (mx - mn + .01) * (H - 4) - 2;
  let d = `M${px(0)},${py(pts[0])}`;
  for (let i = 1; i < pts.length; i++) {
    const m = (px(i - 1) + px(i)) / 2;
    d += ` Q${m},${py(pts[i - 1])} ${px(i)},${py(pts[i])}`;
  }
  const color = isHR ? '#D94F4F' : '#3D6E4F';
  return (
    <div className="mini-spark">
      <svg viewBox="0 0 200 28" preserveAspectRatio="none" style={{ width: '100%', height: '28px' }}>
        <path d={`${d} L${W},${H} L0,${H} Z`} fill={color} opacity=".12" />
        <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  );
};

function App() {
  const [data, setData] = useState<any>({ hr: 72, spo2: 98, sos: false, fall: false, lat: 13.7563, lng: 100.5018, lastUpdate: new Date().toISOString() })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [hrRange, setHrRange] = useState('6h')
  const [spo2Range, setSpo2Range] = useState('6h')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!db) { setTimeout(() => setLoading(false), 800); return; }
    const unsub = onSnapshot(doc(db, "devices", DEVICE_ID), (docSnap) => {
      if (docSnap.exists()) {
        const newData = docSnap.data(); setData(newData);
        if (newData.sos || newData.fall) { if (audioRef.current) { audioRef.current.loop = true; audioRef.current.play().catch(() => {}); } }
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  if (loading) return <div className="loading">KhlongJai</div>

  const toggleTab = (id: string) => setActiveTab(activeTab === id ? null : id);

  return (
    <div className="app-container">
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" />

      <div className="topbar">
        <div className="logo"><span className="logo-dot"></span>KhlongJai</div>
        <button className="profile-btn">C</button>
      </div>

      <div className="scroll-area">
        {/* HERO */}
        <div className="hero">
          <div className="hero-icon">🌿</div>
          <div>
            <div className="hero-title">{data.sos || data.fall ? 'Action Needed' : 'All is well'}</div>
            <div className="hero-sub">Somchai is {data.sos || data.fall ? 'requesting help' : 'healthy and at home'}</div>
            <div className="live-row"><span className="live-dot"></span><span className="live-text">Live · Updated {new Date(data.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
          </div>
        </div>

        {/* VITALS ROW */}
        <div className="vitals-row">
          <div className={`vital-card ${activeTab === 'hr' ? 'active-hr' : ''}`} onClick={() => toggleTab('hr')}>
            <div className="vital-type-indicator hr">HR</div>
            <div className="vital-top">
              <div className="vital-label">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#D94F4F" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                Heart Rate
              </div>
              <div>
                <span className="vital-num" style={{ color: 'var(--heart)' }}>{data.hr}</span><span className="vital-unit">BPM</span>
              </div>
              <div className={`vital-badge ${data.hr > 100 || data.hr < 60 ? 'badge-red' : 'badge-green'}`}>
                {data.hr > 100 || data.hr < 60 ? '⚠ Watch' : '✓ Normal'}
              </div>
            </div>
            <MiniSpark id="hr" data={data} />
          </div>

          <div className={`vital-card ${activeTab === 'spo2' ? 'active-spo2' : ''}`} onClick={() => toggleTab('spo2')}>
            <div className="vital-type-indicator spo2">SPO2</div>
            <div className="vital-top">
              <div className="vital-label">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3D6E4F" strokeWidth="2.5"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" /></svg>
                SpO₂
              </div>
              <div>
                <span className="vital-num" style={{ color: 'var(--green)' }}>{data.spo2}</span><span className="vital-unit">%</span>
              </div>
              <div className={`vital-badge ${data.spo2 < 95 ? 'badge-red' : 'badge-green'}`}>
                {data.spo2 < 95 ? '⚠ Watch' : '✓ Normal'}
              </div>
            </div>
            <MiniSpark id="spo2" data={data} />
          </div>

          {activeTab && (
            <div className="chart-drawer">
              <div className="time-tabs">
                {['6h', '12h', '24h', '7d'].map(r => (
                  <button key={r} className={`ttab ${activeTab === 'hr' ? (hrRange === r ? 'active' : '') : (spo2Range === r ? 'active' : '')}`} onClick={() => activeTab === 'hr' ? setHrRange(r) : setSpo2Range(r)}>{r}</button>
                ))}
              </div>
              <VitalChart id={activeTab} range={activeTab === 'hr' ? hrRange : spo2Range} data={data} />
            </div>
          )}
        </div>

        {/* FALL DETECTION */}
        <div className={`fall-strip ${data.fall ? 'alert-mode' : 'safe'}`}>
          <div className="fall-left">
            <div className="fall-emoji">{data.fall ? '⚠' : '🛡️'}</div>
            <div>
              <div className="fall-label">Fall Detection</div>
              <div className={`fall-status ${data.fall ? 'danger' : ''}`}>
                {data.fall ? 'Fall Detected!' : 'No falls · 47 hrs safe'}
              </div>
            </div>
          </div>
          <div className="fall-dots">
            {[...Array(7)].map((_, i) => (
              <div key={i} className={`fdot filled ${i === 6 && data.fall ? 'incident' : ''}`}></div>
            ))}
          </div>
        </div>

        {/* WEEKLY */}
        <div className="week-card">
          <div className="week-card-header">
            <div className="week-card-title">Weekly Overview</div>
            <div className="week-legend">
              <div className="wleg"><div className="wleg-dot" style={{ background: 'var(--heart-line)' }}></div>HR</div>
              <div className="wleg"><div className="wleg-dot" style={{ background: 'var(--green-mid)' }}></div>SpO₂</div>
            </div>
          </div>
          <div className="week-grid">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
              const hrVal = [69, 74, 71, 77, 68, 72, Math.round(data.hr)][i];
              const spVal = [97, 98, 97, 96, 98, 99, Math.round(data.spo2)][i];
              return (
                <div key={day} className={`day-col ${i === 6 ? 'today' : ''}`}>
                  <div className="day-name">{day}</div>
                  <div className="day-bar-wrap">
                    <div className="day-bar-bg"></div>
                    <div className="bar-hr" style={{ height: `${(hrVal - 55) / 50 * 48}px` }}></div>
                    <div className="bar-sp" style={{ height: `${(spVal - 90) / 10 * 48}px` }}></div>
                  </div>
                  <div className="day-val">{hrVal}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* LOCATION */}
        <div className="loc-card">
          <div className="loc-header">
            <div>
              <div className="loc-label">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
                Live Location
              </div>
              <div className="loc-name">🏠 Home</div>
              <div className="loc-sub">Sukhumvit, Bangkok · {new Date(data.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div className="geo-badge">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              Safe zone
            </div>
          </div>
          <div className="map-box">
            <svg className="map-svg" viewBox="0 0 400 145" preserveAspectRatio="xMidYMid slice">
              <rect width="400" height="145" fill="#E4E8E0" />
              <rect x="0" y="62" width="400" height="8" fill="#D0D5CA" />
              <rect x="0" y="96" width="400" height="5" fill="#D0D5CA" />
              <rect x="0" y="36" width="400" height="4" fill="#D0D5CA" />
              <rect x="75" y="0" width="6" height="145" fill="#D0D5CA" />
              <rect x="155" y="0" width="5" height="145" fill="#D0D5CA" />
              <rect x="235" y="0" width="8" height="145" fill="#D0D5CA" />
              <rect x="318" y="0" width="5" height="145" fill="#D0D5CA" />
              <rect x="85" y="43" width="60" height="16" rx="3" fill="#C9D0C3" />
              <rect x="165" y="43" width="60" height="16" rx="3" fill="#C9D0C3" />
              <rect x="245" y="43" width="65" height="16" rx="3" fill="#C9D0C3" />
              <rect x="10" y="43" width="58" height="16" rx="3" fill="#C9D0C3" />
              <rect x="85" y="105" width="60" height="26" rx="3" fill="#C9D0C3" />
              <rect x="165" y="105" width="60" height="20" rx="3" fill="#C9D0C3" />
              <circle cx="200" cy="68" r="36" fill="none" stroke="#3D6E4F" strokeWidth="1.5" strokeDasharray="5 3" opacity=".4" />
              <circle cx="200" cy="68" r="14" fill="none" stroke="#3D6E4F" strokeWidth="2" className="pulse-ring" />
              <g className="map-pin">
                <circle cx="200" cy="62" r="13" fill="#3D6E4F" />
                <circle cx="200" cy="62" r="5" fill="white" />
                <polygon points="200,75 194,62 206,62" fill="#3D6E4F" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <nav className="bottom-nav">
        <button className="ni on"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#1C1917" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" /></svg><span className="ni-lbl" style={{ color: 'var(--text-primary)' }}>Dashboard</span></button>
        <button className="ni"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#B5AFA9" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg><span className="ni-lbl">Map</span></button>
        <button className="ni"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#B5AFA9" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg><span className="ni-lbl">Vitals</span></button>
        <button className="ni"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#B5AFA9" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6" /></svg><span className="ni-lbl">History</span></button>
        <button className="ni"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#B5AFA9" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg><span className="ni-lbl">Profile</span></button>
      </nav>
    </div>
  )
}

export default App
