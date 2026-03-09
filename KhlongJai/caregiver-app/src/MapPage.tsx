import { useState, useEffect, useMemo, useRef } from 'react'
import { MapPin, ChevronDown, Clock, User, Heart } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMap, Circle } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { useBroadcastSync } from './useBroadcastSync'
import './App.css'

// Helper to update map center
function ChangeView({ center, zoom }: { center: [number, number], zoom?: number }) {
  const map = useMap();
  useEffect(() => { 
    if (center[0] !== 0) map.setView(center, zoom || map.getZoom()); 
  }, [center, map, zoom]);
  return null;
}

export default function MapPage() {
  const [data, , requestSync] = useBroadcastSync<any>({ hr: 72, spo2: 98, sos: false, fall: false, lat: 0, lng: 0, lastUpdate: "" });
  const [address, setAddress] = useState("Locating...");
  const [homeCoords, setHomeCoords] = useState({ lat: 0, lng: 0 });
  const [mapExpanded, setMapExpanded] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(true);
  const lastFetchedCoords = useRef({ lat: 0, lng: 0 });

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setHomeCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
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
          setAddress(display);
          lastFetchedCoords.current = { lat: data.lat, lng: data.lng };
        } catch (e) { console.error(e); }
      };
      const timeout = setTimeout(fetchAddress, 1000);
      return () => clearTimeout(timeout);
    }
  }, [data.lat, data.lng, address]);

  const isAtHome = useMemo(() => {
    if (data.lat === 0 || homeCoords.lat === 0) return true;
    return Math.sqrt(Math.pow(data.lat - homeCoords.lat, 2) + Math.pow(data.lng - homeCoords.lng, 2)) < 0.001;
  }, [data.lat, data.lng, homeCoords]);

  const statusMode = (data.sos || data.fall) ? 'alert' : (!isAtHome ? 'away' : 'safe');

  return (
    <div className="map-page-container">
      <div className="topbar">
        <div className="logo">KhlongJai</div>
        <div style={{ fontFamily: 'DM Serif Display', fontSize: '18px' }}>Map</div>
      </div>

      <div className="scroll-area">
        <div className="sec">Location</div>

        {/* ── STATUS HERO CARD ── */}
        <div className="status-card">
          <div className={`safety-banner ${statusMode}`}>
            <div className="sb-left">
              <div className="sb-icon">{statusMode === 'safe' ? '🧍' : statusMode === 'away' ? '🚶' : '⚠️'}</div>
              <div>
                <div className="sb-name">Somchai</div>
                <div className="sb-status">
                  {statusMode === 'safe' ? 'Safe at home' : statusMode === 'away' ? 'Out for a walk' : 'Left safe zone!'}
                </div>
              </div>
            </div>
            <div className="sb-right">
              <div className="sb-time">
                {statusMode === 'safe' ? 'Last moved' : 'Status since'}
                <span>{data.lastUpdate ? new Date(data.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
              </div>
            </div>
          </div>

          <div className="location-row">
            <div className="loc-pin">{isAtHome ? '🏠' : '📍'}</div>
            <div>
              <div className="loc-name">{isAtHome ? 'Home area' : address}</div>
              <div className="loc-sub">{data.lat.toFixed(4)}° N, {data.lng.toFixed(4)}° E · Updated {data.lastUpdate ? 'just now' : 'never'}</div>
            </div>
            <div className={`loc-badge ${!isAtHome ? 'outside' : ''}`}>
              {isAtHome ? 'Inside zone' : 'Outside zone'}
            </div>
          </div>

          {/* Context status row — only shown when away/alert */}
          <div className={`context-row ${statusMode !== 'safe' ? 'visible' : ''}`}>
            <div className="ctx-dot" style={{ background: statusMode === 'away' ? 'var(--state-watch-badge)' : 'var(--red)' }}></div>
            <div className="ctx-text">
              <strong>{statusMode === 'away' ? 'Walking normally' : 'Left safe zone'}</strong> · HR {data.hr} BPM · SpO₂ {data.spo2}%
            </div>
            <button className={`ctx-link ${statusMode === 'away' ? 'amber' : 'red'}`}>
              {statusMode === 'away' ? 'View vitals' : 'Call now'}
            </button>
          </div>
        </div>

        {/* ── MAP CARD ── */}
        <div className={`map-card ${mapExpanded ? 'expanded' : ''}`}>
          <div className="map-header" onClick={() => setMapExpanded(!mapExpanded)}>
            <div className="map-header-left">
              <h3>Live Map</h3>
              <p>Geofence active · 100m radius</p>
            </div>
            <button className="map-expand-btn">
              <ChevronDown size={13} style={{ transform: mapExpanded ? 'rotate(180deg)' : 'none' }} />
              {mapExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>

          <div className="map-wrap">
            {data.lat === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E8F0E9', color: '#7EAA80', fontSize: '12px', fontWeight: 600 }}>
                Initializing GPS...
              </div>
            ) : (
              <MapContainer center={[data.lat, data.lng]} zoom={16} zoomControl={false} attributionControl={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Circle center={[homeCoords.lat, homeCoords.lng]} radius={100} pathOptions={{ color: '#3D6E4F', fillColor: '#3D6E4F', fillOpacity: 0.1, dashArray: '5, 10' }} />
                <Marker position={[data.lat, data.lng]} />
                <ChangeView center={[data.lat, data.lng]} />
              </MapContainer>
            )}
            
            <div className="map-controls">
              <div className="map-ctrl-btn" onClick={(e) => { e.stopPropagation(); requestSync(); }}>🎯</div>
            </div>
          </div>

          <div className="geofence-edit-row">
            <div className="gf-label"><strong>Safe zone:</strong> Home · 100m radius</div>
            <button className="gf-edit-btn">Edit zone</button>
          </div>
        </div>

        {/* ── MOVEMENT TIMELINE ── */}
        <div className={`timeline-card ${timelineOpen ? 'open' : ''}`}>
          <div className="tl-header" onClick={() => setTimelineOpen(!timelineOpen)}>
            <div>
              <h3>Movement Timeline</h3>
              <p>Today, {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
            </div>
            <ChevronDown className="tl-chevron" size={16} />
          </div>

          <div className="tl-summary">
            <div className="tl-sum-item">
              <div className="tl-sum-val">{isAtHome ? '1' : '2'}</div>
              <div className="tl-sum-lbl">Locations</div>
            </div>
            <div className="tl-sum-item">
              <div className="tl-sum-val">{isAtHome ? '0' : '5'}</div>
              <div className="tl-sum-unit"> min</div>
              <div className="tl-sum-lbl">Outside</div>
            </div>
            <div className="tl-sum-item">
              <div className="tl-sum-val">--</div>
              <div className="tl-sum-lbl">At home</div>
            </div>
          </div>

          <div className="tl-body">
            <div className="tl-list">
              {!isAtHome && (
                <div className="tl-event">
                  <div className="tl-dot-wrap"><div className="tl-dot current"></div></div>
                  <div className="tl-content">
                    <div className="tl-time">Now</div>
                    <div className="tl-place">📍 {address}</div>
                    <div className="tl-detail">Outside safe zone · HR {data.hr} BPM</div>
                    <div className="tl-now-badge"><span className="now-dot"></span>Currently here</div>
                  </div>
                </div>
              )}
              
              <div className="tl-event">
                <div className="tl-dot-wrap"><div className={`tl-dot ${isAtHome ? 'current' : 'home'}`}></div></div>
                <div className="tl-content">
                  <div className="tl-time">{isAtHome ? 'Now' : '10:00'}</div>
                  <div className="tl-place">🏠 Home</div>
                  <div className="tl-detail">Safe within geofence · Vitals normal</div>
                  {isAtHome && <div className="tl-now-badge"><span className="now-dot"></span>Currently here</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav className="bottom-nav">
        <Link to="/" className="ni"><Clock size={21} /><span className="ni-lbl">Dashboard</span></Link>
        <Link to="/map" className="ni on"><MapPin size={21} /><span className="ni-lbl">Map</span></Link>
        <Link to="/vitals" className="ni"><Heart size={21} /><span className="ni-lbl">Vitals</span></Link>
        <Link to="/profile" className="ni"><User size={21} /><span className="ni-lbl">Profile</span></Link>
      </nav>
    </div>
  )
}
