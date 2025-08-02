import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/nav";
import Maps from "./maps";
import Form from "../components/fom";
import LayerButton from "./layer/button";
import GetProperty from "./getproperty/getProperty";
import DetailProperty from "./getproperty/detailproperty";
import Penduduk from "./layer/proteksi/penduduk";
import Bencana from "./layer/proteksi/bencana";
import Ekonomi from "./layer/proteksi/ekonomi";
import Lahan from "./layer/proteksi/lahan"; // Import the Lahan component
import { Property } from "@/types/Property";

function MapLayout() {
  const [isMapInteractive, setIsMapInteractive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showLayerButton, setShowLayerButton] = useState(false);
  const [shouldStartAnimation, setShouldStartAnimation] = useState(false);
  const [mapStyle, setMapStyle] = useState("street");
  const [rainfallEnabled, setRainfallEnabled] = useState(false);
  const [pendudukEnabled, setPendudukEnabled] = useState(false);
  const [bencanaEnabled, setBencanaEnabled] = useState(false);
  const [ekonomiEnabled, setEkonomiEnabled] = useState(false);
  const [lahanEnabled, setLahanEnabled] = useState(false); // Add land use state
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const location = useLocation();

  const isMapsPage = location.pathname === "/maps";

  useEffect(() => {
    if (isMapsPage) {
      const timer = setTimeout(() => {
        setShouldStartAnimation(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShouldStartAnimation(false);
      setShowForm(false);
      setIsMapInteractive(false);
      setShowLayerButton(false);
      setRainfallEnabled(false);
      setPendudukEnabled(false);
      setBencanaEnabled(false);
      setEkonomiEnabled(false);
      setLahanEnabled(false); // Reset land use state
      setIsSidebarVisible(true);
      setSelectedProperty(null);
      console.log("MapLayout: Reset states for route:", location.pathname);
    }
  }, [location.pathname]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isMapsPage) {
      setIsMapInteractive(true);
      setShowForm(true);
      setShowLayerButton(true);
      setIsSidebarVisible(true);
      console.log("MapLayout: Form submitted on /maps");
    }
  };

  const handleZoomComplete = () => {
    if (isMapsPage) {
      setShowForm(true);
      console.log("MapLayout: Zoom complete, showing sidebar on /maps");
    } else {
      console.log("MapLayout: Zoom complete ignored on:", location.pathname);
    }
  };

  const handleStyleChange = (styleUrl: string) => {
    if (isMapsPage) {
      console.log("MapLayout: Style change requested:", styleUrl);
      let leafletStyle = "street";
      if (styleUrl.includes("light")) leafletStyle = "light";
      else if (styleUrl.includes("dark")) leafletStyle = "dark";
      else if (styleUrl.includes("satellite")) leafletStyle = "satellite";
      else if (styleUrl.includes("street")) leafletStyle = "street";
      console.log("MapLayout: Converted to Leaflet style:", leafletStyle);
      setMapStyle(leafletStyle);
    }
  };

  const handleProjectionChange = (projection: string | null, year: string) => {
    if (isMapsPage) {
      console.log(`MapLayout: Projection changed to: ${projection}, Year: ${year}`);
    }
  };

  const handleRainfallToggle = (enabled: boolean) => {
    if (isMapsPage) {
      console.log(`MapLayout: Rainfall toggled: ${enabled}`);
      setRainfallEnabled(enabled);
    }
  };

  const handlePendudukToggle = (enabled: boolean) => {
    if (isMapsPage) {
      console.log(`MapLayout: Population Density toggled: ${enabled}`);
      setPendudukEnabled(enabled);
    }
  };

  const handleBencanaToggle = (enabled: boolean) => {
    if (isMapsPage) {
      console.log(`MapLayout: Disaster Risk toggled: ${enabled}`);
      setBencanaEnabled(enabled);
    }
  };

  const handleEkonomiToggle = (enabled: boolean) => {
    if (isMapsPage) {
      console.log(`MapLayout: Economic Contribution toggled: ${enabled}`);
      setEkonomiEnabled(enabled);
    }
  };

  const handleLahanToggle = (enabled: boolean) => {
    if (isMapsPage) {
      console.log(`MapLayout: Land Use toggled: ${enabled}`);
      setLahanEnabled(enabled);
    }
  };

  const handleMapReady = (mapInstance: L.Map) => {
    console.log("MapLayout: Map instance ready");
    setMapInstance(mapInstance);
  };

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    setIsSidebarVisible(false);
    console.log("MapLayout: Selected property:", property.name);
  };

  const handleCloseDetail = () => {
    setSelectedProperty(null);
    setIsSidebarVisible(true);
    console.log("MapLayout: Closed property details");
  };

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
    if (selectedProperty) {
      setSelectedProperty(null);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Maps - Full background */}
      <div className="absolute inset-0 w-full h-full z-10">
        <Maps
          isInteractive={isMapsPage ? isMapInteractive : false}
          onZoomComplete={isMapsPage ? handleZoomComplete : () => {}}
          mapStyle={mapStyle}
          shouldStartAnimation={isMapsPage ? shouldStartAnimation : false}
          showLayerControls={isMapsPage && isMapInteractive}
          rainfallEnabled={isMapsPage ? rainfallEnabled : false}
          onRainfallToggle={handleRainfallToggle}
          onProjectionChange={handleProjectionChange}
          onStyleChange={handleStyleChange}
          onMapReady={handleMapReady}
          selectedProperty={selectedProperty}
          properties={properties}
        />
      </div>

      {/* Population Density Overlay */}
      {isMapsPage && isMapInteractive && (
        <Penduduk map={mapInstance} enabled={pendudukEnabled} dataType="penduduk" />
      )}

      {/* Disaster Risk Overlay */}
      {isMapsPage && isMapInteractive && (
        <Bencana map={mapInstance} enabled={bencanaEnabled} dataType="bencana" />
      )}

      {/* Economic Contribution Overlay */}
      {isMapsPage && isMapInteractive && (
        <Ekonomi map={mapInstance} enabled={ekonomiEnabled} dataType="ekonomi" />
      )}

      {/* Land Use Overlay */}
      {isMapsPage && isMapInteractive && (
        <Lahan map={mapInstance} enabled={lahanEnabled} dataType="lahan" />
      )}

      {/* Navbar */}
      <div className="relative z-50">
        <Navbar isSidebarVisible={isMapsPage ? isSidebarVisible : false} />
      </div>

      {/* Form - Centered before submission */}
      {isMapsPage && !isMapInteractive && showForm && (
        <div className="absolute inset-0 w-full h-full z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative z-10">
            <Form onSubmit={handleFormSubmit} />
          </div>
        </div>
      )}

      {/* Sidebar - Scrollable, shown after form submission */}
      {isMapsPage && isMapInteractive && showForm && !selectedProperty && (
        <div
          className={`absolute top-0 left-0 w-[320px] h-screen z-40 flex flex-col px-6 py-6 bg-gradient-to-b from-[#dcd6f7] to-[#abd0ff]/70 text-white backdrop-blur-md transition-transform duration-300 ease-in-out overflow-y-auto ${
            isSidebarVisible ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Toggle button to hide sidebar */}
          <button
            onClick={toggleSidebar}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 text-white text-sm hover:bg-blue-600 transition-colors"
            aria-label="Hide sidebar"
          >
            <i className="fas fa-chevron-left"></i>
          </button>

          {/* Form at the top */}
          <div className="animate-fade-in mb-6">
            <h2 className="font-semibold text-black text-[15px] leading-5 mb-2">
              Property Search
            </h2>
            <p className="text-[11px] leading-[14px] font-normal mb-4 max-w-[280px] text-black">
              Enter your criteria to find properties on the map.
            </p>
            <Form onSubmit={handleFormSubmit} />
          </div>

          {/* Property List below the form */}
          <GetProperty
            onPropertySelect={handlePropertySelect}
            onPropertiesLoaded={setProperties}
          />
        </div>
      )}

      {/* Property Details - Shown when a property is selected */}
      {isMapsPage && isMapInteractive && showForm && selectedProperty && (
        <div className="absolute top-0 left-0 w-[320px] h-screen z-40 flex flex-col px-6 py-6 bg-gradient-to-b from-[#dcd6f7] to-[#abd0ff]/70 text-white backdrop-blur-md transition-transform duration-300 ease-in-out overflow-y-auto">
          <DetailProperty property={selectedProperty} onClose={handleCloseDetail} />
        </div>
      )}

      {/* Button to show sidebar when hidden */}
      {isMapsPage && isMapInteractive && showForm && !isSidebarVisible && !selectedProperty && (
        <button
          onClick={toggleSidebar}
          className="fixed w-12 h-16 flex items-center justify-center rounded-r-lg bg-blue-500 text-white z-50 pointer-events-auto hover:bg-blue-600 transition-all duration-300 shadow-xl border-r-2 border-blue-400"
          aria-label="Show sidebar"
          style={{
            top: "50%",
            left: "4px",
            transform: "translateY(-50%)",
          }}
        >
          <i className="fas fa-chevron-right text-lg"></i>
        </button>
      )}

      {/* LayerButton - Only show on /maps when map is interactive */}
      {isMapsPage && showLayerButton && isMapInteractive && (
        <div className="absolute bottom-0 right-0 z-50 pointer-events-auto">
          <LayerButton
            onStyleChange={handleStyleChange}
            onProjectionChange={handleProjectionChange}
            onRainfallToggle={handleRainfallToggle}
            onPendudukToggle={handlePendudukToggle}
            onBencanaToggle={handleBencanaToggle}
            onEkonomiToggle={handleEkonomiToggle}
            onLahanToggle={handleLahanToggle}
          />
        </div>
      )}
    </div>
  );
}

export default MapLayout;