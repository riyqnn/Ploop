import { useState, useEffect } from "react";
import { Search, ArrowLeft, CheckCircle, MapPin } from "lucide-react";
import Maps, { MarkerPosition } from "../maps/maps";

interface PropertyProps {
  onBack: () => void;
  onLocationConfirm: (position: MarkerPosition) => void;
  markerPosition: MarkerPosition;
  setMarkerPosition: (position: MarkerPosition) => void;
}

function Property({ onBack, onLocationConfirm, markerPosition, setMarkerPosition }: PropertyProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationText, setLocationText] = useState("");

  useEffect(() => {
    console.log("Property rendered with markerPosition:", markerPosition);
    setLocationText(`Lat: ${markerPosition.lat.toFixed(6)}, Lng: ${markerPosition.lng.toFixed(6)}`);
  }, [markerPosition]);

  const handleMarkerClick = (position: MarkerPosition) => {
    setMarkerPosition(position);
    console.log("Marker placed at:", position);
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery) {
      console.log("Searching for:", searchQuery);
    }
  };

  const handleLocationConfirm = () => {
    console.log("Location confirmed:", markerPosition);
    onLocationConfirm(markerPosition);
  };

  return (
    <div className="relative w-screen h-screen flex flex-col bg-white">
      {/* Map Container */}
      <div className="flex-1 relative z-10">
        <Maps
          isInteractive={true}
          onZoomComplete={() => console.log("Zoom complete in Property")}
          markerPosition={markerPosition}
          onMarkerClick={handleMarkerClick}
          enableClickToPlace={true}
          disableAnimation={true}
          showLayerControls={false}
           properties={[]}
        />
        {/* Center Crosshair */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
          <div className="w-1 h-1 bg-red-500 rounded-full opacity-50"></div>
        </div>
      </div>

      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-md z-50">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearch}
            placeholder="Search location..."
            className="w-full p-4 pl-5 pr-12 rounded-full border-2 border-[#E2E8F0] bg-white focus:outline-none focus:border-[#78b6ff] focus:ring-0 text-gray-700 shadow-sm"
          />
          <Search className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 z-40">
        <div className="bg-black/90 text-white text-sm rounded-md px-4 py-2 flex items-center gap-2 shadow w-fit max-w-[80vw]">
          <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span className="text-center leading-tight font-medium">
            click directly on your desired location
          </span>
        </div>

        <div className="flex gap-3 w-fit">
          <button
            onClick={onBack}
            className="border-[2px] border-[#E2E8F0] bg-white text-gray-700 rounded-xl py-1.5 px-4 text-sm font-medium hover:bg-gray-100 transition-all shadow-sm flex items-center justify-center gap-2"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={handleLocationConfirm}
            className="border-[2px] border-[#78b6ff] bg-gradient-to-r from-[#5b9bf3] to-[#78b6ff] text-white rounded-xl py-1.5 px-4 text-sm font-medium hover:brightness-110 transition-all shadow-sm flex items-center justify-center gap-2"
            type="button"
          >
            <CheckCircle className="w-4 h-4" />
            Select Location
          </button>
        </div>
      </div>
    </div>
  );
}

export default Property;