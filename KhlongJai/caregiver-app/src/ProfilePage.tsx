import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Plus, User, Heart, MapPin, Clock, Battery, AlertTriangle, Shield, Settings, LogOut, Phone, Smartphone, Bell, Calendar } from 'lucide-react'
import { useBroadcastSync } from './useBroadcastSync'
import './App.css'

export default function ProfilePage() {
  const [data, setData, requestSync] = useBroadcastSync<any>({ hr: 72, spo2: 98, sos: false, fall: false, lat: 0, lng: 0, lastUpdate: "" });
  const [activeView, setActiveView] = useState('home');
  const [slideIn, setSlideIn] = useState(false);
  const [escalationDelay, setEscalationDelay] = useState(3);
  
  useEffect(() => {
    requestSync();
  }, []);

  const showView = (view: string, slide = false) => {
    setSlideIn(slide);
    setActiveView(view);
    window.scrollTo(0, 0);
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
  const somchaiState = (hrStatus === 'emergency' || spo2Status === 'emergency' || hrStatus === 'anomaly' || spo2Status === 'anomaly') ? 'watch' : (hrStatus === 'watch' || spo2Status === 'watch') ? 'watch' : 'safe';

  return (
    <div className="profile-page-container">
      {/* ── VIEW 1: PROFILE HOME ── */}
      <div className={`view ${activeView === 'home' ? 'active' : ''} ${slideIn && activeView === 'home' ? 'slide-in' : ''}`}>
        <div className="topbar">
          <div className="logo">KhlongJai</div>
          <div style={{ fontFamily: 'DM Serif Display', fontSize: '18px' }}>Profile</div>
        </div>
        
        <div className="scroll-area">
          <div className="sec">Caretaker</div>
          
          {/* ── Caretaker Card ── */}
          <div className="card">
            <div className="card-head">
              <div className="card-head-title">Caregiver profile</div>
              <button className="card-head-action" onClick={() => showView('ct-edit', true)}>Edit</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '16px 17px' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0, background: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: 'var(--bg)', fontWeight: 600 }}>W</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Wirut Jaidee</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Son · Primary caregiver</div>
              </div>
            </div>
            <div className="row">
              <div className="row-key">Phone</div>
              <div className="row-val">+66 89 123 4567</div>
            </div>
          </div>

          {/* ── Alert Preferences Card ── */}
          <div className="card">
            <div className="card-head">
              <div className="card-head-title">Alert preferences</div>
              <button className="card-head-action">Settings</button>
            </div>
            <div className="row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bell size={16} color="var(--text-muted)" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Push notifications</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>All alert states</div>
                </div>
              </div>
              <button className="toggle on"></button>
            </div>
            <div className="row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Phone size={16} color="var(--text-muted)" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Call on Emergency</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>Response time: {escalationDelay} min</div>
                </div>
              </div>
              <button className="toggle on"></button>
            </div>
            <div className="row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={16} color="var(--text-muted)" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Daily summary</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>Morning recap at 8:00 AM</div>
                </div>
              </div>
              <button className="toggle on"></button>
            </div>
          </div>

          <div className="sec" style={{ marginTop: '4px' }}>My elders</div>
          
          {/* ── My Elders Card Wrapper ── */}
          <div className="card">
            <div className="card-head">
              <div className="card-head-title">Monitored devices</div>
              <button className="card-head-action">+ Add</button>
            </div>
            
            {/* Somchai Item */}
            <div className="elder-top" style={{ cursor: 'pointer' }} onClick={() => showView('elder-detail', true)}>
              <div className="elder-avatar" style={{ background: 'var(--bg)' }}>
                👴
                <div className={`elder-ring ${somchaiState === 'safe' ? 'green' : 'amber'}`}></div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="elder-name">Somchai Jaidee</div>
                <div className="elder-meta">Age 74 · Father · Wristband #001</div>
              </div>
              <div className="elder-right">
                <div className={`state-pill ${somchaiState === 'safe' ? 'pill-safe' : 'pill-watch'}`}>
                  ● {somchaiState === 'safe' ? 'Safe' : 'Watch'}
                </div>
                <div className="batt-row">
                  <div className="batt"><div className="batt-fill" style={{ right: '1px', background: 'var(--green)' }}></div></div>
                  82%
                </div>
              </div>
            </div>
            <div className="chip-strip" style={{ paddingBottom: '15px' }}>
              <span className="chip cond">Hypertension</span>
              <span className="chip cond">Type 2 Diabetes</span>
              <span className="chip med">Metoprolol</span>
              <span className="chip med">Metformin</span>
              <span className="chip">+1 med</span>
            </div>
          </div>

          <button style={{ background: 'none', border: 'none', width: '100%', textAlign: 'center', padding: '16px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>

      {/* ── VIEW 2: ELDER DETAIL ── */}
      <div className={`view ${activeView === 'elder-detail' ? 'active' : ''} ${slideIn && activeView === 'elder-detail' ? 'slide-in' : ''}`}>
        <div className="topbar">
          <button className="back-btn" onClick={() => showView('home', false)}>
            <ChevronLeft size={17} /> Profile
          </button>
          <div style={{ fontFamily: 'DM Serif Display', fontSize: '18px' }}>Somchai</div>
          <button className="topbar-save">Save</button>
        </div>
        <div className="scroll-area">
          <div className="sec">Personal info</div>
          <div className="card">
            <div className="card-head">
              <div className="card-head-title">Identity</div>
              <button className="card-head-action">Edit</button>
            </div>
            <div className="row"><div className="row-key">Full name</div><div className="row-val">Somchai Jaidee</div></div>
            <div className="row"><div className="row-key">Date of birth</div><div className="row-val">12 Mar 1951 · Age 74</div></div>
            <div className="row"><div className="row-key">Blood type</div><div className="row-val">O+</div></div>
            <div className="row"><div className="row-key">Relationship</div><div className="row-val">Father</div></div>
          </div>

          <div className="sec">Medical context</div>
          <div className="card">
            <div className="card-head">
              <div className="card-head-title">Known conditions</div>
              <button className="card-head-action">+ Add</button>
            </div>
            <div className="chip-strip" style={{ padding: '12px 17px' }}>
              <span className="chip cond">Hypertension</span>
              <span className="chip cond">Type 2 Diabetes</span>
              <span className="chip cond">Mild hearing loss</span>
            </div>
            <div style={{ padding: '0 17px 13px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Conditions inform how vitals are interpreted — hypertension means Somchai's resting HR may naturally sit higher.
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-head-title">Medications</div>
              <button className="card-head-action">+ Add</button>
            </div>
            <div className="med-row">
              <div><div className="med-name">Metoprolol 25mg</div><div className="med-sub">Once daily · Morning · Beta-blocker</div></div>
              <div className="med-tag affects">Affects HR ↓</div>
            </div>
            <div className="med-row">
              <div><div className="med-name">Metformin 500mg</div><div className="med-sub">Twice daily · After meals · Antidiabetic</div></div>
              <div className="med-tag neutral">No HR effect</div>
            </div>
            <div className="med-row">
              <div><div className="med-name">Amlodipine 5mg</div><div className="med-sub">Once daily · Evening · Calcium channel blocker</div></div>
              <div className="med-tag affects">Affects HR ↓</div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-head-title">Doctor & hospital</div>
              <button className="card-head-action">Edit</button>
            </div>
            <div className="row"><div className="row-key">Doctor</div><div className="row-val">Dr. Pranee Sukwong</div></div>
            <div className="row"><div className="row-key">Clinic</div><div className="row-val">Samitivej Sukhumvit</div></div>
            <div className="row"><div className="row-key">Phone</div><div className="row-val green">02-022-2222</div></div>
            <div className="row"><div className="row-key">Hospital</div><div className="row-val">Bangkok Hospital</div></div>
          </div>

          <div className="sec">Monitoring setup</div>
          <div className="card">
            <div className="card-head">
              <div className="card-head-title">Wearable device</div>
              <button className="card-head-action">Manage</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 17px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '13px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>⌚</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>KJ-Wristband #001</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>Last sync 2 min ago · Firmware v2.1.4</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 600, color: 'var(--green)', background: 'var(--green-light)', border: '1px solid #C5E0CE', padding: '3px 9px', borderRadius: '20px', flexShrink: 0 }}>Connected</div>
            </div>
            <div className="stat-strip" style={{ paddingTop: '12px' }}>
              <div className="stat-box"><div className="stat-num">82%</div><div className="stat-lbl">Battery</div></div>
              <div className="stat-box"><div className="stat-num">98%</div><div className="stat-lbl">Uptime</div></div>
              <div className="stat-box"><div className="stat-num">7d</div><div className="stat-lbl">Calibrated</div></div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-head-title">Personal thresholds</div>
              <button className="card-head-action">Recalibrate</button>
            </div>
            <div style={{ padding: '10px 17px 4px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Calibrated from Somchai’s 7-day baseline — alerts use <em>his</em> ranges, not generic clinical values.
            </div>
            <div className="thresh-row">
              <div className="thresh-top">
                <div className="thresh-label">Heart Rate · Resting</div>
                <div className="thresh-val">68–74 BPM</div>
              </div>
              <div className="range-bar full">
                <div className="range-fill" style={{ left: '28%', width: '6%' }}></div>
                <div className="range-thumb" style={{ left: '31%' }}></div>
              </div>
              <div className="thresh-foot"><span>40</span><span>Watch &gt;96</span><span>Emergency &gt;140</span></div>
            </div>
            <div className="thresh-row">
              <div className="thresh-top">
                <div className="thresh-label">SpO₂ · Normal</div>
                <div className="thresh-val">96–99%</div>
              </div>
              <div className="range-bar full">
                <div className="range-fill" style={{ left: '60%', width: '30%' }}></div>
                <div className="range-thumb" style={{ left: '85%' }}></div>
              </div>
              <div className="thresh-foot"><span>Emergency &lt;90%</span><span>Watch &lt;94%</span><span>100%</span></div>
            </div>
          </div>

          <div className="sec">Emergency contacts</div>
          <div className="card">
            <div className="card-head">
              <button className="card-head-action">Edit</button>
            </div>
            <div style={{ padding: '8px 17px 4px', fontSize: '11px', color: 'var(--text-muted)' }}>
              If you don’t respond within 3 min, the next contact is alerted automatically.
            </div>
            <div className="contact">
              <div className="contact-num first">1</div>
              <div>
                <div className="contact-name">Wirut Jaidee <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--green)' }}>(You)</span></div>
                <div className="contact-sub">Son · Primary caregiver</div>
              </div>
              <div className="contact-phone">+66 89 123 4567</div>
            </div>
            <div className="contact">
              <div className="contact-num">2</div>
              <div>
                <div className="contact-name">Nanthida Jaidee</div>
                <div className="contact-sub">Daughter · If Wirut doesn’t respond</div>
              </div>
              <div className="contact-phone">+66 81 987 6543</div>
            </div>
            <div className="contact">
              <div className="contact-num">3</div>
              <div>
                <div className="contact-name">Dr. Pranee Sukwong</div>
                <div className="contact-sub">Doctor · Medical escalation</div>
              </div>
              <div className="contact-phone">02-022-2222</div>
            </div>
            <button style={{ width: '100%', textAlign: 'center', padding: '12px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer' }}>+ Add backup contact</button>
          </div>

          <button className="danger-btn" style={{ margin: '20px 16px' }}>Remove this elder from my account</button>
        </div>
      </div>

      {/* ── VIEW 3: CARETAKER EDIT ── */}
      <div className={`view ${activeView === 'ct-edit' ? 'active' : ''} ${slideIn && activeView === 'ct-edit' ? 'slide-in' : ''}`}>
        <div className="topbar">
          <button className="back-btn" onClick={() => showView('home', false)}>
            <ChevronLeft size={17} /> Profile
          </button>
          <div style={{ fontFamily: 'DM Serif Display', fontSize: '18px' }}>My account</div>
          <button className="topbar-save" onClick={() => showView('home', false)}>Save</button>
        </div>
        <div className="scroll-area">
          <div className="sec">Account</div>
          <div className="card">
            <div className="card-head"><div className="card-head-title" style={{ color: 'var(--text-primary)' }}>Your info</div></div>
            <div className="row">
              <div className="row-key" style={{ color: 'var(--text-primary)' }}>Name</div>
              <input style={{ border: 'none', background: 'none', textAlign: 'right', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'DM Sans', outline: 'none', flex: 1 }} defaultValue="Wirut Jaidee" />
            </div>
            <div className="row">
              <div className="row-key" style={{ color: 'var(--text-primary)' }}>Role</div>
              <input style={{ border: 'none', background: 'none', textAlign: 'right', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'DM Sans', outline: 'none', flex: 1 }} defaultValue="Son" />
            </div>
          </div>

          <div className="sec">Escalation timing</div>
          <div className="card">
            <div className="card-head"><div className="card-head-title" style={{ color: 'var(--text-primary)' }}>Auto-escalation delay</div></div>
            <div style={{ padding: '10px 17px 4px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              If you don't respond within this time, the next contact is automatically alerted.
            </div>
            <div className="delay-strip">
              {[1, 3, 5, 10].map(m => (
                <button key={m} className={`delay-pill ${escalationDelay === m ? 'active' : ''}`} onClick={() => setEscalationDelay(m)}>{m} min</button>
              ))}
            </div>
          </div>

          <button className="danger-btn" style={{ margin: '20px 16px' }}>Delete account</button>
        </div>
      </div>

      <nav className="bottom-nav">
        <Link to="/" className="ni"><Clock size={21} /><span className="ni-lbl">Dashboard</span></Link>
        <Link to="/map" className="ni"><MapPin size={21} /><span className="ni-lbl">Map</span></Link>
        <Link to="/vitals" className="ni"><Heart size={21} /><span className="ni-lbl">Vitals</span></Link>
        <Link to="/profile" className="ni on"><User size={21} /><span className="ni-lbl">Profile</span></Link>
      </nav>
    </div>
  )
}
