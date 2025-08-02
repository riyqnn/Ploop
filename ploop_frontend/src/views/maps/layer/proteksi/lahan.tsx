import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import L from "leaflet";
import type { FeatureCollection } from "geojson";

interface LahanProps {
  map: L.Map | null;
  enabled: boolean;
  dataType?: 'lahan' | 'topography';
}

// Cache untuk menyimpan data yang sudah di-load
const dataCache = new Map<string, FeatureCollection>();

// Land use types dan warna yang sesuai (avoiding blue, red, yellow)
const LAND_TYPES = {
  'land_Pola_Perumahan': { color: 'rgba(138, 43, 226, 0.8)', name: 'Perumahan' }, // Purple
  'land_Pola_Perdagangan': { color: 'rgba(34, 139, 34, 0.8)', name: 'Perdagangan' }, // Forest Green
  'land_Pola_Industri': { color: 'rgba(105, 105, 105, 0.8)', name: 'Industri' }, // Dim Gray
  'land_Pola_RTH': { color: 'rgba(0, 128, 0, 0.8)', name: 'Ruang Terbuka Hijau' }, // Green
  'land_Pola_Perkantoran': { color: 'rgba(72, 61, 139, 0.8)', name: 'Perkantoran' }, // Dark Slate Blue
  'land_Pola_Pendidikan': { color: 'rgba(160, 82, 45, 0.8)', name: 'Pendidikan' }, // Saddle Brown
  'land_Pola_Kesehatan': { color: 'rgba(47, 79, 79, 0.8)', name: 'Kesehatan' }, // Dark Slate Gray
  'land_Pola_Transportasi': { color: 'rgba(85, 107, 47, 0.8)', name: 'Transportasi' }, // Dark Olive Green
  'land_Pola_Pertanian': { color: 'rgba(154, 205, 50, 0.8)', name: 'Pertanian' }, // Yellow Green
  'land_Pola_Lainnya': { color: 'rgba(139, 69, 19, 0.8)', name: 'Lainnya' } // Saddle Brown
};

function Lahan({ 
  map, 
  enabled,
  dataType = 'lahan'
}: LahanProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const loadingControllerRef = useRef<AbortController | null>(null);

  // Function untuk menghitung total land use dan mendapatkan pola dominan
  const getLandInfo = useCallback((properties: any) => {
    let totalLand = 0;
    let dominantLand = null;
    let maxValue = 0;

    Object.keys(LAND_TYPES).forEach(landType => {
      const value = properties[landType];
      if (value && typeof value === 'string') {
        // Parse percentage from string like "40%"
        const numValue = parseFloat(value.replace('%', ''));
        if (!isNaN(numValue) && numValue > 0) {
          totalLand += numValue;
          if (numValue > maxValue) {
            maxValue = numValue;
            dominantLand = landType;
          }
        }
      }
    });

    return { totalLand, dominantLand, maxValue };
  }, []);

  // Memoized style function untuk performa yang lebih baik
  const getFeatureStyle = useCallback((feature: any) => {
    const properties = feature?.properties || {};
    const { totalLand, dominantLand, maxValue } = getLandInfo(properties);
    
    let fillColor = 'rgba(211, 211, 211, 0.3)'; // Light gray default
    let fillOpacity = 0.7;
    
    if (totalLand > 0 && dominantLand) {
      fillColor = LAND_TYPES[dominantLand as keyof typeof LAND_TYPES].color;
      
      // Opacity berdasarkan persentase dominan
      if (maxValue >= 50) {
        fillOpacity = 0.9;
      } else if (maxValue >= 40) {
        fillOpacity = 0.8;
      } else if (maxValue >= 30) {
        fillOpacity = 0.7;
      } else if (maxValue >= 20) {
        fillOpacity = 0.6;
      } else {
        fillOpacity = 0.5;
      }
    }

    return {
      fillColor,
      fillOpacity,
      color: '#333333',
      weight: 0.8,
      opacity: 0.9
    };
  }, [getLandInfo]);

  // Memoized popup content generator
  const createPopupContent = useCallback((feature: any, latlng: L.LatLng) => {
    const properties = feature.properties || {};
    const name = properties.name || 'N/A';
    const kota = properties.kota || 'N/A';
    const { totalLand } = getLandInfo(properties);
    
    // Buat daftar penggunaan lahan yang ada
    const landUses = Object.keys(LAND_TYPES)
      .map(landType => {
        const value = properties[landType];
        if (value && typeof value === 'string') {
          const numValue = parseFloat(value.replace('%', ''));
          if (!isNaN(numValue) && numValue > 0) {
            return {
              name: LAND_TYPES[landType as keyof typeof LAND_TYPES].name,
              value: value,
              numValue: numValue,
              color: LAND_TYPES[landType as keyof typeof LAND_TYPES].color
            };
          }
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => (b?.numValue || 0) - (a?.numValue || 0));
    
    const landUsesList = landUses.length > 0 
      ? landUses.map(land => 
          `<div style="margin-bottom: 3px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center;">
              <div style="width: 14px; height: 14px; background-color: ${land?.color}; border-radius: 3px; margin-right: 8px; border: 1px solid #666;"></div>
              <span>${land?.name}</span>
            </div>
            <strong style="color: #2d3748;">${land?.value}</strong>
          </div>`
        ).join('')
      : '<div style="color: #718096; font-style: italic;">Tidak ada data penggunaan lahan</div>';
    
    return `
      <div style="padding: 12px; min-width: 260px; font-size: 13px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="font-weight: 700; color: #2d3748; margin-bottom: 4px; font-size: 16px;">${name}</div>
        <div style="color: #4a5568; margin-bottom: 10px; font-style: italic; font-size: 14px;">${kota}</div>
        <div style="color: #2d3748;">
          <div style="margin-bottom: 8px; padding: 6px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 6px; text-align: center;">
            <strong>Pola Penggunaan Lahan</strong>
          </div>
          <div style="margin-bottom: 6px; font-weight: 600; color: #4a5568;">Distribusi Lahan:</div>
          ${landUsesList}
          <div style="font-size: 12px; color: #718096; margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            <div style="margin-bottom: 2px;">ID: ${properties.id || 'N/A'}</div>
            <div>Koordinat: ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}</div>
          </div>
        </div>
      </div>
    `;
  }, [getLandInfo]);

  // Optimized feature event handler
  const setupFeatureEvents = useCallback((feature: any, layer: L.Layer) => {
    let isHovered = false;
    
    layer.on('click', (e: any) => {
      const popupContent = createPopupContent(feature, e.latlng);
      layer.bindPopup(popupContent, {
        closeButton: true,
        autoClose: true,
        closeOnEscapeKey: true,
        maxWidth: 320
      }).openPopup();
    });

    // Throttled hover events untuk performa
    layer.on('mouseover', () => {
      if (isHovered) return;
      isHovered = true;
      
      requestAnimationFrame(() => {
        const pathLayer = layer as L.Path;
        pathLayer.setStyle({
          weight: 2.5,
          opacity: 1,
          fillOpacity: 0.95
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

    const loadLandData = async () => {
      const cacheKey = `land_${dataType}`;
      
      // Cek cache dulu
      if (dataCache.has(cacheKey)) {
        console.log("LandOverlay: Using cached data");
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
          'https://cdn.jsdelivr.net/gh/riyqnn/geojson-data@main/land.geojson',
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
        
        console.log("LandOverlay: Data loaded and cached", { features: data.features.length });
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        
        const errorMessage = `Failed to load land use data: ${err.message}`;
        console.error("LandOverlay: Error", err);
        setError(errorMessage);
      } finally {
        setLoading(false);
        loadingControllerRef.current = null;
      }
    };

    loadLandData();

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
        
        console.log("LandOverlay: Layer optimized and added");
      } catch (error) {
        console.error("LandOverlay: Setup error", error);
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
          console.error("LandOverlay: Cleanup error", error);
        }
      }
    };
  }, [map, geoData, enabled, getFeatureStyle, setupFeatureEvents]);

  // Memoized loading component
  const loadingComponent = useMemo(() => {
    if (!loading || !enabled) return null;
    
    return (
      <div className="absolute top-20 right-4 z-[1000] bg-purple-600 text-white px-4 py-3 rounded-lg shadow-lg">
        <div className="flex items-center space-x-3 text-sm">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
          <span>Loading Land Use Data...</span>
        </div>
      </div>
    );
  }, [loading, enabled]);

  // Memoized error component
  const errorComponent = useMemo(() => {
    if (!error || !enabled) return null;
    
    return (
      <div className="absolute top-20 right-4 z-[1000] bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm">
        <div className="text-sm">
          <strong>Error:</strong> {error}
          <button 
            onClick={() => {
              setError(null);
              setGeoData(null);
              dataCache.clear(); // Clear cache on retry
            }}
            className="block mt-3 text-xs underline hover:no-underline bg-red-700 px-3 py-1 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }, [error, enabled]);

  // Memoized legend component
  const legendComponent = useMemo(() => {
    if (!enabled || !geoData || loading || error) return null;
    
    return (
      <div className="absolute bottom-20 left-4 z-[1000] bg-white bg-opacity-97 p-4 rounded-lg shadow-xl border-2 border-gray-200 max-h-96 overflow-y-auto">
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
          <div className="w-4 h-4 bg-gradient-to-r from-purple-500 via-green-500 to-gray-500 rounded-full mr-2"></div>
          Peta Penggunaan Lahan
        </h3>
        <div className="space-y-2 text-xs">
          {Object.entries(LAND_TYPES).map(([key, land]) => (
            <div key={key} className="flex items-center space-x-3">
              <div 
                className="w-5 h-4 rounded border-2 border-gray-400" 
                style={{backgroundColor: land.color}}
              ></div>
              <span className="text-gray-800 font-medium">{land.name}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-gray-300">
          <div className="text-xs text-gray-700">
            <div className="font-semibold mb-2">Intensitas Warna:</div>
            <div>• 20-30%: Opacity rendah</div>
            <div>• 30-40%: Opacity sedang</div>
            <div>• 40-50%: Opacity tinggi</div>
            <div>• 50%+: Opacity maksimal</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-600 italic">
          Klik area untuk melihat detail
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

export default Lahan;