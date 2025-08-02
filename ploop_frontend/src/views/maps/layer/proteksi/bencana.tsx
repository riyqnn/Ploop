import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import L from "leaflet";
import type { FeatureCollection } from "geojson";

interface BencanaOverlayProps {
  map: L.Map | null;
  enabled: boolean;
  dataType?: 'bencana' | 'topography';
}

// Cache untuk menyimpan data yang sudah di-load
const dataCache = new Map<string, FeatureCollection>();

// Disaster types dan warna yang sesuai
const DISASTER_TYPES = {
  'bencana_Gempa_Bumi': { color: 'rgba(139, 69, 19, 0.8)', name: 'Gempa Bumi' },
  'bencana_Tsunami': { color: 'rgba(30, 144, 255, 0.8)', name: 'Tsunami' },
  'bencana_Gempa_Bumi_dan_Tsunami': { color: 'rgba(75, 0, 130, 0.8)', name: 'Gempa & Tsunami' },
  'bencana_Letusan_Gunung_Api': { color: 'rgba(255, 69, 0, 0.8)', name: 'Letusan Gunung Api' },
  'bencana_Tanah_Longsor': { color: 'rgba(210, 180, 140, 0.8)', name: 'Tanah Longsor' },
  'bencana_Banjir': { color: 'rgba(65, 105, 225, 0.8)', name: 'Banjir' },
  'bencana_Kekeringan': { color: 'rgba(255, 165, 0, 0.8)', name: 'Kekeringan' },
  'bencana_Kebakaran_Hutan_dan_Lahan': { color: 'rgba(220, 20, 60, 0.8)', name: 'Kebakaran Hutan' },
  'bencana_Cuaca_Ekstrem': { color: 'rgba(128, 0, 128, 0.8)', name: 'Cuaca Ekstrem' },
  'bencana_Gelombang_Pasang_Abrasi': { color: 'rgba(0, 206, 209, 0.8)', name: 'Gelombang Pasang' }
};

function Bencana({ 
  map, 
  enabled,
  dataType = 'bencana'
}: BencanaOverlayProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const loadingControllerRef = useRef<AbortController | null>(null);

  // Function untuk menghitung total bencana dan mendapatkan bencana dominan
  const getDisasterInfo = useCallback((properties: any) => {
    let totalDisasters = 0;
    let dominantDisaster = null;
    let maxValue = 0;

    Object.keys(DISASTER_TYPES).forEach(disasterType => {
      const value = properties[disasterType];
      if (value && typeof value === 'number' && value > 0) {
        totalDisasters += value;
        if (value > maxValue) {
          maxValue = value;
          dominantDisaster = disasterType;
        }
      }
    });

    return { totalDisasters, dominantDisaster, maxValue };
  }, []);

  // Memoized style function untuk performa yang lebih baik
  const getFeatureStyle = useCallback((feature: any) => {
    const properties = feature?.properties || {};
    const { totalDisasters, dominantDisaster } = getDisasterInfo(properties);
    
    let fillColor = 'rgba(255, 255, 255, 0.1)';
    let fillOpacity = 0.7;
    
    if (totalDisasters > 0 && dominantDisaster) {
      fillColor = DISASTER_TYPES[dominantDisaster as keyof typeof DISASTER_TYPES].color;
      
      // Opacity berdasarkan intensitas total bencana
      if (totalDisasters >= 20) {
        fillOpacity = 0.9;
      } else if (totalDisasters >= 15) {
        fillOpacity = 0.8;
      } else if (totalDisasters >= 10) {
        fillOpacity = 0.7;
      } else if (totalDisasters >= 5) {
        fillOpacity = 0.6;
      } else {
        fillOpacity = 0.5;
      }
    }

    return {
      fillColor,
      fillOpacity,
      color: '#ffffff',
      weight: 0.5,
      opacity: 0.8
    };
  }, [getDisasterInfo]);

  // Memoized popup content generator
  const createPopupContent = useCallback((feature: any, latlng: L.LatLng) => {
    const properties = feature.properties || {};
    const name = properties.name || 'N/A';
    const kota = properties.kota || 'N/A';
    const { totalDisasters } = getDisasterInfo(properties);
    
    // Buat daftar bencana yang ada
    const disasters = Object.keys(DISASTER_TYPES)
      .map(disasterType => {
        const value = properties[disasterType];
        if (value && typeof value === 'number' && value > 0) {
          return {
            name: DISASTER_TYPES[disasterType as keyof typeof DISASTER_TYPES].name,
            value: value,
            color: DISASTER_TYPES[disasterType as keyof typeof DISASTER_TYPES].color
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => (b?.value || 0) - (a?.value || 0));
    
    const disastersList = disasters.length > 0 
      ? disasters.map(disaster => 
          `<div style="margin-bottom: 2px; display: flex; align-items: center;">
            <div style="width: 12px; height: 12px; background-color: ${disaster?.color}; border-radius: 2px; margin-right: 6px;"></div>
            <strong>${disaster?.name}:</strong> ${disaster?.value}
          </div>`
        ).join('')
      : '<div style="color: #6b7280; font-style: italic;">Tidak ada data bencana</div>';
    
    return `
      <div style="padding: 10px; min-width: 220px; font-size: 12px;">
        <div style="font-weight: 600; color: #dc2626; margin-bottom: 6px; font-size: 14px;">${name}</div>
        <div style="color: #374151; margin-bottom: 8px; font-style: italic;">${kota}</div>
        <div style="color: #374151;">
          <div style="margin-bottom: 6px; padding: 4px; background-color: #f3f4f6; border-radius: 4px;">
            <strong>Total Kejadian Bencana: ${totalDisasters}</strong>
          </div>
          <div style="margin-bottom: 4px; font-weight: 500;">Rincian Bencana:</div>
          ${disastersList}
          <div style="font-size: 11px; color: #6b7280; margin-top: 6px; border-top: 1px solid #e5e7eb; padding-top: 4px;">
            Koordinat: ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}
          </div>
        </div>
      </div>
    `;
  }, [getDisasterInfo]);

  // Optimized feature event handler
  const setupFeatureEvents = useCallback((feature: any, layer: L.Layer) => {
    let isHovered = false;
    
    layer.on('click', (e: any) => {
      const popupContent = createPopupContent(feature, e.latlng);
      layer.bindPopup(popupContent, {
        closeButton: true,
        autoClose: true,
        closeOnEscapeKey: true,
        maxWidth: 280
      }).openPopup();
    });

    // Throttled hover events untuk performa
    layer.on('mouseover', () => {
      if (isHovered) return;
      isHovered = true;
      
      requestAnimationFrame(() => {
        const pathLayer = layer as L.Path;
        pathLayer.setStyle({
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
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

    const loadBencanaData = async () => {
      const cacheKey = `bencana_${dataType}`;
      
      // Cek cache dulu
      if (dataCache.has(cacheKey)) {
        console.log("BencanaOverlay: Using cached data");
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
        // Replace with your actual data source URL
        const response = await fetch(
          'https://cdn.jsdelivr.net/gh/riyqnn/geojson-data@main/bencana.geojson',
          { 
            signal: loadingControllerRef.current.signal
          }
        );
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data: FeatureCollection = await response.json();
        
        // Validasi struktur data
        if (!data || !data.features || !Array.isArray(data.features)) {
          throw new Error('Invalid GeoJSON structure');
        }
        
        // Simpan ke cache
        dataCache.set(cacheKey, data);
        setGeoData(data);
        
        console.log("BencanaOverlay: Data loaded and cached", { features: data.features.length });
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        
        const errorMessage = `Failed to load disaster data: ${err.message}`;
        console.error("BencanaOverlay: Error", err);
        setError(errorMessage);
      } finally {
        setLoading(false);
        loadingControllerRef.current = null;
      }
    };

    loadBencanaData();

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
        
        console.log("BencanaOverlay: Layer optimized and added");
      } catch (error) {
        console.error("BencanaOverlay: Setup error", error);
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
          console.error("BencanaOverlay: Cleanup error", error);
        }
      }
    };
  }, [map, geoData, enabled, getFeatureStyle, setupFeatureEvents]);

  // Memoized loading component
  const loadingComponent = useMemo(() => {
    if (!loading || !enabled) return null;
    
    return (
      <div className="absolute top-20 right-4 z-[1000] bg-orange-500 text-white px-3 py-2 rounded shadow-lg">
        <div className="flex items-center space-x-2 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          <span>Loading Disaster Data...</span>
        </div>
      </div>
    );
  }, [loading, enabled]);

  // Memoized error component
  const errorComponent = useMemo(() => {
    if (!error || !enabled) return null;
    
    return (
      <div className="absolute top-20 right-4 z-[1000] bg-red-500 text-white px-3 py-2 rounded shadow-lg max-w-xs">
        <div className="text-sm">
          <strong>Error:</strong> {error}
          <button 
            onClick={() => {
              setError(null);
              setGeoData(null);
              dataCache.clear(); // Clear cache on retry
            }}
            className="block mt-2 text-xs underline hover:no-underline bg-red-600 px-2 py-1 rounded"
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
      <div className="absolute bottom-20 left-4 z-[1000] bg-white bg-opacity-95 p-3 rounded shadow-lg border max-h-80 overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
          <div className="w-3 h-3 bg-gradient-to-r from-blue-400 via-orange-400 to-red-500 rounded-full mr-2"></div>
          Peta Risiko Bencana
        </h3>
        <div className="space-y-1 text-xs">
          {Object.entries(DISASTER_TYPES).map(([key, disaster]) => (
            <div key={key} className="flex items-center space-x-2">
              <div 
                className="w-4 h-3 rounded-sm border border-gray-300" 
                style={{backgroundColor: disaster.color}}
              ></div>
              <span className="text-gray-700">{disaster.name}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            <div className="font-medium mb-1">Intensitas (Opacity):</div>
            <div>• Ringan: 50-60%</div>
            <div>• Sedang: 60-70%</div>
            <div>• Tinggi: 70-80%</div>
            <div>• Sangat Tinggi: 80-90%</div>
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

export default Bencana;