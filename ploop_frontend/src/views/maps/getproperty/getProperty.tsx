import { useState, useEffect } from "react";
import { supabase } from "@/service/supabaseClient";
import rumah from "/tipe_rumah.svg";
import apartemen from "/tipe_apartemen.svg";
import ruko from "/tipe_ruko.svg";

interface Property {
  id: number;
  latitude: number;
  longitude: number;
  name: string;
  address: string;
  whatsapp_contact: string;
  property_type: string;
  status: string;
  price: number;
  building_area: number | null;
  land_area: number | null;
  certificate: string;
  other_certificate: string | null;
  image_urls: string[];
  document_url: string;
  owner_address: string;
}

interface GetPropertyProps {
  onPropertySelect: (property: Property) => void;
  onPropertiesLoaded?: (properties: Property[]) => void;
}

function GetProperty({ onPropertySelect, onPropertiesLoaded }: GetPropertyProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch properties from Supabase
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.from("properties").select("*");
        
        if (error) {
          throw new Error(error.message);
        }
        setProperties(data || []);
        onPropertiesLoaded?.(data || []);
        console.log("GetProperty: Fetched properties:", data);
      } catch (err) {
        setError("Failed to fetch properties. Please try again later.");
        console.error("GetProperty: Error fetching properties:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  // Helper function to format price from MIST to SUI
  const formatPrice = (priceInMist: number) => {
    const priceInSui = priceInMist / 1_000_000_000; // Convert MIST to SUI
    return `${priceInSui.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} SUI`;
  };

  // Helper function to get property type icon
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

  const handlePropertyClick = (property: Property) => {
    onPropertySelect(property);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="font-semibold text-[#1a1a1a] text-[18px] leading-6 mb-2">
          Available Properties
        </h2>
        <p className="text-[13px] leading-5 font-normal text-[#6b7280] max-w-[280px]">
          Browse properties available on the platform.
        </p>
      </div>

      {/* Property List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#3f6ac8] border-t-transparent"></div>
            <span className="ml-2 text-[13px] text-[#6b7280]">Loading...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-[13px] text-red-600">{error}</p>
          </div>
        ) : properties.length > 0 ? (
          properties.map((property) => (
            <article
              key={property.id}
              className="bg-white border border-[#e5e7eb] rounded-xl p-5 hover:shadow-lg hover:border-[#3f6ac8] transition-all duration-200 cursor-pointer group"
              onClick={() => handlePropertyClick(property)}
            >
              <div className="flex flex-col space-y-4">
                {property.image_urls[0] && (
                  <div className="relative overflow-hidden rounded-lg">
                    <img
                      src={property.image_urls[0]}
                      alt={property.name}
                      className="w-full h-[120px] object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <img
                      src={getPropertyIcon(property.property_type)}
                      alt={property.property_type}
                      className="w-6 h-6 mt-1 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-[15px] leading-6 text-[#1a1a1a] group-hover:text-[#3f6ac8] transition-colors">
                        {property.name}
                      </h4>
                      <p className="text-[13px] leading-5 text-[#6b7280]">
                        {property.address}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#deecff] text-[#3f6ac8] text-[11px] font-medium">
                      {property.property_type}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#c5deff] text-[#3f6ac8] text-[11px] font-medium">
                      {property.status}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-[#f3f4f6]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#3f6ac8] flex items-center justify-center">
                      <i className="fas fa-lock text-white text-xs"></i>
                    </div>
                    <span className="text-[#1a1a1a] text-[15px] font-semibold">
                      {formatPrice(property.price)}
                    </span>
                  </div>
                  
                  <a
                    href={`https://wa.me/${property.whatsapp_contact}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#25d366] text-white text-[12px] font-medium rounded-lg hover:bg-[#128c7e] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <i className="fab fa-whatsapp text-xs"></i>
                    Contact
                  </a>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#deecff] rounded-full flex items-center justify-center">
              <i className="fas fa-home text-[#3f6ac8] text-xl"></i>
            </div>
            <p className="text-[13px] text-[#6b7280]">
              No properties found.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GetProperty;