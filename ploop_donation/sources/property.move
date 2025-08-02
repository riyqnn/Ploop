module ploop_donation::property {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::transfer;
    use std::string::{Self, String};

    // Error codes
    const E_TOO_MANY_IMAGES: u64 = 0;
    const E_INSUFFICIENT_PAYMENT: u64 = 1;
    const E_INVALID_PROPERTY_TYPE: u64 = 100;
    const E_INVALID_PROPERTY_STATUS: u64 = 101;
    const E_INVALID_CERTIFICATE_TYPE: u64 = 102;

    /// Property type enum
    public enum PropertyType has copy, drop, store {
        House,
        Apartment,
        Shop,
        Boarding,
        Warehouse
    }

    /// Property status enum
    public enum PropertyStatus has copy, drop, store {
        ForSale,
        ForRent
    }

    /// Certificate type enum
    public enum CertificateType has copy, drop, store {
        SHM,
        SHGB,
        Other
    }

    /// Property data struct (immutable after creation)
    public struct Property has key, store {
        id: UID,
        latitude: String,
        longitude: String,
        name: String,
        address: String,
        whatsapp_contact: String,
        property_type: PropertyType,
        status: PropertyStatus,
        price: u64, // price in MIST (1 SUI = 1_000_000_000 MIST)
        building_area: u64,
        land_area: u64,
        certificate: CertificateType,
        other_certificate: String,
        image_urls: vector<String>, // max 10 image URLs
        document_url: String, // PDF document proof of ownership
        owner: address
    }

    /// Event when property is registered
    public struct PropertyRegistered has copy, drop {
        property_id: address,
        owner: address,
        name: String,
        price: u64
    }

    /// Event when property is sold
    public struct PropertySold has copy, drop {
        property_id: address,
        old_owner: address,
        new_owner: address,
        price: u64
    }

    /// Function to register new property
    public entry fun register_property(
        latitude: String,
        longitude: String,
        name: String,
        address: String,
        whatsapp_contact: String,
        property_type: u8,
        status: u8,
        price: u64,
        building_area: u64,
        land_area: u64,
        certificate: u8,
        other_certificate: String,
        image_urls: vector<String>,
        document_url: String,
        ctx: &mut TxContext
    ) {
        assert!(vector::length(&image_urls) <= 10, E_TOO_MANY_IMAGES);

        let sender = tx_context::sender(ctx);
        let property_id = object::new(ctx);
        let property_address = object::uid_to_address(&property_id);

        let mut property = Property {
            id: property_id,
            latitude,
            longitude,
            name: string::utf8(b""), // temporary for name copy
            address,
            whatsapp_contact,
            property_type: property_type_from_u8(property_type),
            status: property_status_from_u8(status),
            price,
            building_area,
            land_area,
            certificate: certificate_from_u8(certificate),
            other_certificate,
            image_urls,
            document_url,
            owner: sender,
        };

        // Copy name for event and property
        property.name = name;
        let event_name = name;

        // Emit event
        event::emit(PropertyRegistered {
            property_id: property_address,
            owner: sender,
            name: event_name,
            price
        });

        // Transfer property to owner
        transfer::public_transfer(property, sender);
    }

    /// Function to buy property
    public entry fun buy_property(
        mut property: Property,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let payment_value = coin::value(&payment);
        assert!(payment_value >= property.price, E_INSUFFICIENT_PAYMENT);

        let old_owner = property.owner;
        let buyer = tx_context::sender(ctx);
        let property_address = object::uid_to_address(&property.id);
        let price = property.price;

        // Update property owner
        property.owner = buyer;

        // Emit event
        event::emit(PropertySold {
            property_id: property_address,
            old_owner,
            new_owner: buyer,
            price
        });

        // Transfer SUI to old owner
        transfer::public_transfer(payment, old_owner);

        // Transfer property ownership to buyer
        transfer::public_transfer(property, buyer);
    }

    /// Helper function to convert u8 to PropertyType
    fun property_type_from_u8(_type: u8): PropertyType {
        if (_type == 0) return PropertyType::House;
        if (_type == 1) return PropertyType::Apartment;
        if (_type == 2) return PropertyType::Shop;
        if (_type == 3) return PropertyType::Boarding;
        if (_type == 4) return PropertyType::Warehouse;
        abort E_INVALID_PROPERTY_TYPE
    }

    /// Helper function to convert u8 to PropertyStatus
    fun property_status_from_u8(_status: u8): PropertyStatus {
        if (_status == 0) return PropertyStatus::ForSale;
        if (_status == 1) return PropertyStatus::ForRent;
        abort E_INVALID_PROPERTY_STATUS
    }

    /// Helper function to convert u8 to CertificateType
    fun certificate_from_u8(_certificate: u8): CertificateType {
        if (_certificate == 0) return CertificateType::SHM;
        if (_certificate == 1) return CertificateType::SHGB;
        if (_certificate == 2) return CertificateType::Other;
        abort E_INVALID_CERTIFICATE_TYPE
    }

    // === View Functions ===
    public fun get_property_info(property: &Property): (String, u64, address) {
        (property.name, property.price, property.owner)
    }

    public fun get_location(property: &Property): (String, String) {
        (property.latitude, property.longitude)
    }

    public fun get_details(property: &Property): (u64, u64, CertificateType) {
        (property.building_area, property.land_area, property.certificate)
    }

    public fun get_contact_info(property: &Property): (String, String) {
        (property.whatsapp_contact, property.address)
    }

    public fun get_images_and_docs(property: &Property): (vector<String>, String) {
        (property.image_urls, property.document_url)
    }
}