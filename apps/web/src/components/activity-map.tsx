'use client';

import { MapContainer, Polyline, TileLayer } from 'react-leaflet';
import { decodePolyline } from '@/lib/polyline';
import 'leaflet/dist/leaflet.css';

export function ActivityMap({ encoded }: { encoded: string }) {
  const positions = decodePolyline(encoded);

  if (positions.length < 2) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
        Sem dados de GPS para esta atividade.
      </div>
    );
  }

  const center = positions[Math.floor(positions.length / 2)];

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom={false}
      className="h-64 w-full rounded-xl z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={positions} pathOptions={{ color: '#f97316', weight: 4 }} />
    </MapContainer>
  );
}
