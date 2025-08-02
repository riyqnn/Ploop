import { useState } from "react";
import Maps from "../maps/maps";
import apimage from "/addproperty.png";
import Property from "./property";
import PropertyForm from "./propertyform";

interface ManageState {
  isMapInteractive: boolean;
  showSidebarContent: boolean;
  showPropertyMap: boolean;
  showPropertyForm: boolean;
}

interface MarkerPosition {
  lat: number;
  lng: number;
}

function Manage() {
  const [state, setState] = useState<ManageState>({
    isMapInteractive: false,
    showSidebarContent: false,
    showPropertyMap: false,
    showPropertyForm: false,
  });

  // Add marker position state
  const [markerPosition, setMarkerPosition] = useState<MarkerPosition>({
    lat: -6.1754, // Monas, Jakarta
    lng: 106.8272,
  });

  const handleZoomComplete = () => {
    setState((prev) => ({ ...prev, showSidebarContent: true }));
  };

  const handleAddPropertyClick = () => {
    // Hide sidebar, show property map
    setState((prev) => ({
      ...prev,
      showPropertyMap: true,
      isMapInteractive: true,
      showSidebarContent: false,
      showPropertyForm: false,
    }));
  };

  const handleBackFromProperty = () => {
    // Back to main manage view
    setState((prev) => ({
      ...prev,
      showPropertyMap: false,
      showPropertyForm: false,
      isMapInteractive: false,
      showSidebarContent: true,
    }));
  };

  const handleLocationConfirm = (position: MarkerPosition) => {
    setMarkerPosition(position);
    // Hide property map, show sidebar with form
    setState((prev) => ({
      ...prev,
      showPropertyMap: false,
      showPropertyForm: true,
      isMapInteractive: false,
      showSidebarContent: true,
    }));
  };

  const handleBackFromForm = () => {
    // Back to property map for location selection
    setState((prev) => ({
      ...prev,
      showPropertyMap: true,
      showPropertyForm: false,
      isMapInteractive: true,
      showSidebarContent: false,
    }));
  };

  const handleFormComplete = () => {
    // After form submission, back to main manage
    setState((prev) => ({
      ...prev,
      showPropertyMap: false,
      showPropertyForm: false,
      isMapInteractive: false,
      showSidebarContent: true,
    }));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Maps Background */}
      <div className="absolute top-0 left-0 w-screen h-screen z-0">
        <Maps
          isInteractive={state.isMapInteractive}
          onZoomComplete={handleZoomComplete}
          enableClickToPlace={false}
           properties={[]}
        />
      </div>

      {/* Sidebar - Show when not in property map mode */}
      <div
        className={`absolute top-0 left-0 w-[320px] h-screen z-30 flex flex-col justify-start px-6 py-6 bg-gradient-to-b from-[#dcd6f7] to-[#abd0ff]/70 text-white backdrop-blur-md transition-transform duration-500 ease-in-out ${
          state.showPropertyMap ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Default sidebar content - Add Property */}
        {state.showSidebarContent && !state.showPropertyForm && (
          <div className="animate-fade-in">
            <h2 className="font-semibold text-black text-[15px] leading-5 mb-2 justify-center">
              Manage Your Property Outreach
            </h2>
            <p className="text-[11px] leading-[14px] font-normal mb-6 max-w-[280px] text-black">
              Centralized place to showcase and share your properties on the Ploop platform.
            </p>
            
            <div
              className="flex items-center gap-4 rounded-lg p-4 mb-4 cursor-pointer shadow-lg hover:shadow-xl transition-shadow duration-200"
              style={{
                background: "linear-gradient(to right, #FFFFFF 43.1%, #75C5E0 92.99%)",
              }}
              onClick={handleAddPropertyClick}
            >
              <img
                alt="Black and white illustration of a person holding a magnifier over a map with a location pin"
                className="w-[80px] h-[80px] object-contain flex-shrink-0"
                height={80}
                src={apimage}
                width={80}
              />
              <div className="flex flex-col flex-grow">
                <span className="font-semibold text-[13px] leading-5 text-black">
                  Add Property
                </span>
                <p className="text-[10px] leading-[13px] text-black mt-1 max-w-[180px]">
                  Showcase your property to attract and inform potential investors.
                </p>
              </div>
              <i className="fas fa-chevron-right text-black text-sm"></i>
            </div>
          </div>
        )}

        {/* Property Form in Sidebar */}
        {state.showPropertyForm && (
          <div className="animate-fade-in h-full overflow-hidden">
            <PropertyForm 
              onBack={handleBackFromForm}
              markerPosition={markerPosition}
              onComplete={handleFormComplete}
            />
          </div>
        )}
      </div>

      {/* Property Component - Full screen for location selection */}
      {state.showPropertyMap && (
        <div className="absolute top-0 left-0 w-full h-full z-40 animate-fade-in">
          <Property 
            onBack={handleBackFromProperty}
            onLocationConfirm={handleLocationConfirm}
            markerPosition={markerPosition}
            setMarkerPosition={setMarkerPosition}
          />
        </div>
      )}
    </div>
  );
}

export default Manage;