import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Component to handle map centering when coords change
function ChangeView({ center, zoom }) {
  const map = useMap()
  map.setView(center, zoom)
  return null
}

export default function TripMap({ destination, hotels = [], focusedLocation = null }) {
  const [center, setCenter] = useState(null)
  const [markers, setMarkers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function initPoints() {
      if (!destination) return
      setLoading(true)
      try {
        // 1. Geocode Destination (Main center)
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=1`)
        const data = await res.json()
        
        let mainCoords = null
        if (data && data.length > 0) {
          mainCoords = [parseFloat(data[0].lat), parseFloat(data[0].lon)]
          setCenter(mainCoords)
        }

        // 2. Geocode Hotels (Optional markers)
        const hotelMarkers = []
        for (const hotel of hotels.slice(0, 3)) { // Limit to 3 to avoid rate limiting
          const hRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(hotel.name + ' ' + destination)}&limit=1`)
          const hData = await hRes.json()
          if (hData && hData.length > 0) {
            hotelMarkers.push({
              id: hotel.name,
              coords: [parseFloat(hData[0].lat), parseFloat(hData[0].lon)],
              name: hotel.name,
              type: 'hotel'
            })
          }
        }
        setMarkers(hotelMarkers)

      } catch (err) {
        console.error("Mapping error:", err)
      } finally {
        setLoading(false)
      }
    }
    initPoints()
  }, [destination, hotels])

  // Update center when a specific location is focused (e.g. clicking an itinerary item)
  useEffect(() => {
    if (focusedLocation) {
      setCenter(focusedLocation)
    }
  }, [focusedLocation])

  if (loading) {
    return (
      <div className="w-full h-[400px] bg-ink/20 animate-pulse rounded-3xl flex items-center justify-center border border-white/5">
        <p className="text-muted text-sm">Chargement de la carte...</p>
      </div>
    )
  }

  if (!center) return null

  return (
    <div className="w-full h-[400px] rounded-3xl overflow-hidden border border-white/10 shadow-glow-gold relative z-0">
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <ChangeView center={center} zoom={13} />
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* Main City Marker */}
        <Marker position={center}>
          <Popup><div className="font-sans font-bold">✨ {destination}</div></Popup>
        </Marker>

        {/* Hotel Markers */}
        {markers.map(m => (
          <Marker key={m.id} position={m.coords}>
            <Popup><div className="font-sans">🏨 <b>{m.name}</b></div></Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
