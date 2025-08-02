import { useRef, useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import LayerButton from "./layer/button";
import RainfallOverlay from "./layer/proteksi/rain";
import Penduduk from "./layer/proteksi/penduduk";
import Bencana from "./layer/proteksi/bencana";
import Ekonomi from "./layer/proteksi/ekonomi";
import Lahan from "./layer/proteksi/lahan"; // Import Lahan component
import type { Property } from "@/types/Property";
import rumah from "/tipe_rumah.svg";
import apartemen from "/tipe_apartemen.svg";
import ruko from "/tipe_ruko.svg";

// Fix for default markers in Leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export interface MarkerPosition {
  lat: number;
  lng: number;
}

interface MapsProps {
  isInteractive: boolean;
  onZoomComplete: () => void;
  markerPosition?: MarkerPosition;
  onMarkerClick?: (position: MarkerPosition) => void;
  enableClickToPlace?: boolean;
  mapStyle?: string;
  shouldStartAnimation?: boolean;
  disableAnimation?: boolean;
  showLayerControls?: boolean;
  rainfallEnabled?: boolean;
  onRainfallToggle?: (enabled: boolean) => void;
  onProjectionChange?: (projection: string | null, year: string) => void;
  onStyleChange?: (styleUrl: string) => void;
  onMapReady?: (mapInstance: L.Map) => void;
  selectedProperty?: Property | null;
  properties: Property[];
}

function Maps({
  isInteractive,
  onZoomComplete,
  markerPosition,
  onMarkerClick,
  enableClickToPlace = false,
  mapStyle = "street",
  shouldStartAnimation = true,
  disableAnimation = false,
  showLayerControls = true,
  rainfallEnabled = false,
  onRainfallToggle,
  onProjectionChange,
  onStyleChange,
  onMapReady,
  selectedProperty,
  properties = []
}: MapsProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const propertyMarkerRef = useRef<L.Marker | null>(null);
  const allPropertyMarkersRef = useRef<L.Marker[]>([]);
  const animationTriggered = useRef(false);
  const zoomControlRef = useRef<L.Control.Zoom | null>(null);

  // Layer control states
  const [currentMapStyle, setCurrentMapStyle] = useState<string>(mapStyle);
  const [currentRainfallEnabled, setCurrentRainfallEnabled] = useState(rainfallEnabled);
  const [pendudukEnabled, setPendudukEnabled] = useState(false);
  const [bencanaEnabled, setBencanaEnabled] = useState(false);
  const [ekonomiEnabled, setEkonomiEnabled] = useState(false);
  const [lahanEnabled, setLahanEnabled] = useState(false); // Add state for land use
  const [currentProjection, setCurrentProjection] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState<string>("2025");
  const [mapLoaded, setMapLoaded] = useState(false);

  // Available tile layers using standard Leaflet providers
  const getTileLayer = (style: string) => {
    const layers = {
      street: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      },
      light: {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      },
      dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      },
      satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      },
      terrain: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
      },
      osm: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    };

    const styleKey = style.includes('light') ? 'light' : 
                     style.includes('dark') ? 'dark' :
                     style.includes('satellite') ? 'satellite' :
                     style.includes('terrain') ? 'terrain' :
                     style.includes('street') ? 'street' : 'osm';

    const layerConfig = layers[styleKey];

    return L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: styleKey === 'satellite' ? 18 : 19,
      tileSize: 256,
      zoomOffset: 0
    });
  };

  const getPropertyIcon = (propertyType: string) => {
    const iconMap: { [key: string]: string } = {
      'apartment': apartemen,
      'house': rumah,
      'boarding house': rumah,
      'shophouse': ruko,
      'warehouse': rumah,
    };
    return iconMap[propertyType?.toLowerCase()] || rumah;
  };

  // Create custom Leaflet icon
  const createCustomIcon = (propertyType: string, isSelected: boolean = false) => {
    const iconUrl = getPropertyIcon(propertyType);
    
    return new L.Icon({
      iconUrl: iconUrl,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: isSelected ? [35, 50] : [25, 35],
      iconAnchor: isSelected ? [17, 50] : [12, 35],
      popupAnchor: [1, -34],
      shadowSize: isSelected ? [50, 50] : [35, 35],
      className: isSelected ? 'selected-property-marker' : 'property-marker'
    });
  };

  // Clear all property markers
  const clearAllPropertyMarkers = () => {
    if (!mapRef.current) return;
    
    allPropertyMarkersRef.current.forEach(marker => {
      mapRef.current!.removeLayer(marker);
    });
    allPropertyMarkersRef.current = [];
  };

  // Add markers for all properties
  const addAllPropertyMarkers = (propertiesToShow: Property[]) => {
    if (!mapRef.current || !propertiesToShow.length) return;

    // Clear existing markers first
    clearAllPropertyMarkers();

    propertiesToShow.forEach(property => {
      if (!property.latitude || !property.longitude) return;

      const icon = createCustomIcon(property.property_type, false);
      
      const marker = L.marker([property.latitude, property.longitude], {
        icon: icon
      }).addTo(mapRef.current!);

      marker.bindPopup(`
        <div class="property-popup">
          <h3 style="margin: 0 0 8px 0; font-weight: bold;">${property.name}</h3>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${property.address || 'Address not available'}</p>
          <p style="margin: 0; font-size: 11px; color: #888; text-transform: capitalize;">${property.property_type || 'Property'}</p>
        </div>
      `);

      // Add click handler if onMarkerClick is provided
      if (onMarkerClick) {
        marker.on('click', () => {
          onMarkerClick({ lat: property.latitude, lng: property.longitude });
        });
      }

      allPropertyMarkersRef.current.push(marker);
    });
  };

  // Handle selected property marker
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove previous property marker if exists
    if (propertyMarkerRef.current) {
      mapRef.current.removeLayer(propertyMarkerRef.current);
      propertyMarkerRef.current = null;
    }

    if (!selectedProperty) return;

    console.log("Flying to selected property:", selectedProperty.name);
    
    // Create custom icon for selected property with its type
    const selectedIcon = createCustomIcon(selectedProperty.property_type, true);

    // Add marker for selected property
    propertyMarkerRef.current = L.marker([selectedProperty.latitude, selectedProperty.longitude], {
      icon: selectedIcon
    }).addTo(mapRef.current);

    // Add popup with property info
    propertyMarkerRef.current.bindPopup(`
      <div class="property-popup">
        <h3 style="margin: 0 0 8px 0; font-weight: bold;">${selectedProperty.name}</h3>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${selectedProperty.address || 'Address not available'}</p>
        <p style="margin: 0; font-size: 11px; color: #888; text-transform: capitalize;">${selectedProperty.property_type || 'Property'}</p>
      </div>
    `);

    // Fly to the property location
    mapRef.current.flyTo([selectedProperty.latitude, selectedProperty.longitude], 16, {
      duration: 2
    });
  }, [selectedProperty]);

  // Handle properties list changes
  useEffect(() => {
    if (mapRef.current && properties.length > 0) {
      addAllPropertyMarkers(properties);
    }
  }, [properties]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    console.log("Initializing Leaflet map with style:", currentMapStyle);
    
    // Create map
    mapRef.current = L.map(mapContainerRef.current, {
      center: [5.7, 95.3],
      zoom: 8,
      zoomControl: false,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false
    });

    // Add tile layer
    const tileLayer = getTileLayer(currentMapStyle);
    tileLayer.addTo(mapRef.current);

    // Map loaded event
    mapRef.current.whenReady(() => {
      console.log("Leaflet map loaded successfully");
      setMapLoaded(true);
      
      // Call onMapReady callback with map instance
      if (onMapReady && mapRef.current) {
        console.log("Maps: Calling onMapReady callback");
        onMapReady(mapRef.current);
      }
      
      // Add initial property markers
      if (properties.length > 0) {
        addAllPropertyMarkers(properties);
      }
      
      // Auto-start animation when map loads
      if (shouldStartAnimation && !disableAnimation && !animationTriggered.current) {
        console.log("Starting animation from load event");
        startZoomAnimation();
      } else if (disableAnimation) {
        console.log("Animation disabled, calling onZoomComplete immediately");
        setTimeout(onZoomComplete, 500);
      }
    });

    return () => {
      if (mapRef.current) {
        if (markerRef.current) mapRef.current.removeLayer(markerRef.current);
        if (propertyMarkerRef.current) mapRef.current.removeLayer(propertyMarkerRef.current);
        clearAllPropertyMarkers();
        mapRef.current.remove();
        mapRef.current = null;
        animationTriggered.current = false;
      }
    };
  }, []);

  const startZoomAnimation = () => {
    if (!mapRef.current || animationTriggered.current) return;
    
    console.log("Starting zoom animation");
    animationTriggered.current = true;
    
    setTimeout(() => {
      if (!mapRef.current) return;
      
      console.log("Executing flyTo animation");
      // Animate to Jakarta coordinates
      mapRef.current.flyTo([-6.2088, 106.8456], 15, {
        duration: 5
      });

      // Listen for animation end
      const handleZoomEnd = () => {
        if (mapRef.current) {
          const currentZoom = mapRef.current.getZoom();
          console.log("Zoom ended, current zoom:", currentZoom);
          if (currentZoom >= 14.5) {
            console.log("Animation complete, calling onZoomComplete");
            setTimeout(onZoomComplete, 500);
            mapRef.current.off("zoomend", handleZoomEnd);
          }
        }
      };

      mapRef.current.on("zoomend", handleZoomEnd);
    }, 500);
  };

  // Trigger animation when shouldStartAnimation changes
  useEffect(() => {
    console.log("shouldStartAnimation changed:", shouldStartAnimation);
    if (shouldStartAnimation && mapRef.current && !animationTriggered.current) {
      console.log("Triggering animation from useEffect");
      startZoomAnimation();
    }
  }, [shouldStartAnimation]);

  // Handle style changes
  useEffect(() => {
    if (mapStyle !== currentMapStyle) {
      console.log("External mapStyle changed from", currentMapStyle, "to", mapStyle);
      setCurrentMapStyle(mapStyle);
    }
  }, [mapStyle]);

  useEffect(() => {
    if (!mapRef.current || !currentMapStyle) return;

    console.log("Applying style change to:", currentMapStyle);
    
    // Remove current tile layers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current!.removeLayer(layer);
      }
    });

    // Add new tile layer
    const newTileLayer = getTileLayer(currentMapStyle);
    newTileLayer.addTo(mapRef.current);
  }, [currentMapStyle]);

  // Handle click to place marker
  useEffect(() => {
    if (!mapRef.current || !enableClickToPlace) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (onMarkerClick) {
        onMarkerClick({ lat, lng });
      }
    };

    mapRef.current.on("click", handleMapClick);

    return () => {
      if (mapRef.current) {
        mapRef.current.off("click", handleMapClick);
      }
    };
  }, [enableClickToPlace, onMarkerClick]);

  // Handle marker position
  useEffect(() => {
    if (!mapRef.current) return;

    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    if (markerPosition) {
      markerRef.current = L.marker([markerPosition.lat, markerPosition.lng])
        .addTo(mapRef.current);
    }
  }, [markerPosition]);

  // Handle interactive state
  useEffect(() => {
    if (!mapRef.current) return;

    if (isInteractive) {
      mapRef.current.dragging.enable();
      mapRef.current.touchZoom.enable();
      mapRef.current.scrollWheelZoom.enable();
      mapRef.current.doubleClickZoom.enable();
      mapRef.current.boxZoom.enable();
      mapRef.current.keyboard.enable();
      
      // Add zoom control if not already added
      if (!zoomControlRef.current) {
        zoomControlRef.current = L.control.zoom({ position: 'topright' });
        zoomControlRef.current.addTo(mapRef.current);
      }

      if (enableClickToPlace && mapContainerRef.current) {
        mapContainerRef.current.style.cursor = "crosshair";
      }
    } else {
      mapRef.current.dragging.disable();
      mapRef.current.touchZoom.disable();
      mapRef.current.scrollWheelZoom.disable();
      mapRef.current.doubleClickZoom.disable();
      mapRef.current.boxZoom.disable();
      mapRef.current.keyboard.disable();

      // Remove zoom control
      if (zoomControlRef.current) {
        mapRef.current.removeControl(zoomControlRef.current);
        zoomControlRef.current = null;
      }

      if (mapContainerRef.current) {
        mapContainerRef.current.style.cursor = "default";
      }
    }
  }, [isInteractive, enableClickToPlace]);

  // Handle rainfall state
  useEffect(() => {
    if (rainfallEnabled !== currentRainfallEnabled) {
      setCurrentRainfallEnabled(rainfallEnabled);
    }
  }, [rainfallEnabled]);

  // Layer control handlers
  const handleStyleChange = (styleUrl: string) => {
    console.log("Maps: Style change requested:", styleUrl);
    if (styleUrl !== currentMapStyle) {
      setCurrentMapStyle(styleUrl);
      setCurrentRainfallEnabled(false);
      setPendudukEnabled(false);
      setBencanaEnabled(false);
      setEkonomiEnabled(false);
      setLahanEnabled(false); // Reset land use when style changes
      setCurrentProjection(null);
      onRainfallToggle?.(false);
      onStyleChange?.(styleUrl);
    }
  };

  const handleProjectionChange = (projection: string | null, year: string) => {
    console.log(`Maps: Projection change requested: ${projection}, Year: ${year}`);
    setCurrentProjection(projection);
    setCurrentYear(year);
    onProjectionChange?.(projection, year);
  };

  const handleRainfallToggle = (enabled: boolean) => {
    console.log(`Maps: Rainfall toggle requested: ${enabled}`);
    setCurrentRainfallEnabled(enabled);
    onRainfallToggle?.(enabled);
    
    if (enabled && currentProjection !== "Rain Fall") {
      console.log("Maps: Setting projection to Rain Fall due to rainfall toggle");
      setCurrentProjection("Rain Fall");
      onProjectionChange?.("Rain Fall", currentYear);
    } else if (!enabled && currentProjection === "Rain Fall") {
      console.log("Maps: Clearing projection due to rainfall toggle off");
      setCurrentProjection(null);
      onProjectionChange?.(null, currentYear);
    }
  };

  const handlePendudukToggle = (enabled: boolean) => {
    console.log(`Maps: Population Density toggle requested: ${enabled}`);
    setPendudukEnabled(enabled);
    
    if (enabled && currentProjection !== "Population Density") {
      console.log("Maps: Setting projection to Population Density due to penduduk toggle");
      setCurrentProjection("Population Density");
      onProjectionChange?.("Population Density", currentYear);
    } else if (!enabled && currentProjection === "Population Density") {
      console.log("Maps: Clearing projection due to penduduk toggle off");
      setCurrentProjection(null);
      onProjectionChange?.(null, currentYear);
    }
  };

  const handleBencanaToggle = (enabled: boolean) => {
    console.log(`Maps: Disaster Risk toggle requested: ${enabled}`);
    setBencanaEnabled(enabled);
    
    if (enabled && currentProjection !== "Disaster Risk") {
      console.log("Maps: Setting projection to Disaster Risk due to bencana toggle");
      setCurrentProjection("Disaster Risk");
      onProjectionChange?.("Disaster Risk", currentYear);
    } else if (!enabled && currentProjection === "Disaster Risk") {
      console.log("Maps: Clearing projection due to bencana toggle off");
      setCurrentProjection(null);
      onProjectionChange?.(null, currentYear);
    }
  };

  const handleEkonomiToggle = (enabled: boolean) => {
    console.log(`Maps: Economic Contribution toggle requested: ${enabled}`);
    setEkonomiEnabled(enabled);
    
    if (enabled && currentProjection !== "Economic Contribution") {
      console.log("Maps: Setting projection to Economic Contribution due to ekonomi toggle");
      setCurrentProjection("Economic Contribution");
      onProjectionChange?.("Economic Contribution", currentYear);
    } else if (!enabled && currentProjection === "Economic Contribution") {
      console.log("Maps: Clearing projection due to ekonomi toggle off");
      setCurrentProjection(null);
      onProjectionChange?.(null, currentYear);
    }
  };

  const handleLahanToggle = (enabled: boolean) => {
    console.log(`Maps: Land Use toggle requested: ${enabled}`);
    setLahanEnabled(enabled);
    
    if (enabled && currentProjection !== "Land Use") {
      console.log("Maps: Setting projection to Land Use due to lahan toggle");
      setCurrentProjection("Land Use");
      onProjectionChange?.("Land Use", currentYear);
    } else if (!enabled && currentProjection === "Land Use") {
      console.log("Maps: Clearing projection due to lahan toggle off");
      setCurrentProjection(null);
      onProjectionChange?.(null, currentYear);
    }
  };

  return (
    <div className="w-screen h-full map-container relative">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Show layer controls */}
      {showLayerControls && mapLoaded && (
        <>
          <RainfallOverlay 
            map={mapRef.current} 
            enabled={currentRainfallEnabled}
            dataType="rainfall"
          />
          <Penduduk 
            map={mapRef.current} 
            enabled={pendudukEnabled}
            dataType="penduduk"
          />
          <Bencana 
            map={mapRef.current} 
            enabled={bencanaEnabled}
            dataType="bencana"
          />
          <Ekonomi 
            map={mapRef.current} 
            enabled={ekonomiEnabled}
            dataType="ekonomi"
          />
          <Lahan 
            map={mapRef.current} 
            enabled={lahanEnabled}
            dataType="lahan"
          />
          <LayerButton 
            onStyleChange={handleStyleChange}
            onProjectionChange={handleProjectionChange}
            onRainfallToggle={handleRainfallToggle}
            onPendudukToggle={handlePendudukToggle}
            onBencanaToggle={handleBencanaToggle}
            onEkonomiToggle={handleEkonomiToggle}
            onLahanToggle={handleLahanToggle} // Pass land use toggle handler
          />
        </>
      )}
    </div>
  );
}

export default Maps;