import React, { useEffect, useState, useRef } from 'react';
import {
  MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents,
} from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'https://map2-0.onrender.com';

// Icons
const graveIcon = new L.Icon({
  iconUrl: 'https://img.icons8.com/?size=100&id=8795&format=png&color=000000',
  iconSize: [26, 26],
});

const availableGraveIcon = new L.Icon({
  iconUrl: 'https://img.icons8.com/?size=100&id=8795&format=png&color=ff0000',
  iconSize: [26, 26],
});

// Convert DMS to Decimal
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

// Re-center map on search
const MapCenter = ({ lat, lng, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], zoom);
  }, [lat, lng, zoom, map]);
  return null;
};

// Show live coordinates
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

// Main component
const ViewMap = () => {
  const [graves, setGraves] = useState([]);
  const [zoomLevel] = useState(15);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCoords, setSearchCoords] = useState(null);
  const mapRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    loadGraves();
  }, []);

  const loadGraves = async () => {
    try {
      const [occupiedRes, availableRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/plot`),
        axios.get(`${API_BASE_URL}/api/available`)
      ]);
      setGraves([...occupiedRes.data, ...availableRes.data]);
    } catch (err) {
      console.error('Error loading graves:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: `${searchTerm} cemetery`, format: 'json', limit: 1 }
      });
      if (res.data.length > 0) {
        const loc = res.data[0];
        setSearchCoords({ lat: parseFloat(loc.lat), lng: parseFloat(loc.lon) });
      } else {
        alert('Cemetery not found');
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  return (
    <div>
      {/* Admin Button */}
      <div style={{
        position: 'absolute',
        top: 10, right: 10,
        zIndex: 1000
      }}>
        <button onClick={() => navigate('/admin')}>
          Admin
        </button>
      </div>

      {/* Controls */}
      <div style={{ padding: 10, display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Search cemetery"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ flex: 1 }}
        />
        <button onClick={handleSearch}>Search</button>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All</option>
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
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {searchCoords && <MapCenter lat={searchCoords.lat} lng={searchCoords.lng} zoom={17} />}
        <MouseCoordinates />

        {graves
          .filter(g => g.lat && g.lng)
          .filter(g => {
            if (filterStatus === 'all') return true;
            const isAvailable = g.Status?.toLowerCase() === 'available';
            return filterStatus === 'available' ? isAvailable : !isAvailable;
          })
          .map((g) => {
            const lat = parseCoordinate(g.lat);
            const lng = parseCoordinate(g.lng);
            if (lat == null || lng == null) return null;

            const isAvailable = g.Status?.toLowerCase() === 'available';

            return (
              <Marker
                key={`${g.Permit}-${g.Grave}`}
                position={[lat, lng]}
                icon={isAvailable ? availableGraveIcon : graveIcon}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  {isAvailable ? (
                    <>
                      <strong>Available Plot</strong><br />
                      Lot: {g.Lot}, Block: {g.Block}, Grave: {g.Grave}
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
      </MapContainer>
    </div>
  );
};

export default ViewMap;
