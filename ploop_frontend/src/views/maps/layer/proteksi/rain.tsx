import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import L from "leaflet";
import type { FeatureCollection } from "geojson";

interface RainfallOverlayProps {
  map: L.Map | null;
  enabled: boolean;
  dataType?: 'rainfall' | 'topography';
}

// Cache untuk menyimpan data yang sudah di-load
const dataCache = new Map<string, FeatureCollection>();

function RainfallOverlay({ 
  map, 
  enabled,
  dataType = 'rainfall'
}: RainfallOverlayProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const loadingControllerRef = useRef<AbortController | null>(null);

  // Memoized style function untuk performa yang lebih baik
  const getFeatureStyle = useCallback((feature: any) => {
    const dnValue = feature?.properties?.DN || 0;
    
    let fillColor = 'rgba(255, 255, 255, 0.1)';
    let fillOpacity = 0.6; // Kurangin opacity untuk performa
    
    if (dnValue >= 3000) {
      fillColor = 'rgba(0, 0, 255, 0.7)';
    } else if (dnValue >= 1500) {
      fillColor = 'rgba(100, 149, 237, 0.5)';
    } else if (dnValue > 0) {
      fillColor = 'rgba(100, 149, 237, 0.2)';
    }

    return {
      fillColor,
      fillOpacity,
      color: '#ffffff',
      weight: 0.3, // Kurangin weight untuk performa
      opacity: 0.2
    };
  }, []);

  // Memoized popup content generator
  const createPopupContent = useCallback((feature: any, latlng: L.LatLng) => {
    const dnValue = feature.properties?.DN || 'N/A';
    const fid = feature.properties?.fid || 'N/A';
    const label = dataType === 'rainfall' ? 'Rainfall' : 'Elevation';
    
    return `
      <div style="padding: 8px; min-width: 100px; font-size: 12px;">
        <div style="font-weight: 600; color: #2563eb; margin-bottom: 2px;">${label}</div>
        <div style="color: #374151;">
          <div><strong>DN:</strong> ${dnValue}</div>
          <div><strong>FID:</strong> ${fid}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
            ${latlng.lat.toFixed(3)}, ${latlng.lng.toFixed(3)}
          </div>
        </div>
      </div>
    `;
  }, [dataType]);

  // Optimized feature event handler
  const setupFeatureEvents = useCallback((feature: any, layer: L.Layer) => {
    let isHovered = false;
    
    layer.on('click', (e: any) => {
      const popupContent = createPopupContent(feature, e.latlng);
      layer.bindPopup(popupContent, {
        closeButton: true,
        autoClose: true,
        closeOnEscapeKey: true,
        maxWidth: 200
      }).openPopup();
    });

    // Throttled hover events untuk performa
    layer.on('mouseover', () => {
      if (isHovered) return;
      isHovered = true;
      
      requestAnimationFrame(() => {
        const pathLayer = layer as L.Path;
        pathLayer.setStyle({
          weight: 1.5,
          opacity: 0.6,
          fillOpacity: 0.8
        });
        if (map?.getContainer()) {
          (map.getContainer() as HTMLElement).style.cursor = 'pointer';
        }
      });
    });

    layer.on('mouseout', () => {
      if (!isHovered) return;
      isHovered = false;
      
      requestAnimationFrame(() => {
        if (geoJsonLayerRef.current) {
          geoJsonLayerRef.current.resetStyle(layer as L.Path);
        }
        if (map?.getContainer()) {
          (map.getContainer() as HTMLElement).style.cursor = '';
        }
      });
    });
  }, [map, createPopupContent]);

  // Load data dengan caching dan abort controller
  useEffect(() => {
    if (!enabled) return;

    const loadRainfallData = async () => {
      const cacheKey = `rainfall_${dataType}`;
      
      // Cek cache dulu
      if (dataCache.has(cacheKey)) {
        console.log("RainfallOverlay: Using cached data");
        setGeoData(dataCache.get(cacheKey)!);
        return;
      }

      // Cancel previous request
      if (loadingControllerRef.current) {
        loadingControllerRef.current.abort();
      }

      loadingControllerRef.current = new AbortController();
      setLoading(true);
      setError(null);

      try {
        // Remove custom headers to avoid CORS preflight issues
        const response = await fetch(
          'https://cdn.jsdelivr.net/gh/riyqnn/geojson-data@main/indonesia.geojson',
          { 
            signal: loadingControllerRef.current.signal
            // Removed custom Cache-Control header that was causing CORS issues
          }
        );
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data: FeatureCollection = await response.json();
        
        // Simpan ke cache
        dataCache.set(cacheKey, data);
        setGeoData(data);
        
        console.log("RainfallOverlay: Data loaded and cached", { features: data.features.length });
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        
        const errorMessage = `Failed to load: ${err.message}`;
        console.error("RainfallOverlay: Error", err);
        setError(errorMessage);
      } finally {
        setLoading(false);
        loadingControllerRef.current = null;
      }
    };

    loadRainfallData();

    return () => {
      if (loadingControllerRef.current) {
        loadingControllerRef.current.abort();
      }
    };
  }, [enabled, dataType]);

  // Setup layer dengan debouncing
  useEffect(() => {
    if (!map || !enabled || !geoData) {
      // Cleanup existing layer
      if (geoJsonLayerRef.current) {
        map?.removeLayer(geoJsonLayerRef.current);
        geoJsonLayerRef.current = null;
      }
      return;
    }

    // Use setTimeout untuk debounce layer creation
    const timeoutId = setTimeout(() => {
      try {
        // Remove existing layer
        if (geoJsonLayerRef.current) {
          map.removeLayer(geoJsonLayerRef.current);
        }

        // Create new layer dengan optimized options
        const newLayer = L.geoJSON(geoData, {
          style: (feature) => ({
            ...getFeatureStyle(feature),
            smoothFactor: 0.5
          }),
          onEachFeature: setupFeatureEvents,
          coordsToLatLng: (coords) => new L.LatLng(coords[1], coords[0])
        });

        newLayer.addTo(map);
        geoJsonLayerRef.current = newLayer;
        
        console.log("RainfallOverlay: Layer optimized and added");
      } catch (error) {
        console.error("RainfallOverlay: Setup error", error);
        setError(`Setup error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }, 100); // Debounce 100ms

    return () => {
      clearTimeout(timeoutId);
      if (geoJsonLayerRef.current && map) {
        try {
          map.removeLayer(geoJsonLayerRef.current);
          geoJsonLayerRef.current = null;
        } catch (error) {
          console.error("RainfallOverlay: Cleanup error", error);
        }
      }
    };
  }, [map, geoData, enabled, getFeatureStyle, setupFeatureEvents]);

  // Memoized loading component
  const loadingComponent = useMemo(() => {
    if (!loading || !enabled) return null;
    
    return (
      <div className="absolute top-20 right-4 z-[1000] bg-blue-500 text-white px-2 py-1 rounded shadow-lg">
        <div className="flex items-center space-x-2 text-sm">
          <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }, [loading, enabled]);

  // Memoized error component
  const errorComponent = useMemo(() => {
    if (!error || !enabled) return null;
    
    return (
      <div className="absolute top-20 right-4 z-[1000] bg-red-500 text-white px-2 py-1 rounded shadow-lg max-w-xs">
        <div className="text-sm">
          <strong>Error:</strong> {error}
          <button 
            onClick={() => {
              setError(null);
              setGeoData(null);
              dataCache.clear(); // Clear cache on retry
            }}
            className="block mt-1 text-xs underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }, [error, enabled]);

  // Memoized legend component
  const legendComponent = useMemo(() => {
    if (!enabled || !geoData || loading || error) return null;
    
    return (
      <div className="absolute bottom-20 left-4 z-[1000] bg-white bg-opacity-90 p-2 rounded shadow border">
        <h3 className="text-xs font-semibold text-gray-700 mb-1 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
          Rainfall
        </h3>
        <div className="flex flex-col space-y-1 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-2 bg-blue-100 border border-gray-300 rounded-sm"></div>
            <span>Low</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-2 bg-blue-400 rounded-sm"></div>
            <span>Med</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-2 bg-blue-700 rounded-sm"></div>
            <span>High</span>
          </div>
        </div>
      </div>
    );
  }, [enabled, geoData, loading, error]);

  return (
    <>
      {loadingComponent}
      {errorComponent}
      {legendComponent}
    </>
  );
}

export default RainfallOverlay;