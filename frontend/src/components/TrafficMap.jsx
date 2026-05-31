import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function TrafficMap() {
  return (
    <MapContainer
      center={[17.385, 78.4867]}
      zoom={12}
      style={{
        height: "400px",
        width: "100%",
        borderRadius: "12px"
      }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[17.385, 78.4867]}>
        <Popup>Traffic Monitoring Center</Popup>
      </Marker>
    </MapContainer>
  );
}

export default TrafficMap;