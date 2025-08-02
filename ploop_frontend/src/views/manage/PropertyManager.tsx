import { useState } from "react";
import Property from "./property"; // Adjust path
import PropertyForm from "./propertyform"; // Adjust path

interface MarkerPosition {
  lat: number;
  lng: number;
}

function PropertyManager() {
  const [markerPosition, setMarkerPosition] = useState<MarkerPosition>({
    lat: -6.1745, // Default: Jakarta
    lng: 106.8227,
  });
  const [showForm, setShowForm] = useState(false);

  const handleLocationConfirm = (position: MarkerPosition) => {
    setMarkerPosition(position);
    setShowForm(true); // Switch to PropertyForm
  };

  const handleBack = () => {
    setShowForm(false); // Return to Property component
  };

  return (
    <>
      {!showForm ? (
        <Property
          onBack={() => console.log("Back to previous screen or home")}
          onLocationConfirm={handleLocationConfirm}
          markerPosition={markerPosition}
          setMarkerPosition={setMarkerPosition}
        />
      ) : (
        <PropertyForm onBack={handleBack} markerPosition={markerPosition} />
      )}
    </>
  );
}

export default PropertyManager;