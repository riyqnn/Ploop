module ploop_donation::property {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::transfer;

    // Error codes
    const E_TOO_MANY_IMAGES: u64 = 0;
    const E_INSUFFICIENT_PAYMENT: u64 = 1;
    const E_INVALID_PROPERTY_TYPE: u64 = 100;
    const E_INVALID_PROPERTY_STATUS: u64 = 101;
    const E_INVALID_CERTIFICATE_TYPE: u64 = 102;

    /// Enum tipe properti
    public enum PropertyType has copy, drop, store {
        Rumah,
        Apartemen,
        Ruko,
        Kost,
        Gudang
    }

    /// Enum status properti
    public enum PropertyStatus has copy, drop, store {
        Dijual,
        Disewa
    }

    /// Enum jenis sertifikat
    public enum CertificateType has copy, drop, store {
        SHM,
        SHGB,
        Lainnya
    }

    /// Struct data properti (immutable after creation)
    public struct Property has key, store {
        id: UID,
        latitude: vector<u8>,
        longitude: vector<u8>,
        nama: vector<u8>,
        alamat: vector<u8>,
        kontak_wa: vector<u8>,
        tipe: PropertyType,
        status: PropertyStatus,
        harga: u64, // harga dalam MIST (1 SUI = 1_000_000_000 MIST)
        luas_bangunan: u64,
        luas_tanah: u64,
        sertifikat: CertificateType,
        sertifikat_lainnya: vector<u8>,
        gambar_urls: vector<vector<u8>>, // max 10 URL gambar
        dokumen_url: vector<u8>, // PDF dokumen bukti kepemilikan
        pemilik: address
    }

    /// Event ketika properti didaftarkan
    public struct PropertyRegistered has copy, drop {
        property_id: address,
        pemilik: address,
        nama: vector<u8>,
        harga: u64
    }

    /// Event ketika properti dibeli
    public struct PropertySold has copy, drop {
        property_id: address,
        pemilik_lama: address,
        pemilik_baru: address,
        harga: u64
    }

    /// Fungsi untuk mendaftarkan properti baru
    public entry fun register_property(
        latitude: vector<u8>,
        longitude: vector<u8>,
        nama: vector<u8>,
        alamat: vector<u8>,
        kontak_wa: vector<u8>,
        tipe: u8,
        status: u8,
        harga: u64,
        luas_bangunan: u64,
        luas_tanah: u64,
        sertifikat: u8,
        sertifikat_lainnya: vector<u8>,
        gambar_urls: vector<vector<u8>>,
        dokumen_url: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(vector::length(&gambar_urls) <= 10, E_TOO_MANY_IMAGES);

        let sender = tx_context::sender(ctx);
        let property_id = object::new(ctx);
        let property_address = object::uid_to_address(&property_id);

        let property = Property {
            id: property_id,
            latitude,
            longitude,
            nama,
            alamat,
            kontak_wa,
            tipe: property_type_from_u8(tipe),
            status: property_status_from_u8(status),
            harga,
            luas_bangunan,
            luas_tanah,
            sertifikat: certificate_from_u8(sertifikat),
            sertifikat_lainnya,
            gambar_urls,
            dokumen_url,
            pemilik: sender,
        };

        // Emit event
        event::emit(PropertyRegistered {
            property_id: property_address,
            pemilik: sender,
            nama: property.nama,
            harga
        });

        // Transfer properti ke pemilik
        transfer::public_transfer(property, sender);
    }

    /// Fungsi untuk membeli properti
    public entry fun buy_property(
        mut property: Property,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let payment_value = coin::value(&payment);
        assert!(payment_value >= property.harga, E_INSUFFICIENT_PAYMENT);

        let pemilik_lama = property.pemilik;
        let pembeli = tx_context::sender(ctx);
        let property_address = object::uid_to_address(&property.id);
        let harga = property.harga;

        // Update pemilik properti
        property.pemilik = pembeli;

        // Emit event
        event::emit(PropertySold {
            property_id: property_address,
            pemilik_lama,
            pemilik_baru: pembeli,
            harga
        });

        // Transfer SUI ke pemilik lama
        transfer::public_transfer(payment, pemilik_lama);

        // Transfer kepemilikan properti ke pembeli
        transfer::public_transfer(property, pembeli);
    }

    /// Helper function to convert u8 to PropertyType
    fun property_type_from_u8(_tipe: u8): PropertyType {
        if (_tipe == 0) return PropertyType::Rumah;
        if (_tipe == 1) return PropertyType::Apartemen;
        if (_tipe == 2) return PropertyType::Ruko;
        if (_tipe == 3) return PropertyType::Kost;
        if (_tipe == 4) return PropertyType::Gudang;
        abort E_INVALID_PROPERTY_TYPE
    }

    /// Helper function to convert u8 to PropertyStatus
    fun property_status_from_u8(_status: u8): PropertyStatus {
        if (_status == 0) return PropertyStatus::Dijual;
        if (_status == 1) return PropertyStatus::Disewa;
        abort E_INVALID_PROPERTY_STATUS
    }

    /// Helper function to convert u8 to CertificateType
    fun certificate_from_u8(_sertifikat: u8): CertificateType {
        if (_sertifikat == 0) return CertificateType::SHM;
        if (_sertifikat == 1) return CertificateType::SHGB;
        if (_sertifikat == 2) return CertificateType::Lainnya;
        abort E_INVALID_CERTIFICATE_TYPE
    }

    // === View Functions ===
    public fun get_property_info(property: &Property): (vector<u8>, u64, address) {
        (property.nama, property.harga, property.pemilik)
    }

    public fun get_location(property: &Property): (vector<u8>, vector<u8>) {
        (property.latitude, property.longitude)
    }

    public fun get_details(property: &Property): (u64, u64, CertificateType) {
        (property.luas_bangunan, property.luas_tanah, property.sertifikat)
    }
}