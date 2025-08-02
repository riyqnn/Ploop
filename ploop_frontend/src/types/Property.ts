export interface Property {
  id: number; // tidak digunakan di register
  latitude: number;
  longitude: number;
  name: string;
  address: string;
  whatsapp_contact: string;
  property_type: string; // needs to be mapped to u8
  status: string;        // needs to be mapped to u8
  price: number;         // dalam Mist (1 SUI = 1_000_000_000 MIST)
  building_area: number | null;
  land_area: number | null;
  certificate: string;   // needs to be mapped to u8
  other_certificate: string | null;
  image_urls: string[];
  document_url: string;
  owner_address: string; // diabaikan, karena ambil dari ctx.sender
}
