import React, { useEffect, useState, useRef } from 'react';
import {
  MapContainer, TileLayer, Marker, Tooltip, Polygon, useMap, useMapEvents,
} from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import './MapBlur.css';

const API_BASE_URL = 'https://map2-0.onrender.com';

// Icons (same as yours)
const graveIcon = new L.Icon({
  iconUrl: 'https://img.icons8.com/?size=100&id=8795&format=png&color=000000',
  iconSize: [26, 26],
});
const availableGraveIcon = new L.Icon({
  iconUrl: 'https://img.icons8.com/?size=100&id=8795&format=png&color=ff0000',
  iconSize: [26, 26],
});

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

const MapCenter = ({ lat, lng, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], zoom);
  }, [lat, lng, zoom, map]);
  return null;
};

const MouseCoordinates = () => {
  const [position, setPosition] = useState(null);
  useMapEvents({ mousemove: (e) => setPosition(e.latlng) });
  if (!position) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 10, left: 10,
      background: 'rgba(255,255,255,0.8)', padding: '4px 8px',
      borderRadius: 4, fontSize: 12, zIndex: 1000, pointerEvents: 'none',
    }}>
      Lat: {position.lat.toFixed(5)} | Lng: {position.lng.toFixed(5)}
    </div>
  );
};

const ViewMap = () => {
  const [graves, setGraves] = useState([]);
  const [zoomLevel] = useState(15);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCoords, setSearchCoords] = useState(null);
  const [cemeteryPolygon, setCemeteryPolygon] = useState(null);
  const [clipPath, setClipPath] = useState(null);

  const mapRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const loadGraves = async () => {
      try {
        const [occupiedRes, availableRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/plot`),
          axios.get(`${API_BASE_URL}/api/available`),
        ]);
        setGraves([...occupiedRes.data, ...availableRes.data]);
      } catch (err) {
        console.error('Error loading graves:', err);
      }
    };
    loadGraves();
  }, []);

  // Fetch polygon boundary on cemetery search coordinates update
  useEffect(() => {
    if (!searchCoords) {
      setCemeteryPolygon(null);
      return;
    }

    // Example: fetch boundary polygon from Overpass API or your backend
    // For demo: a fake polygon around the searched location
    const fakePolygon = {
      type: 'Polygon',
      coordinates: [[
        [searchCoords.lng - 0.001, searchCoords.lat - 0.001],
        [searchCoords.lng + 0.001, searchCoords.lat - 0.001],
        [searchCoords.lng + 0.001, searchCoords.lat + 0.001],
        [searchCoords.lng - 0.001, searchCoords.lat + 0.001],
        [searchCoords.lng - 0.001, searchCoords.lat - 0.001],
      ]],
    };

    setCemeteryPolygon(fakePolygon);
  }, [searchCoords]);

  // Update clip path whenever cemeteryPolygon or map changes
  useEffect(() => {
    if (!mapRef.current || !cemeteryPolygon) {
      setClipPath(null);
      return;
    }
    const map = mapRef.current;
    let coords = [];

    if (cemeteryPolygon.type === 'Polygon') {
      coords = cemeteryPolygon.coordinates[0].map(([lng, lat]) => {
        const point = map.latLngToContainerPoint([lat, lng]);
        return `${point.x}px ${point.y}px`;
      });
    } else if (cemeteryPolygon.type === 'MultiPolygon') {
      coords = cemeteryPolygon.coordinates[0][0].map(([lng, lat]) => {
        const point = map.latLngToContainerPoint([lat, lng]);
        return `${point.x}px ${point.y}px`;
      });
    }

    if (coords.length > 0) {
      setClipPath(`polygon(${coords.join(',')})`);
    } else {
      setClipPath(null);
    }
  }, [cemeteryPolygon, searchCoords]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: `${searchTerm} cemetery`, format: 'json', limit: 1 },
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
    <div style={{ position: 'relative' }}>
      <div className="blur-overlay" style={{ clipPath: clipPath || 'none' }} />

      {/* Controls */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1000,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '6px 10px',
          borderRadius: 4,
          boxShadow: '0 0 5px rgba(0,0,0,0.2)',
        }}
      >
        <input
          type="text"
          placeholder="Search cemetery"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ flex: 1, minWidth: '180px' }}
        />
        <button onClick={handleSearch}>Search</button>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All</option>
          <option value="occupied">Occupied</option>
          <option value="available">Available</option>
        </select>
        <button onClick={() => navigate('/admin')} style={{ display: 'none' }}>
          Admin
        </button>
      </div>

      <MapContainer
        center={[-26.19394, 28.02739]}
        zoom={zoomLevel}
        whenCreated={(map) => (mapRef.current = map)}
        style={{ height: '90vh', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {searchCoords && <MapCenter lat={searchCoords.lat} lng={searchCoords.lng} zoom={17} />}
        <MouseCoordinates />

        {cemeteryPolygon && cemeteryPolygon.type === 'Polygon' && (
          <Polygon
            positions={cemeteryPolygon.coordinates[0].map(coord => [coord[1], coord[0]])}
            pathOptions={{ color: 'green', fillOpacity: 0.1 }}
          />
        )}
        {cemeteryPolygon && cemeteryPolygon.type === 'MultiPolygon' && (
          cemeteryPolygon.coordinates.map((polygon, idx) => (
            <Polygon
              key={idx}
              positions={polygon[0].map(coord => [coord[1], coord[0]])}
              pathOptions={{ color: 'green', fillOpacity: 0.1 }}
            />
          ))
        )}

        {graves
          .filter(g => g.lat && g.lng)
          .filter((g) => {
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
