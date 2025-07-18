import React, { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

const API_BASE_URL = 'https://map2-0.onrender.com';  //  your backend URL 

// 🪦 Custom Icons
const graveIcon = new L.Icon({
  iconUrl: 'https://img.icons8.com/?size=100&id=8795&format=png&color=000000',
  iconSize: [26, 26],
});

const availableGraveIcon = new L.Icon({
  iconUrl: 'https://img.icons8.com/?size=100&id=8795&format=png&color=ff0000',
  iconSize: [26, 26],
});

// 🧮 DMS to Decimal Conversion
const dmsToDecimal = (dmsStr) => {
  if (!dmsStr) return null;
  if (typeof dmsStr === 'number') return dmsStr;
  const regex = /(\d+)[°º']\s*(\d+)?['′]?\s*(\d+)?[″"]?\s*([NSEW])/i;
  const match = dmsStr.match(regex);
  if (!match) return parseFloat(dmsStr) || null;
  const [, deg, min = '0', sec = '0', dir] = match;
  let decimal = parseFloat(deg) + parseFloat(min) / 60 + parseFloat(sec) / 3600;
  if (['S', 'W'].includes(dir.toUpperCase())) decimal *= -1;
  return decimal;
};

const parseCoordinate = (coord) => dmsToDecimal(coord);

// 📍 Reusable Hooks
const MouseCoordinates = () => {
  const [position, setPosition] = useState(null);
  useMapEvents({ mousemove: (e) => setPosition(e.latlng) });
  if (!position) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 10, left: 10,
      background: 'rgba(255,255,255,0.8)', padding: '4px 8px',
      borderRadius: 4, fontSize: 12, zIndex: 1000, pointerEvents: 'none'
    }}>
      Lat: {position.lat.toFixed(5)} | Lng: {position.lng.toFixed(5)}
    </div>
  );
};

const ZoomHandler = ({ setZoomLevel }) => {
  useMapEvents({ zoomend: (e) => setZoomLevel(e.target.getZoom()) });
  return null;
};

const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
};

const MapCenter = ({ lat, lng, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], zoom);
  }, [lat, lng, zoom, map]);
  return null;
};

// 📋 Grave Forms (available and occupied)
const AvailableGraveForm = ({ position, onSubmitSuccess, status }) => {
  const [formData, setFormData] = useState({
    Permit: '', Lot: '', Block: '', Grave: '', Status: status || '',
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, lat: position.lat, lng: position.lng };
    try {
      await axios.post(`${API_BASE_URL}/api/available`, payload);
      alert('Plot saved successfully');
      onSubmitSuccess?.();
    } catch (err) {
      console.error('Submit error:', err);
      alert('Error saving plot');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ minWidth: 250 }}>
      <h4>Available Plot Info</h4>
      <input name="Permit" placeholder="Permit" value={formData.Permit} onChange={handleChange} required />
      <input name="Lot" placeholder="Lot" value={formData.Lot} onChange={handleChange} required />
      <input name="Block" placeholder="Block" value={formData.Block} onChange={handleChange} required />
      <input name="Grave" placeholder="Grave" value={formData.Grave} onChange={handleChange} required />
      <input name="Status" value={formData.Status} readOnly />
      <button type="submit" style={{ marginTop: 10 }}>Save Plot</button>
    </form>
  );
};

const OccupiedGraveForm = ({ position, onSubmitSuccess, status }) => {
  const [formData, setFormData] = useState({
    DecID: '', DecNama: '', DecSurname: '', DoB: '', DoD: '',
    sex: '', Permit: '', Lot: '', Block: '', Grave: '', Status: status || '',
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, lat: position.lat, lng: position.lng };
    try {
      await axios.post(`${API_BASE_URL}/api/plot`, payload);
      alert('Saved successfully');
      onSubmitSuccess?.();
    } catch (err) {
      console.error('Submit error:', err);
      alert('Error saving entry');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ minWidth: 250 }}>
      <h4>Deceased Info</h4>
      <input name="DecID" placeholder="Deceased ID" value={formData.DecID} onChange={handleChange} required />
      <input name="DecNama" placeholder="First Name" value={formData.DecNama} onChange={handleChange} required />
      <input name="DecSurname" placeholder="Surname" value={formData.DecSurname} onChange={handleChange} required />
      <select name="sex" value={formData.sex} onChange={handleChange} required>
        <option value="">Select Sex</option>
        <option value="M">Male</option>
        <option value="F">Female</option>
      </select>
      <input type="date" name="DoB" value={formData.DoB} onChange={handleChange} required />
      <input type="date" name="DoD" value={formData.DoD} onChange={handleChange} required />
      <input name="Permit" placeholder="Permit" value={formData.Permit} onChange={handleChange} required />

      <h4>Plot Info</h4>
      <input name="Lot" placeholder="Lot" value={formData.Lot} onChange={handleChange} required />
      <input name="Block" placeholder="Block" value={formData.Block} onChange={handleChange} required />
      <input name="Grave" placeholder="Grave" value={formData.Grave} onChange={handleChange} required />
      <input name="Status" placeholder="Status" value={formData.Status} onChange={handleChange} required />

      <button type="submit" style={{ marginTop: 10 }}>Save Entry</button>
    </form>
  );
};

// 🌍 Main Component
const GraveMap = () => {
  const [graves, setGraves] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastSearchCoords, setLastSearchCoords] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const mapRef = useRef();

  useEffect(() => {
    loadGraves();
  }, []);

  const loadGraves = async () => {
    try {
      const [occupiedRes, availableRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/plot`),
        axios.get(`${API_BASE_URL}/api/available`)
      ]);
      const combined = [...occupiedRes.data, ...availableRes.data];
      setGraves(combined);
    } catch (err) {
      console.error('Error loading graves:', err);
    }
  };

  const handleMapClick = (latlng) => {
    setSelectedPosition(latlng);
    setShowStatusSelector(true);
  };

  const handleRightClick = async (PermitID) => {
    if (!window.confirm('Delete this grave entry?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/plot/${PermitID}`);
      setGraves(prev => prev.filter((g) => g.Permit !== PermitID));
    } catch (error) {
      console.error('Error deleting grave:', error);
      alert('Failed to delete entry.');
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: `${searchTerm} cemetery`, format: 'json', limit: 1 }
      });
      if (response.data.length > 0) {
        const place = response.data[0];
        setLastSearchCoords({ lat: parseFloat(place.lat), lon: parseFloat(place.lon) });
      } else {
        alert('Location not found');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Error searching location.');
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Status Selector Modal */}
      {showStatusSelector && selectedPosition && (
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', background: 'white', padding: 20, borderRadius: 8, zIndex: 1000 }}>
          <h4>Select Grave Status</h4>
          <button onClick={() => { setSelectedStatus('occupied'); setShowStatusSelector(false); }}>Occupied (Black)</button>
          <button onClick={() => { setSelectedStatus('available'); setShowStatusSelector(false); }}>Available (Red)</button>
          <br />
          <button style={{ marginTop: 10 }} onClick={() => {
            setSelectedPosition(null);
            setShowStatusSelector(false);
          }}>Cancel</button>
        </div>
      )}

      {/* Controls */}
      <div style={{ padding: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search for a cemetery"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={handleSearch}>Search</button>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">Show All</option>
          <option value="occupied">Occupied</option>
          <option value="available">Available</option>
        </select>
      </div>

      {/* Map */}
      <MapContainer
        center={[-26.19394, 28.02739]}
        zoom={zoomLevel}
        whenCreated={(map) => (mapRef.current = map)}
        style={{ height: '90vh', width: '100%' }}
        maxBounds={[[-35, 15], [-21, 35]]}
        maxBoundsViscosity={1.0}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickHandler onMapClick={handleMapClick} />
        <ZoomHandler setZoomLevel={setZoomLevel} />
        <MouseCoordinates />
        {lastSearchCoords && <MapCenter lat={lastSearchCoords.lat} lng={lastSearchCoords.lon} zoom={17} />}

        {/* Display existing graves */}
        {zoomLevel >= 14 &&
          graves
            .filter(g => g.lat && g.lng)
            .filter(g => {
              if (filterStatus === 'all') return true;
              const isAvailable = g.Status?.toLowerCase() === 'available';
              return filterStatus === 'available' ? isAvailable : !isAvailable;
            })
            .map((g) => {
              const lat = parseCoordinate(g.lat);
              const lng = parseCoordinate(g.lng);
              if (lat === null || lng === null) return null;
              const isAvailable = g.Status?.toLowerCase() === 'available';
              return (
                <Marker
                  key={g.Permit}
                  position={[lat, lng]}
                  icon={isAvailable ? availableGraveIcon : graveIcon}
                  eventHandlers={{ contextmenu: () => handleRightClick(g.Permit) }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                    {isAvailable ? (
                      <>
                        <strong>Available Plot</strong><br />
                        Lot: {g.Lot} | Block: {g.Block} | Grave: {g.Grave}
                      </>
                    ) : (
                      <>
                        <strong>{g.DecNama} {g.DecSurname}</strong><br />
                        {g.DoB} – {g.DoD}
                      </>
                    )}
                  </Tooltip>
                </Marker>
              );
            })}

        {/* New marker and form */}
        {selectedPosition && selectedStatus && (
          <Marker
            position={selectedPosition}
            icon={selectedStatus === 'available' ? availableGraveIcon : graveIcon}
          >
            <Popup>
              {selectedStatus === 'available' ? (
                <AvailableGraveForm
                  position={selectedPosition}
                  status={selectedStatus}
                  onSubmitSuccess={() => {
                    loadGraves();
                    setSelectedPosition(null);
                    setSelectedStatus(null);
                  }}
                />
              ) : (
                <OccupiedGraveForm
                  position={selectedPosition}
                  status={selectedStatus}
                  onSubmitSuccess={() => {
                    loadGraves();
                    setSelectedPosition(null);
                    setSelectedStatus(null);
                  }}
                />
              )}
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default GraveMap;
