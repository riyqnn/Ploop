import React, { useState, useCallback, useEffect } from "react";
import { Layers, ChevronRight, ChevronLeft } from "lucide-react";

interface LayerButtonProps {
  onStyleChange: (styleUrl: string) => void;
  onProjectionChange?: (projection: string | null, year: string) => void;
  onRainfallToggle?: (enabled: boolean) => void;
  onPendudukToggle?: (enabled: boolean) => void;
  onBencanaToggle?: (enabled: boolean) => void;
  onEkonomiToggle?: (enabled: boolean) => void;
  onLahanToggle?: (enabled: boolean) => void; // Add land use toggle prop
}

const LayerButton: React.FC<LayerButtonProps> = ({
  onStyleChange,
  onProjectionChange,
  onRainfallToggle,
  onPendudukToggle,
  onBencanaToggle,
  onEkonomiToggle,
  onLahanToggle, // Add land use toggle prop
}) => {
  const [showLayer, setShowLayer] = useState(false);
  const [activeLayer, setActiveLayer] = useState("Street Building");
  const [showProjectionPanel, setShowProjectionPanel] = useState(false);
  const [showEnvironmentalPanel, setShowEnvironmentalPanel] = useState(false);
  const [activeYear, setActiveYear] = useState("2025");
  const [activeProjection, setActiveProjection] = useState<string | null>(null);

  const MAP_SERVICE_KEY = import.meta.env.VITE_MAPID_API_KEY || "your-api-key-here";

  const layers = [
    {
      label: "Light",
      src: "https://storage.googleapis.com/a1aa/image/b639bd54-c0d7-4495-a978-b5d6560f567b.jpg",
      styleUrl: `https://basemap.mapid.io/styles/light/style.json?key=${MAP_SERVICE_KEY}`,
    },
    {
      label: "Dark",
      src: "https://storage.googleapis.com/a1aa/image/09a0117d-0598-446a-d762-0eb5546ca04d.jpg",
      styleUrl: `https://basemap.mapid.io/styles/dark/style.json?key=${MAP_SERVICE_KEY}`,
    },
    {
      label: "Satellite",
      src: "https://storage.googleapis.com/a1aa/image/0bbb74f0-8722-4d5d-75d2-422526355aa7.jpg",
      styleUrl: `https://basemap.mapid.io/styles/satellite/style.json?key=${MAP_SERVICE_KEY}`,
    },
    {
      label: "Street Building",
      src: "https://storage.googleapis.com/a1aa/image/e4a2da0f-8bae-4cfb-cc0a-e5fb439b0a61.jpg",
      styleUrl: `https://basemap.mapid.io/styles/street-2d-building/style.json?key=${MAP_SERVICE_KEY}`,
    },
  ];

  const projectionData = [
    {
      label: "Land Use",
      src: "https://storage.googleapis.com/a1aa/image/8e5ae2a8-c0e6-4568-0725-e1a67ebf96c7.jpg",
      description: "Pattern of land use in an area based on its utilization.",
    },
    {
      label: "Economic Contribution",
      src: "https://storage.googleapis.com/a1aa/image/5ed9bc23-d03d-4a28-8efd-d7ef9d6bf861.jpg",
      description:
        "The magnitude of economic contribution based on the contribution of Regional Gross Domestic Product in each region.",
    },
    {
      label: "Population Density",
      src: "https://storage.googleapis.com/a1aa/image/5bf84189-4133-461d-1801-2ddb7841ca95.jpg",
      description: "The ratio of population to the land area in the region.",
    },
    {
      label: "Rain Fall",
      src: "https://storage.googleapis.com/a1aa/image/a1d18a62-8e08-4940-1aa8-1853c78f5dcf.jpg",
      description: "Rainfall intensity across Indonesia, measured in DN values.",
    },
  ];

  const environmentalData = [
    {
      label: "Disaster Risk",
      src: "https://storage.googleapis.com/a1aa/image/f5308a72-6d84-430b-28fe-1af6602fbcd1.jpg",
      description: "Disaster-prone areas including floods, earthquakes, landslides and other natural hazards.",
    }
  ];

  useEffect(() => {
    console.log("LayerButton: activeProjection changed to:", activeProjection);
  }, [activeProjection]);

  const toggleLayer = useCallback(() => {
    console.log("LayerButton: toggleLayer called, current showLayer:", showLayer);
    setShowLayer((prev) => !prev);
    setShowProjectionPanel(false);
    setShowEnvironmentalPanel(false);

    if (showLayer) {
      console.log("LayerButton: Closing layer panel, resetting states");
      setActiveProjection(null);
      onProjectionChange?.(null, activeYear);
      onRainfallToggle?.(false);
      onPendudukToggle?.(false);
      onBencanaToggle?.(false);
      onEkonomiToggle?.(false);
      onLahanToggle?.(false); // Reset land use toggle
    }
  }, [showLayer, activeYear, onProjectionChange, onRainfallToggle, onPendudukToggle, onBencanaToggle, onEkonomiToggle, onLahanToggle]);

  const handleLayerClick = useCallback(
    (styleUrl: string, label: string) => {
      console.log("LayerButton: handleLayerClick called with:", label, styleUrl);
      setActiveLayer(label);
      onStyleChange(styleUrl);

      setActiveProjection(null);
      onProjectionChange?.(null, activeYear);
      onRainfallToggle?.(false);
      onPendudukToggle?.(false);
      onBencanaToggle?.(false);
      onEkonomiToggle?.(false);
      onLahanToggle?.(false); // Reset land use toggle
    },
    [onStyleChange, onProjectionChange, activeYear, onRainfallToggle, onPendudukToggle, onBencanaToggle, onEkonomiToggle, onLahanToggle]
  );

  const handleProjectionClick = useCallback(() => {
    console.log("LayerButton: handleProjectionClick called");
    setShowProjectionPanel(true);
    setShowEnvironmentalPanel(false);
  }, []);

  const handleEnvironmentalClick = useCallback(() => {
    console.log("LayerButton: handleEnvironmentalClick called");
    setShowEnvironmentalPanel(true);
    setShowProjectionPanel(false);
  }, []);

  const handleBackClick = useCallback(() => {
    console.log("LayerButton: handleBackClick called");
    setShowProjectionPanel(false);
    setShowEnvironmentalPanel(false);
    setActiveProjection(null);
    onProjectionChange?.(null, activeYear);
    onRainfallToggle?.(false);
    onPendudukToggle?.(false);
    onBencanaToggle?.(false);
    onEkonomiToggle?.(false);
    onLahanToggle?.(false); // Reset land use toggle
  }, [onProjectionChange, activeYear, onRainfallToggle, onPendudukToggle, onBencanaToggle, onEkonomiToggle, onLahanToggle]);

  const handleYearClick = useCallback(
    (year: string) => {
      console.log("LayerButton: handleYearClick called with year:", year);
      setActiveYear(year);

      if (activeProjection) {
        console.log("LayerButton: Updating projection with new year:", activeProjection, year);
        onProjectionChange?.(activeProjection, year);

        if (activeProjection === "Rain Fall") {
          console.log("LayerButton: Re-enabling rainfall for new year");
          onRainfallToggle?.(true);
        } else if (activeProjection === "Population Density") {
          console.log("LayerButton: Re-enabling population density for new year");
          onPendudukToggle?.(true);
        } else if (activeProjection === "Economic Contribution") {
          console.log("LayerButton: Re-enabling economic contribution for new year");
          onEkonomiToggle?.(true);
        } else if (activeProjection === "Land Use") {
          console.log("LayerButton: Re-enabling land use for new year");
          onLahanToggle?.(true);
        } else if (activeProjection === "Disaster Risk") {
          console.log("LayerButton: Re-enabling disaster risk for new year");
          onBencanaToggle?.(true);
        }
      }
    },
    [activeProjection, onProjectionChange, onRainfallToggle, onPendudukToggle, onEkonomiToggle, onLahanToggle, onBencanaToggle]
  );

  const handleProjectionItemClick = useCallback(
    (label: string) => {
      console.log("LayerButton: handleProjectionItemClick called", { label, currentProjection: activeProjection });

      const newProjection = label === activeProjection ? null : label;
      console.log("LayerButton: Setting new projection", { newProjection });

      setActiveProjection(newProjection);
      onProjectionChange?.(newProjection, activeYear);

      // Handle different projection types
      if (label === "Rain Fall") {
        const isEnabled = newProjection === "Rain Fall";
        console.log("LayerButton: Rain Fall toggle", { isEnabled });
        onRainfallToggle?.(isEnabled);
        onPendudukToggle?.(false); // Disable other overlays
        onEkonomiToggle?.(false);
        onLahanToggle?.(false);
        onBencanaToggle?.(false);
      } else if (label === "Population Density") {
        const isEnabled = newProjection === "Population Density";
        console.log("LayerButton: Population Density toggle", { isEnabled });
        onPendudukToggle?.(isEnabled);
        onRainfallToggle?.(false); // Disable other overlays
        onEkonomiToggle?.(false);
        onLahanToggle?.(false);
        onBencanaToggle?.(false);
      } else if (label === "Economic Contribution") {
        const isEnabled = newProjection === "Economic Contribution";
        console.log("LayerButton: Economic Contribution toggle", { isEnabled });
        onEkonomiToggle?.(isEnabled);
        onRainfallToggle?.(false); // Disable other overlays
        onPendudukToggle?.(false);
        onLahanToggle?.(false);
        onBencanaToggle?.(false);
      } else if (label === "Land Use") {
        const isEnabled = newProjection === "Land Use";
        console.log("LayerButton: Land Use toggle", { isEnabled });
        onLahanToggle?.(isEnabled);
        onRainfallToggle?.(false); // Disable other overlays
        onPendudukToggle?.(false);
        onEkonomiToggle?.(false);
        onBencanaToggle?.(false);
      } else {
        console.log("LayerButton: Disabling all overlays for other projections");
        onRainfallToggle?.(false);
        onPendudukToggle?.(false);
        onEkonomiToggle?.(false);
        onLahanToggle?.(false);
        onBencanaToggle?.(false);
      }
    },
    [activeProjection, activeYear, onProjectionChange, onRainfallToggle, onPendudukToggle, onEkonomiToggle, onLahanToggle, onBencanaToggle]
  );

  const handleEnvironmentalItemClick = useCallback(
    (label: string) => {
      console.log("LayerButton: handleEnvironmentalItemClick called", { label, currentProjection: activeProjection });

      const newProjection = label === activeProjection ? null : label;
      console.log("LayerButton: Setting new environmental projection", { newProjection });

      setActiveProjection(newProjection);
      onProjectionChange?.(newProjection, activeYear);

      // Handle disaster risk
      if (label === "Disaster Risk") {
        const isEnabled = newProjection === "Disaster Risk";
        console.log("LayerButton: Disaster Risk toggle", { isEnabled });
        onBencanaToggle?.(isEnabled);
        onRainfallToggle?.(false); // Disable other overlays
        onPendudukToggle?.(false);
        onEkonomiToggle?.(false);
        onLahanToggle?.(false);
      } else {
        console.log("LayerButton: Disabling all overlays for other environmental data");
        onRainfallToggle?.(false);
        onPendudukToggle?.(false);
        onEkonomiToggle?.(false);
        onLahanToggle?.(false);
        onBencanaToggle?.(false);
      }
    },
    [activeProjection, activeYear, onProjectionChange, onRainfallToggle, onPendudukToggle, onEkonomiToggle, onLahanToggle, onBencanaToggle]
  );

  return (
    <>
      {showLayer && !showProjectionPanel && !showEnvironmentalPanel && (
        <div className="fixed bottom-6 right-6 bg-white bg-opacity-90 rounded-xl shadow-lg p-4 w-80 max-w-[90%] z-[1000]">
          <div className="space-y-4">
            <div
              className="bg-gray-200 rounded-md p-4 relative cursor-pointer hover:bg-gray-300 transition"
              onClick={handleProjectionClick}
            >
              <h3 className="font-bold text-black text-base leading-snug">
                Projection Data Layer
              </h3>
              <p className="text-black text-sm leading-relaxed mt-1">
                View projections of various factors in the future
              </p>
              <ChevronRight className="absolute top-4 right-4 text-black" size={18} />
            </div>
            <div 
              className="bg-gray-200 rounded-md p-4 relative cursor-pointer hover:bg-gray-300 transition"
              onClick={handleEnvironmentalClick}
            >
              <h3 className="font-bold text-black text-base leading-snug">
                Environmental Data Layer
              </h3>
              <p className="text-black text-sm leading-relaxed mt-1">
                View environmental factors and disaster risks
              </p>
              <ChevronRight className="absolute top-4 right-4 text-black" size={18} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {layers.map((layer, index) => (
                <div
                  key={index}
                  className={`flex flex-col items-center bg-white rounded-md p-2 shadow-sm cursor-pointer transition ${
                    layer.label === activeLayer ? "border-4 border-cyan-400 shadow-md" : ""
                  }`}
                  onClick={() => handleLayerClick(layer.styleUrl, layer.label)}
                >
                  <img
                    alt={layer.label}
                    className="rounded-md w-full object-cover"
                    height={80}
                    src={layer.src}
                    width={120}
                  />
                  <span className="text-xs text-blue-700 mt-1 lowercase">{layer.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showLayer && showProjectionPanel && (
        <div className="fixed bottom-6 right-6 bg-white bg-opacity-90 rounded-xl shadow-lg p-4 w-80 max-w-[90%] z-[1000]">
          <div
            className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 select-none cursor-pointer hover:bg-gray-100"
            onClick={handleBackClick}
          >
            <ChevronLeft className="text-black text-sm" size={18} />
            <span className="text-black text-sm font-normal">Back</span>
          </div>
          <div className="flex border-b border-gray-300">
            {["2025", "2030", "2035"].map((year) => (
              <button
                key={year}
                className={`flex-1 py-2 text-xs font-semibold ${
                  activeYear === year
                    ? "text-[#0F7DFF] bg-gradient-to-r from-[#A3C9FF] to-[#5AB1FF] rounded-t-md"
                    : "text-black bg-white hover:bg-gray-100"
                }`}
                type="button"
                onClick={() => handleYearClick(year)}
              >
                {year}
              </button>
            ))}
          </div>
          <div
            className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
            style={{ maxHeight: "360px" }}
          >
            {projectionData.map((item, index) => (
              <div
                key={index}
                className={`flex gap-3 p-3 border border-t-0 border-gray-200 rounded-b-md cursor-pointer transition ${
                  item.label === activeProjection
                    ? "bg-gradient-to-r from-[#5AB1FF] to-[#3B8AC4] text-white"
                    : "bg-white text-black hover:bg-gray-100"
                }`}
                onClick={() => handleProjectionItemClick(item.label)}
              >
                <img
                  alt={item.label}
                  className="w-20 h-20 object-cover rounded"
                  height={80}
                  src={item.src}
                  width={80}
                />
                <div className="flex flex-col justify-center">
                  <h3
                    className={`font-extrabold text-lg leading-tight ${
                      item.label === activeProjection ? "text-white" : "text-black"
                    }`}
                  >
                    {item.label}
                  </h3>
                  <p
                    className={`text-xs leading-tight max-w-[180px] ${
                      item.label === activeProjection ? "text-white" : "text-black"
                    }`}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showLayer && showEnvironmentalPanel && (
        <div className="fixed bottom-6 right-6 bg-white bg-opacity-90 rounded-xl shadow-lg p-4 w-80 max-w-[90%] z-[1000]">
          <div
            className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 select-none cursor-pointer hover:bg-gray-100"
            onClick={handleBackClick}
          >
            <ChevronLeft className="text-black text-sm" size={18} />
            <span className="text-black text-sm font-normal">Back</span>
          </div>
          <div
            className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
            style={{ maxHeight: "360px" }}
          >
            {environmentalData.map((item, index) => (
              <div
                key={index}
                className={`flex gap-3 p-3 border border-gray-200 rounded-md cursor-pointer transition ${
                  item.label === activeProjection
                    ? "bg-gradient-to-r from-[#5AB1FF] to-[#3B8AC4] text-white"
                    : "bg-white text-black hover:bg-gray-100"
                }`}
                onClick={() => handleEnvironmentalItemClick(item.label)}
              >
                <img
                  alt={item.label}
                  className="w-20 h-20 object-cover rounded"
                  height={80}
                  src={item.src}
                  width={80}
                />
                <div className="flex flex-col justify-center">
                  <h3
                    className={`font-extrabold text-lg leading-tight ${
                      item.label === activeProjection ? "text-white" : "text-black"
                    }`}
                  >
                    {item.label}
                  </h3>
                  <p
                    className={`text-xs leading-tight max-w-[180px] ${
                      item.label === activeProjection ? "text-white" : "text-black"
                    }`}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={toggleLayer}
        className="fixed bottom-6 right-6 bg-white bg-opacity-90 rounded-xl shadow-lg px-6 py-3 flex items-center space-x-2 text-black text-base font-normal z-[1000]"
        type="button"
      >
        <Layers className="text-lg" size={20} />
        <span>Spatial Data Layer</span>
      </button>
    </>
  );
};

export default LayerButton;