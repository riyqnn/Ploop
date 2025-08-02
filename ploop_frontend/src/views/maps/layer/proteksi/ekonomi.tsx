import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import L from "leaflet";
import type { FeatureCollection } from "geojson";

interface PendudukOverlayProps {
  map: L.Map | null;
  enabled: boolean;
  dataType?: 'ekonomi' | 'topography';
}

// Cache untuk menyimpan data yang sudah di-load
const dataCache = new Map<string, FeatureCollection>();

function Ekonomi({ 
  map, 
  enabled,
  dataType = 'ekonomi'
}: PendudukOverlayProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const loadingControllerRef = useRef<AbortController | null>(null);

  // Modern color palette dengan gradasi yang lebih smooth dan contemporary
  const getFeatureStyle = useCallback((feature: any) => {
    const pertumbuhanEkonomi = feature?.properties?.ekonomi_pertumbuhan_ekonomi || 0;
    const hargaBerlaku = feature?.properties?.ekonomi_harga_berlaku || 0;
    
    let fillColor = 'rgba(248, 250, 252, 0.1)'; // Very light gray for no data
    let fillOpacity = 0.8;
    
    // Modern gradient: Teal → Cyan → Blue → Purple → Pink for economic growth
    if (pertumbuhanEkonomi >= 8.0) {
      // High growth - Vibrant magenta/pink
      fillColor = 'rgba(236, 72, 153, 0.85)'; // Pink-500
    } else if (pertumbuhanEkonomi >= 6.0) {
      // Good growth - Purple
      fillColor = 'rgba(147, 51, 234, 0.8)'; // Purple-600
    } else if (pertumbuhanEkonomi >= 4.0) {
      // Moderate growth - Blue
      fillColor = 'rgba(59, 130, 246, 0.75)'; // Blue-500
    } else if (pertumbuhanEkonomi >= 2.0) {
      // Low growth - Cyan
      fillColor = 'rgba(6, 182, 212, 0.7)'; // Cyan-500
    } else if (pertumbuhanEkonomi > 0) {
      // Minimal growth - Teal
      fillColor = 'rgba(20, 184, 166, 0.65)'; // Teal-500
    } else if (pertumbuhanEkonomi < 0) {
      // Negative growth - Orange/Red warning
      fillColor = 'rgba(249, 115, 22, 0.75)'; // Orange-500
    }

    // Additional styling based on economic value (harga berlaku)
    let strokeWeight = 0.5;
    if (hargaBerlaku >= 500) {
      strokeWeight = 1.2; // Thicker border for high-value areas
    } else if (hargaBerlaku >= 300) {
      strokeWeight = 0.8;
    }

    return {
      fillColor,
      fillOpacity,
      color: 'rgba(255, 255, 255, 0.9)', // Clean white border
      weight: strokeWeight,
      opacity: 0.6,
      // Add subtle shadow effect
      className: 'modern-ekonomi-layer'
    };
  }, []);

  // Enhanced popup dengan styling modern
  const createPopupContent = useCallback((feature: any, latlng: L.LatLng) => {
    const properties = feature.properties || {};
    const name = properties.name || 'N/A';
    const kota = properties.kota || 'N/A';
    const tahun = properties.ekonomi_Tahun || 'N/A';
    const hargaBerlaku = properties.ekonomi_harga_berlaku || 'N/A';
    const pertumbuhanEkonomi = properties.ekonomi_pertumbuhan_ekonomi || 'N/A';
    const sektorUtama = properties.ekonomi_sektor_utama_pertumbuhan || 'N/A';
    
    // Format currency for harga berlaku
    const formatCurrency = (value: number) => {
      if (typeof value === 'number') {
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value * 1000000000); // Assuming the value is in billions
      }
      return value;
    };

    // Get growth indicator
    const getGrowthIndicator = (growth: number) => {
      if (growth >= 6) return { icon: '📈', color: '#10b981', label: 'Tinggi' };
      if (growth >= 4) return { icon: '📊', color: '#3b82f6', label: 'Sedang' };
      if (growth >= 2) return { icon: '📉', color: '#06b6d4', label: 'Rendah' };
      if (growth > 0) return { icon: '⚡', color: '#14b8a6', label: 'Minimal' };
      return { icon: '⚠️', color: '#f59e0b', label: 'Negatif' };
    };

    const growthIndicator = typeof pertumbuhanEkonomi === 'number' 
      ? getGrowthIndicator(pertumbuhanEkonomi) 
      : { icon: '❓', color: '#6b7280', label: 'N/A' };
    
    return `
      <div style="
        padding: 16px; 
        min-width: 280px; 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(226, 232, 240, 0.8);
      ">
        <div style="
          display: flex; 
          align-items: center; 
          margin-bottom: 12px; 
          padding-bottom: 8px;
          border-bottom: 2px solid rgba(147, 51, 234, 0.1);
        ">
          <div style="
            font-weight: 700; 
            color: #1e293b; 
            font-size: 16px;
            flex: 1;
          ">${name}</div>
          <div style="
            background: linear-gradient(135deg, ${growthIndicator.color}20, ${growthIndicator.color}10);
            color: ${growthIndicator.color};
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            ${growthIndicator.icon} ${growthIndicator.label}
          </div>
        </div>
        
        <div style="color: #64748b; margin-bottom: 12px; font-size: 13px; font-weight: 500;">
          📍 ${kota} • ${tahun}
        </div>
        
        <div style="display: grid; gap: 8px; margin-bottom: 12px;">
          <div style="
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            padding: 8px 12px;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05));
            border-radius: 8px;
            border-left: 3px solid #3b82f6;
          ">
            <span style="font-weight: 600; color: #334155; font-size: 13px;">💰 PDRB</span>
            <span style="font-weight: 700; color: #1e293b; font-size: 13px;">
              ${typeof hargaBerlaku === 'number' ? formatCurrency(hargaBerlaku) : hargaBerlaku}
            </span>
          </div>
          
          <div style="
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            padding: 8px 12px;
            background: linear-gradient(135deg, ${growthIndicator.color}15, ${growthIndicator.color}08);
            border-radius: 8px;
            border-left: 3px solid ${growthIndicator.color};
          ">
            <span style="font-weight: 600; color: #334155; font-size: 13px;">📈 Pertumbuhan</span>
            <span style="font-weight: 700; color: ${growthIndicator.color}; font-size: 13px;">
              ${typeof pertumbuhanEkonomi === 'number' ? pertumbuhanEkonomi.toFixed(1) + '%' : pertumbuhanEkonomi}
            </span>
          </div>
          
          <div style="
            padding: 8px 12px;
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
            border-radius: 8px;
            border-left: 3px solid #10b981;
          ">
            <div style="font-weight: 600; color: #334155; font-size: 12px; margin-bottom: 4px;">🏭 Sektor Utama</div>
            <div style="font-weight: 500; color: #475569; font-size: 12px; line-height: 1.4;">
              ${sektorUtama}
            </div>
          </div>
        </div>
        
        <div style="
          font-size: 11px; 
          color: #94a3b8; 
          text-align: center;
          padding-top: 8px;
          border-top: 1px solid rgba(226, 232, 240, 0.6);
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        ">
          📍 ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}
        </div>
      </div>
    `;
  }, []);

  // Optimized feature event handler with modern hover effects
  const setupFeatureEvents = useCallback((feature: any, layer: L.Layer) => {
    let isHovered = false;
    
    layer.on('click', (e: any) => {
      const popupContent = createPopupContent(feature, e.latlng);
      layer.bindPopup(popupContent, {
        closeButton: true,
        autoClose: true,
        closeOnEscapeKey: true,
        maxWidth: 320,
        className: 'modern-popup'
      }).openPopup();
    });

    // Enhanced hover effects
    layer.on('mouseover', () => {
      if (isHovered) return;
      isHovered = true;
      
      requestAnimationFrame(() => {
        const pathLayer = layer as L.Path;
        pathLayer.setStyle({
          weight: 2.5,
          opacity: 0.9,
          fillOpacity: 0.95,
          color: 'rgba(255, 255, 255, 1)'
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

    const loadEkonomiData = async () => {
      const cacheKey = `ekonomi_${dataType}`;
      
      // Cek cache dulu
      if (dataCache.has(cacheKey)) {
        console.log("EkonomiOverlay: Using cached data");
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
        const response = await fetch(
          'https://cdn.jsdelivr.net/gh/riyqnn/geojson-data@main/ekonomi.geojson',
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
        
        console.log("EkonomiOverlay: Data loaded and cached", { features: data.features.length });
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        
        const errorMessage = `Failed to load: ${err.message}`;
        console.error("EkonomiOverlay: Error", err);
        setError(errorMessage);
      } finally {
        setLoading(false);
        loadingControllerRef.current = null;
      }
    };

    loadEkonomiData();

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

    // Add custom CSS for modern effects
    const style = document.createElement('style');
    style.textContent = `
      .modern-ekonomi-layer {
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
        transition: all 0.2s ease-in-out;
      }
      .modern-ekonomi-layer:hover {
        filter: drop-shadow(0 4px 8px rgba(147, 51, 234, 0.2));
      }
      .modern-popup .leaflet-popup-content-wrapper {
        padding: 0;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      }
      .modern-popup .leaflet-popup-tip {
        background: #f8fafc;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
    `;
    if (!document.getElementById('modern-ekonomi-styles')) {
      style.id = 'modern-ekonomi-styles';
      document.head.appendChild(style);
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
        
        console.log("EkonomiOverlay: Modern layer optimized and added");
      } catch (error) {
        console.error("EkonomiOverlay: Setup error", error);
        setError(`Setup error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (geoJsonLayerRef.current && map) {
        try {
          map.removeLayer(geoJsonLayerRef.current);
          geoJsonLayerRef.current = null;
        } catch (error) {
          console.error("EkonomiOverlay: Cleanup error", error);
        }
      }
    };
  }, [map, geoData, enabled, getFeatureStyle, setupFeatureEvents]);

  // Modern loading component with gradient
  const loadingComponent = useMemo(() => {
    if (!loading || !enabled) return null;
    
    return (
      <div className="absolute top-20 right-4 z-[1000] bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl shadow-lg backdrop-blur-sm">
        <div className="flex items-center space-x-3 text-sm font-medium">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          <span>Loading Economic Data...</span>
        </div>
      </div>
    );
  }, [loading, enabled]);

  // Modern error component
  const errorComponent = useMemo(() => {
    if (!error || !enabled) return null;
    
    return (
      <div className="absolute top-20 right-4 z-[1000] bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-3 rounded-xl shadow-lg max-w-xs backdrop-blur-sm">
        <div className="text-sm">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">⚠️</span>
            <strong>Error Loading Data</strong>
          </div>
          <div className="text-xs opacity-90 mb-2">{error}</div>
          <button 
            onClick={() => {
              setError(null);
              setGeoData(null);
              dataCache.clear();
            }}
            className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors duration-200 font-medium"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }, [error, enabled]);

  // Modern legend component with gradient
  const legendComponent = useMemo(() => {
    if (!enabled || !geoData || loading || error) return null;
    
    return (
      <div className="absolute bottom-20 left-4 z-[1000] bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white/20">
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
          <div className="w-3 h-3 bg-gradient-to-r from-teal-400 via-blue-500 to-purple-600 rounded-full mr-2 shadow-sm"></div>
          Pertumbuhan Ekonomi
        </h3>
        <div className="flex flex-col space-y-2 text-xs">
          <div className="flex items-center justify-between space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-3 rounded-sm shadow-sm" style={{background: 'linear-gradient(90deg, rgba(236, 72, 153, 0.85), rgba(236, 72, 153, 0.6))'}}></div>
              <span className="font-medium">≥ 8%</span>
            </div>
            <span className="text-gray-600">Tinggi</span>
          </div>
          <div className="flex items-center justify-between space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-3 rounded-sm shadow-sm" style={{background: 'linear-gradient(90deg, rgba(147, 51, 234, 0.8), rgba(147, 51, 234, 0.5))'}}></div>
              <span className="font-medium">6-8%</span>
            </div>
            <span className="text-gray-600">Baik</span>
          </div>
          <div className="flex items-center justify-between space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-3 rounded-sm shadow-sm" style={{background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.75), rgba(59, 130, 246, 0.5))'}}></div>
              <span className="font-medium">4-6%</span>
            </div>
            <span className="text-gray-600">Sedang</span>
          </div>
          <div className="flex items-center justify-between space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-3 rounded-sm shadow-sm" style={{background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.7), rgba(6, 182, 212, 0.4))'}}></div>
              <span className="font-medium">2-4%</span>
            </div>
            <span className="text-gray-600">Rendah</span>
          </div>
          <div className="flex items-center justify-between space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-3 rounded-sm shadow-sm" style={{background: 'linear-gradient(90deg, rgba(20, 184, 166, 0.65), rgba(20, 184, 166, 0.4))'}}></div>
              <span className="font-medium">0-2%</span>
            </div>
            <span className="text-gray-600">Minimal</span>
          </div>
          <div className="flex items-center justify-between space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-3 rounded-sm shadow-sm" style={{background: 'linear-gradient(90deg, rgba(249, 115, 22, 0.75), rgba(249, 115, 22, 0.5))'}}></div>
              <span className="font-medium">&lt; 0%</span>
            </div>
            <span className="text-gray-600">Negatif</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-200 flex items-center">
          <span className="mr-1">📊</span>
          Berdasarkan tingkat pertumbuhan
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

export default Ekonomi;