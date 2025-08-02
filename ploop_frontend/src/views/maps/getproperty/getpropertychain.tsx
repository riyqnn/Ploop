import { useState, useEffect } from "react";
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { useCurrentAccount } from '@mysten/dapp-kit';
import rumah from "/tipe_rumah.svg";
import apartemen from "/tipe_apartemen.svg";
import ruko from "/tipe_ruko.svg";

// Network configuration
const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

interface Property {
  id: string;
  latitude: string;
  longitude: string;
  name: string;
  address: string;
  whatsapp_contact: string;
  property_type: string;
  status: string;
  price: number;
  building_area: number;
  land_area: number;
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

const propertyTypeMap: { [key: string]: string } = {
  "0": "House",
  "1": "Apartment",
  "2": "Shop",
  "3": "Boarding",
  "4": "Warehouse",
};

const statusMap: { [key: string]: string } = {
  "0": "For Sale",
  "1": "For Rent",
};

const certificateMap: { [key: string]: string } = {
  "0": "SHM",
  "1": "SHGB",
  "2": "Other",
};

function GetPropertyChain({ onPropertySelect, onPropertiesLoaded }: GetPropertyProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const account = useCurrentAccount();
  const packageId = "0xf65f65bc87a552572a4f3d5e85b307d2f8cc62bf16dc4f3efd29c8497a14c631";

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        let propertyObjects: Property[] = [];

        // If account is connected, fetch owned properties
        if (account?.address) {
          let cursor: string | null = null;
          do {
            const objects = await suiClient.getOwnedObjects({
              owner: account.address,
              options: { showContent: true, showType: true },
              cursor,
            });

            for (const obj of objects.data) {
              const content = obj.data?.content;
              if (obj.data && content && content.dataType === 'moveObject' && content.type === `${packageId}::property::Property`) {
                const fields = content.fields as {
                  latitude: string;
                  longitude: string;
                  name: string;
                  address: string;
                  whatsapp_contact: string;
                  property_type: string;
                  status: string;
                  price: string;
                  building_area: string;
                  land_area: string;
                  certificate: string;
                  other_certificate?: string;
                  image_urls: string[];
                  document_url: string;
                  owner: string;
                };
                propertyObjects.push({
                  id: obj.data.objectId,
                  latitude: fields.latitude,
                  longitude: fields.longitude,
                  name: fields.name,
                  address: fields.address,
                  whatsapp_contact: fields.whatsapp_contact,
                  property_type: propertyTypeMap[fields.property_type] || "Unknown",
                  status: statusMap[fields.status] || "Unknown",
                  price: Number(fields.price),
                  building_area: Number(fields.building_area),
                  land_area: Number(fields.land_area),
                  certificate: certificateMap[fields.certificate] || "Unknown",
                  other_certificate: fields.other_certificate ?? null,
                  image_urls: fields.image_urls || [],
                  document_url: fields.document_url || "",
                  owner_address: fields.owner,
                });
              }
            }
          cursor = objects.hasNextPage ? (objects.nextCursor ?? null) : null;
          } while (cursor);
        }

        setProperties(propertyObjects);
        onPropertiesLoaded?.(propertyObjects);
        console.log("GetPropertyChain: Fetched properties:", propertyObjects);
      } catch (err: any) {
        setError("Failed to fetch properties from blockchain. Please try again later.");
        console.error("GetPropertyChain: Error fetching properties:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [account]);

  const formatPrice = (priceInMist: number) => {
    const priceInSui = priceInMist / 1_000_000_000;
    return `${priceInSui.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} SUI`;
  };

  const getPropertyIcon = (propertyType: string) => {
    const iconMap: { [key: string]: string } = {
      'house': rumah,
      'apartment': apartemen,
      'shop': ruko,
      'boarding': rumah,
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
          Browse properties available on the blockchain.
        </p>
      </div>

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
              No properties found on the blockchain.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GetPropertyChain;