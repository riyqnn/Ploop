import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import L from "leaflet";
import type { FeatureCollection } from "geojson";

interface PendudukOverlayProps {
  map: L.Map | null;
  enabled: boolean;
  dataType?: 'penduduk' | 'topography';
}

// Cache untuk menyimpan data yang sudah di-load
const dataCache = new Map<string, FeatureCollection>();

function Penduduk({ 
  map, 
  enabled,
  dataType = 'penduduk'
}: PendudukOverlayProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const loadingControllerRef = useRef<AbortController | null>(null);

  // Memoized style function untuk performa yang lebih baik
  const getFeatureStyle = useCallback((feature: any) => {
    const jumlahPenduduk = feature?.properties?.data_Jumlah_Penduduk || 0;
    const kepadatanPenduduk = feature?.properties?.data_Kepadatan_Penduduk || 0;
    
    let fillColor = 'rgba(255, 255, 255, 0.1)';
    let fillOpacity = 0.7;
    
    // Style berdasarkan kepadatan penduduk dengan gradasi hijau muda -> kuning -> merah
    if (kepadatanPenduduk >= 20000) {
      fillColor = 'rgba(220, 53, 69, 0.8)'; // Merah tua untuk kepadatan sangat tinggi
    } else if (kepadatanPenduduk >= 15000) {
      fillColor = 'rgba(255, 87, 34, 0.75)'; // Oranye merah untuk kepadatan tinggi
    } else if (kepadatanPenduduk >= 10000) {
      fillColor = 'rgba(255, 193, 7, 0.7)'; // Kuning untuk kepadatan sedang-tinggi
    } else if (kepadatanPenduduk >= 5000) {
      fillColor = 'rgba(255, 235, 59, 0.65)'; // Kuning muda untuk kepadatan sedang
    } else if (kepadatanPenduduk > 0) {
      fillColor = 'rgba(139, 195, 74, 0.6)'; // Hijau muda untuk kepadatan rendah
    }

    return {
      fillColor,
      fillOpacity,
      color: '#ffffff',
      weight: 0.3,
      opacity: 0.2
    };
  }, []);

  // Memoized popup content generator
  const createPopupContent = useCallback((feature: any, latlng: L.LatLng) => {
    const properties = feature.properties || {};
    const name = properties.name || 'N/A';
    const kota = properties.kota || 'N/A';
    const jumlahPenduduk = properties.data_Jumlah_Penduduk || 'N/A';
    const pertumbuhanPenduduk = properties.data_Pertumbuhan_Penduduk || 'N/A';
    const persentasePenduduk = properties.data_Persentase_Penduduk || 'N/A';
    const kepadatanPenduduk = properties.data_Kepadatan_Penduduk || 'N/A';
    const rasioJenisKelamin = properties.data_rasio_Jenis_Kelamin_Penduduk || 'N/A';
    
    return `
      <div style="padding: 10px; min-width: 200px; font-size: 12px;">
        <div style="font-weight: 600; color: #dc2626; margin-bottom: 6px; font-size: 14px;">${name}</div>
        <div style="color: #374151; margin-bottom: 4px; font-style: italic;">${kota}</div>
        <div style="color: #374151;">
          <div style="margin-bottom: 2px;"><strong>Jumlah Penduduk:</strong> ${typeof jumlahPenduduk === 'number' ? jumlahPenduduk.toLocaleString('id-ID') : jumlahPenduduk}</div>
          <div style="margin-bottom: 2px;"><strong>Kepadatan:</strong> ${typeof kepadatanPenduduk === 'number' ? kepadatanPenduduk.toLocaleString('id-ID') : kepadatanPenduduk} jiwa/km²</div>
          <div style="margin-bottom: 2px;"><strong>Pertumbuhan:</strong> ${pertumbuhanPenduduk}%</div>
          <div style="margin-bottom: 2px;"><strong>Persentase:</strong> ${persentasePenduduk}%</div>
          <div style="margin-bottom: 2px;"><strong>Rasio L/P:</strong> ${rasioJenisKelamin}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px; border-top: 1px solid #e5e7eb; padding-top: 2px;">
            ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}
          </div>
        </div>
      </div>
    `;
  }, []);

  // Optimized feature event handler
  const setupFeatureEvents = useCallback((feature: any, layer: L.Layer) => {
    let isHovered = false;
    
    layer.on('click', (e: any) => {
      const popupContent = createPopupContent(feature, e.latlng);
      layer.bindPopup(popupContent, {
        closeButton: true,
        autoClose: true,
        closeOnEscapeKey: true,
        maxWidth: 250
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
          opacity: 0.8,
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

    const loadPendudukData = async () => {
      const cacheKey = `penduduk_${dataType}`;
      
      // Cek cache dulu
      if (dataCache.has(cacheKey)) {
        console.log("PendudukOverlay: Using cached data");
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
        // You'll need to replace this URL with your actual data source
        const response = await fetch(
          'https://cdn.jsdelivr.net/gh/riyqnn/geojson-data@main/penduduk.geojson', // Replace with your actual URL
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
        
        console.log("PendudukOverlay: Data loaded and cached", { features: data.features.length });
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        
        const errorMessage = `Failed to load: ${err.message}`;
        console.error("PendudukOverlay: Error", err);
        setError(errorMessage);
      } finally {
        setLoading(false);
        loadingControllerRef.current = null;
      }
    };

    loadPendudukData();

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
        
        console.log("PendudukOverlay: Layer optimized and added");
      } catch (error) {
        console.error("PendudukOverlay: Setup error", error);
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
          console.error("PendudukOverlay: Cleanup error", error);
        }
      }
    };
  }, [map, geoData, enabled, getFeatureStyle, setupFeatureEvents]);

  // Memoized loading component
  const loadingComponent = useMemo(() => {
    if (!loading || !enabled) return null;
    
    return (
      <div className="absolute top-20 right-4 z-[1000] bg-orange-500 text-white px-2 py-1 rounded shadow-lg">
        <div className="flex items-center space-x-2 text-sm">
          <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
          <span>Loading Population Data...</span>
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
          <div className="w-2 h-2 bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 rounded-full mr-1"></div>
          Kepadatan Penduduk
        </h3>
        <div className="flex flex-col space-y-1 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-2 rounded-sm" style={{backgroundColor: 'rgba(139, 195, 74, 0.8)'}}></div>
            <span>&lt; 5K</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-2 rounded-sm" style={{backgroundColor: 'rgba(255, 235, 59, 0.8)'}}></div>
            <span>5K - 10K</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-2 rounded-sm" style={{backgroundColor: 'rgba(255, 193, 7, 0.8)'}}></div>
            <span>10K - 15K</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-2 rounded-sm" style={{backgroundColor: 'rgba(255, 87, 34, 0.8)'}}></div>
            <span>15K - 20K</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-2 rounded-sm" style={{backgroundColor: 'rgba(220, 53, 69, 0.8)'}}></div>
            <span>&gt; 20K</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-1">jiwa/km²</div>
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

export default Penduduk;