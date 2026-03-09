import { useState, useEffect, useMemo, useRef } from 'react'
import { Heart, Wind, ChevronDown, Clock, MapPin, User, LayoutDashboard, CheckCircle2, AlertCircle, Info, Stethoscope, Droplets, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBroadcastSync } from './useBroadcastSync'
import './App.css'

export default function VitalsPage() {
  const [data, setData, requestSync] = useBroadcastSync<any>({ hr: 72, spo2: 98, sos: false, fall: false, lat: 13.7563, lng: 100.5018, lastUpdate: "" });
  const [expandedSections, setExpandedSections] = useState<string[]>(['hr-affects']);
  const [homeCoords, setHomeCoords] = useState({ lat: 0, lng: 0 });
  const lastSyncTime = useRef("");

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setHomeCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
    requestSync();
  }, []);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

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
    if (data.lastUpdate === "" || homeCoords.lat === 0) return true;
    return Math.sqrt(Math.pow(data.lat - homeCoords.lat, 2) + Math.pow(data.lng - homeCoords.lng, 2)) < 0.001;
  }, [data.lat, data.lng, data.lastUpdate, homeCoords]);

  const isAnomaly = hrStatus === 'emergency' || spo2Status === 'emergency' || hrStatus === 'anomaly' || spo2Status === 'anomaly';
  const isWatch = hrStatus === 'watch' || spo2Status === 'watch';
  const globalState = isAnomaly ? 'anomaly' : isWatch ? 'watch' : 'normal';

  const stateConfig: any = {
    normal: { heroIcon: '🌿', heroTitle: 'All is well', heroSub: 'Both readings are healthy today' },
    watch: { heroIcon: '👀', heroTitle: 'Heart rate slightly elevated — keep an eye on it', heroSub: 'Vitals slightly elevated' },
    anomaly: { heroIcon: '⚠️', heroTitle: 'Heart rate requires attention now', heroSub: 'Metric dropping, watching closely' },
  };

  const getHeroSub = () => {
    if (hrStatus !== 'normal' && spo2Status !== 'normal') return 'Both heart rate and SpO₂ need attention.';
    if (hrStatus !== 'normal') return data.hr > 100 ? 'Heart rate is elevated / increasing.' : 'Heart rate is low / dropping.';
    if (spo2Status !== 'normal') return 'Blood oxygen level is dropping.';
    return 'Both readings are healthy today';
  };

  const cfg = stateConfig[globalState];

  return (
    <div className="vitals-page-container">
      <div className="topbar">
        <div className="logo"><span className="logo-dot"></span>KhlongJai</div>
        <button className="profile-btn">C</button>
      </div>

      <div className="scroll-area">
        <div className="sec">Status</div>

        {/* ── HERO CARD (Same as Dashboard) ── */}
        <div className={`hero ${globalState}`}>
          <div className="hero-icon">{cfg.heroIcon}</div>
          <div>
            <div className="sum-subject" style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Somchai · Age 74 · Today</div>
            <div className="hero-title">{cfg.heroTitle}</div>
            <div className="hero-sub">{getHeroSub()}</div>
            <div className="live-row">
              <span className="live-dot"></span>
              <span className="live-text">Live · Updated {data.lastUpdate ? new Date(data.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}</span>
            </div>
          </div>
        </div>

        <div className="sec" style={{ marginTop: '8px' }}>Vitals</div>

        {/* ── HEART RATE CARD ── */}
        <div className={`metric-card state-${hrStatus === 'emergency' || hrStatus === 'anomaly' ? 'anomaly' : hrStatus}`}>
          <div className="reading-row">
            <div className="reading-icon hr-icon"><Heart size={20} color="var(--hr-accent)" /></div>
            <div className="reading-main">
              <div className="reading-label">Heart Rate</div>
              <div className="reading-value">
                <div className="rv-num">{data.hr}</div>
                <div className="rv-unit">BPM</div>
              </div>
              <div className="reading-state">
                <span className="state-dot"></span>
                <span>
                  {hrStatus === 'normal' ? 'Healthy resting rate' : 
                   hrStatus === 'watch' ? (data.hr < 60 ? '↓ Mildly low' : '↑ Mildly elevated') : 
                   (data.hr < 60 ? '⚠ Significantly low — watch closely' : '⚠ Significantly elevated — watch closely')}
                </span>
              </div>
            </div>
            <div className="range-wrap">
              <div className="range-bar">
                <div className="range-fill" style={{ 
                  width: `${Math.min(100, (data.hr / 180) * 100)}%`, 
                  background: hrStatus === 'normal' ? 'var(--green)' : (hrStatus === 'watch' ? 'var(--amber)' : 'var(--red)')
                }}></div>
              </div>
              <div className="range-labels"><span>60</span><span>100+</span></div>
            </div>
          </div>

          <div className="interp-body">
            <div className="interp-main">
              <strong>What this means:</strong> {data.hr} BPM {hrStatus === 'normal' ? 'is healthy for Somchai\'s age. For adults over 70, a normal resting rate sits between 60–100 BPM.' : 'is currently outside his normal resting range of 68–74 BPM.'}
            </div>

            <div className={`expand-section ${expandedSections.includes('hr-affects') ? 'open' : ''}`}>
              <div className="expand-trigger" onClick={() => toggleSection('hr-affects')}>
                <span className="exp-label"><Info size={14} className="exp-icon" /> What affects heart rate</span>
                <ChevronDown size={15} className="exp-chevron" />
              </div>
              <div className="expand-body">
                <div className="expand-content">
                  <div className="exp-list">
                    <div className="exp-item"><div className="exp-bullet sienna"></div><div><strong>Physical activity</strong> — HR naturally rises during walking or climbing stairs.</div></div>
                    <div className="exp-item"><div className="exp-bullet amber"></div><div><strong>Dehydration</strong> — Even mild dehydration causes the heart to work harder.</div></div>
                    <div className="exp-item"><div className="exp-bullet red"></div><div><strong>Infection</strong> — Persistently elevated rate can signal a hidden infection.</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`threshold-callout ${hrStatus === 'normal' ? 'green' : hrStatus === 'watch' ? 'amber' : 'red'}`}>
            <div className="tc-icon">{hrStatus === 'normal' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}</div>
            <div className="tc-text">
              {hrStatus === 'normal' 
                ? "Somchai's HR today is within his personal baseline. No action needed." 
                : (data.hr < 60 
                    ? "HR is lower than usual. Monitor for dizziness or unusual tiredness." 
                    : "HR is higher than usual. Ensure he's hydrated and monitor for fatigue.")
              }
            </div>
          </div>
        </div>

        {/* ── SpO₂ CARD ── */}
        <div className={`metric-card state-${spo2Status === 'emergency' || spo2Status === 'anomaly' ? 'anomaly' : spo2Status}`}>
          <div className="reading-row">
            <div className="reading-icon spo2-icon"><Wind size={20} color="var(--spo2-accent)" /></div>
            <div className="reading-main">
              <div className="reading-label">Blood Oxygen · SpO₂</div>
              <div className="reading-value">
                <div className="rv-num">{data.spo2}</div>
                <div className="rv-unit">%</div>
              </div>
              <div className="reading-state">
                <span className="state-dot"></span>
                <span>
                  {spo2Status === 'normal' ? 'Near-maximum oxygen' : 
                   spo2Status === 'watch' ? '↓ Mildly low' : 
                   '⚠ Significantly low — watch closely'}
                </span>
              </div>
            </div>
            <div className="range-wrap">
              <div className="range-bar">
                <div className="range-fill" style={{ 
                  width: `${Math.max(0, (data.spo2 - 80) * 5)}%`, 
                  background: spo2Status === 'normal' ? 'var(--green)' : (spo2Status === 'watch' ? 'var(--amber)' : 'var(--red)')
                }}></div>
              </div>
              <div className="range-labels"><span>90</span><span>100%</span></div>
            </div>
          </div>

          <div className="interp-body">
            <div className="interp-main">
              <strong>What this means:</strong> SpO₂ of {data.spo2}% {data.spo2 >= 95 ? 'means blood is carrying oxygen effectively. Healthy adults typically read between 95–100%.' : 'is below the optimal threshold. Seek medical advice if it stays low.'}
            </div>
          </div>

          <div className={`threshold-callout ${spo2Status === 'normal' ? 'green' : 'amber'}`}>
            <div className="tc-icon">{spo2Status === 'normal' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}</div>
            <div className="tc-text">
              {spo2Status === 'normal' 
                ? "SpO₂ is excellent today. near-optimal for Somchai's age." 
                : "Oxygen level is slightly low. Encourage upright posture and slow breathing."}
            </div>
          </div>
        </div>

        {/* ── DAILY SUGGESTIONS ── */}
        <div className="suggestion-card">
          <div className="sug-header">
            <h3>💡 Today's suggestion</h3>
            <p>Based on Somchai's readings today</p>
          </div>
          <div className="sug-list">
            <div className="sug-item">
              <div className="sug-icon-wrap" style={{ background: '#EBF5FF' }}>💧</div>
              <div>
                <div className="sug-text-title">Keep him hydrated</div>
                <div className="sug-text-body">A small glass of water every 2 hours is ideal for maintaining heart health.</div>
              </div>
            </div>
            <div className="sug-item">
              <div className="sug-icon-wrap" style={{ background: '#EAF3ED' }}>🚶</div>
              <div>
                <div className="sug-text-title">Light activity is good</div>
                <div className="sug-text-body">Gentle movement helps maintain good SpO₂ levels throughout the day.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav className="bottom-nav">
        <Link to="/" className="ni"><Clock size={21} /><span className="ni-lbl">Dashboard</span></Link>
        <Link to="/map" className="ni"><MapPin size={21} /><span className="ni-lbl">Map</span></Link>
        <Link to="/vitals" className="ni on"><Heart size={21} /><span className="ni-lbl">Vitals</span></Link>
        <button className="ni"><User size={21} /><span className="ni-lbl">Profile</span></button>
      </nav>
    </div>
  )
}
