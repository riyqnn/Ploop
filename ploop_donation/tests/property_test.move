#[test_only]
module ploop_donation::property_tests {
    use sui::test_scenario::{Self, Scenario, next_tx, ctx};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::test_utils;
    use ploop_donation::property::{Self, Property, PropertyRegistered, PropertySold};

    // Test addresses
    const OWNER: address = @0xA;
    const BUYER: address = @0xB;
    const INVALID_BUYER: address = @0xC;

    // Test constants
    const PROPERTY_PRICE: u64 = 1_000_000_000; // 1 SUI in MIST
    const INSUFFICIENT_PAYMENT: u64 = 500_000_000; // 0.5 SUI in MIST
    const SUFFICIENT_PAYMENT: u64 = 1_500_000_000; // 1.5 SUI in MIST

    #[test]
    fun test_register_property_success() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Register a new property
        next_tx(&mut scenario, OWNER);
        {
            let ctx = ctx(&mut scenario);
            property::register_property(
                b"37.7749", // latitude
                b"122.4194", // longitude
                b"Beautiful House", // nama
                b"123 Main Street, Jakarta", // alamat
                b"+62812345678", // kontak_wa
                0, // tipe: Rumah
                0, // status: Dijual
                PROPERTY_PRICE, // harga
                150, // luas_bangunan
                200, // luas_tanah
                0, // sertifikat: SHM
                b"", // sertifikat_lainnya
                vector[b"https://example.com/image1.jpg", b"https://example.com/image2.jpg"], // gambar_urls
                b"https://example.com/document.pdf", // dokumen_url
                ctx
            );
        };

        // Check if property was created and transferred to owner
        next_tx(&mut scenario, OWNER);
        {
            let property = test_scenario::take_from_sender<Property>(&scenario);
            let (nama, harga, pemilik) = property::get_property_info(&property);
            
            assert!(nama == b"Beautiful House", 0);
            assert!(harga == PROPERTY_PRICE, 1);
            assert!(pemilik == OWNER, 2);
            
            let (latitude, longitude) = property::get_location(&property);
            assert!(latitude == b"37.7749", 3);
            assert!(longitude == b"122.4194", 4);
            
            let (luas_bangunan, luas_tanah, sertifikat) = property::get_details(&property);
            assert!(luas_bangunan == 150, 5);
            assert!(luas_tanah == 200, 6);
            
            test_scenario::return_to_sender(&scenario, property);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = ploop_donation::property::E_TOO_MANY_IMAGES)]
    fun test_register_property_too_many_images() {
        let mut scenario = test_scenario::begin(OWNER);
        
        next_tx(&mut scenario, OWNER);
        {
            let ctx = ctx(&mut scenario);
            // Create vector with 11 images (exceeds limit of 10)
            let mut images = vector::empty<vector<u8>>();
            let mut i = 0;
            while (i < 11) {
                vector::push_back(&mut images, b"https://example.com/image.jpg");
                i = i + 1;
            };
            
            property::register_property(
                b"37.7749",
                b"122.4194",
                b"Test House",
                b"Test Address",
                b"+62812345678",
                0, // Rumah
                0, // Dijual
                PROPERTY_PRICE,
                150,
                200,
                0, // SHM
                b"",
                images, // 11 images - should fail
                b"https://example.com/doc.pdf",
                ctx
            );
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = ploop_donation::property::E_INVALID_PROPERTY_TYPE)]
    fun test_register_property_invalid_type() {
        let mut scenario = test_scenario::begin(OWNER);
        
        next_tx(&mut scenario, OWNER);
        {
            let ctx = ctx(&mut scenario);
            property::register_property(
                b"37.7749",
                b"122.4194",
                b"Test House",
                b"Test Address",
                b"+62812345678",
                5, // Invalid type (only 0-4 are valid)
                0, // Dijual
                PROPERTY_PRICE,
                150,
                200,
                0, // SHM
                b"",
                vector[b"https://example.com/image.jpg"],
                b"https://example.com/doc.pdf",
                ctx
            );
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = ploop_donation::property::E_INVALID_PROPERTY_STATUS)]
    fun test_register_property_invalid_status() {
        let mut scenario = test_scenario::begin(OWNER);
        
        next_tx(&mut scenario, OWNER);
        {
            let ctx = ctx(&mut scenario);
            property::register_property(
                b"37.7749",
                b"122.4194",
                b"Test House",
                b"Test Address",
                b"+62812345678",
                0, // Rumah
                2, // Invalid status (only 0-1 are valid)
                PROPERTY_PRICE,
                150,
                200,
                0, // SHM
                b"",
                vector[b"https://example.com/image.jpg"],
                b"https://example.com/doc.pdf",
                ctx
            );
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = ploop_donation::property::E_INVALID_CERTIFICATE_TYPE)]
    fun test_register_property_invalid_certificate() {
        let mut scenario = test_scenario::begin(OWNER);
        
        next_tx(&mut scenario, OWNER);
        {
            let ctx = ctx(&mut scenario);
            property::register_property(
                b"37.7749",
                b"122.4194",
                b"Test House",
                b"Test Address",
                b"+62812345678",
                0, // Rumah
                0, // Dijual
                PROPERTY_PRICE,
                150,
                200,
                3, // Invalid certificate type (only 0-2 are valid)
                b"",
                vector[b"https://example.com/image.jpg"],
                b"https://example.com/doc.pdf",
                ctx
            );
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_buy_property_success() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // First, register a property
        next_tx(&mut scenario, OWNER);
        {
            let ctx = ctx(&mut scenario);
            property::register_property(
                b"37.7749",
                b"122.4194",
                b"House for Sale",
                b"456 Sale Street",
                b"+62812345678",
                0, // Rumah
                0, // Dijual
                PROPERTY_PRICE,
                120,
                180,
                0, // SHM
                b"",
                vector[b"https://example.com/image.jpg"],
                b"https://example.com/doc.pdf",
                ctx
            );
        };

        // Buyer purchases the property
        next_tx(&mut scenario, BUYER);
        {
            let property = test_scenario::take_from_address<Property>(&scenario, OWNER);
            let ctx = ctx(&mut scenario);
            let payment = coin::mint_for_testing<SUI>(SUFFICIENT_PAYMENT, ctx);
            
            property::buy_property(property, payment, ctx);
        };

        // Verify property ownership changed to buyer
        next_tx(&mut scenario, BUYER);
        {
            let property = test_scenario::take_from_sender<Property>(&scenario);
            let (_, _, new_owner) = property::get_property_info(&property);
            assert!(new_owner == BUYER, 0);
            test_scenario::return_to_sender(&scenario, property);
        };

        // Verify original owner received payment
        next_tx(&mut scenario, OWNER);
        {
            let payment_received = test_scenario::take_from_sender<Coin<SUI>>(&scenario);
            assert!(coin::value(&payment_received) == SUFFICIENT_PAYMENT, 1);
            test_scenario::return_to_sender(&scenario, payment_received);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = ploop_donation::property::E_INSUFFICIENT_PAYMENT)]
    fun test_buy_property_insufficient_payment() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Register a property
        next_tx(&mut scenario, OWNER);
        {
            let ctx = ctx(&mut scenario);
            property::register_property(
                b"37.7749",
                b"122.4194",
                b"Expensive House",
                b"789 Expensive Ave",
                b"+62812345678",
                0, // Rumah
                0, // Dijual
                PROPERTY_PRICE,
                200,
                300,
                0, // SHM
                b"",
                vector[b"https://example.com/image.jpg"],
                b"https://example.com/doc.pdf",
                ctx
            );
        };

        // Try to buy with insufficient payment
        next_tx(&mut scenario, BUYER);
        {
            let property = test_scenario::take_from_address<Property>(&scenario, OWNER);
            let ctx = ctx(&mut scenario);
            let insufficient_payment = coin::mint_for_testing<SUI>(INSUFFICIENT_PAYMENT, ctx);
            
            property::buy_property(property, insufficient_payment, ctx);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_different_property_types() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Test all property types
        let property_types = vector[0u8, 1u8, 2u8, 3u8, 4u8]; // Rumah, Apartemen, Ruko, Kost, Gudang
        let mut i = 0;
        
        while (i < vector::length(&property_types)) {
            let property_type = *vector::borrow(&property_types, i);
            
            next_tx(&mut scenario, OWNER);
            {
                let ctx = ctx(&mut scenario);
                property::register_property(
                    b"37.7749",
                    b"122.4194",
                    b"Test Property",
                    b"Test Address",
                    b"+62812345678",
                    property_type,
                    0, // Dijual
                    PROPERTY_PRICE,
                    100,
                    150,
                    0, // SHM
                    b"",
                    vector[b"https://example.com/image.jpg"],
                    b"https://example.com/doc.pdf",
                    ctx
                );
            };
            
            next_tx(&mut scenario, OWNER);
            {
                let property = test_scenario::take_from_sender<Property>(&scenario);
                test_scenario::return_to_sender(&scenario, property);
            };
            
            i = i + 1;
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_different_certificate_types() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Test all certificate types
        let certificate_types = vector[0u8, 1u8, 2u8]; // SHM, SHGB, Lainnya
        let mut i = 0;
        
        while (i < vector::length(&certificate_types)) {
            let cert_type = *vector::borrow(&certificate_types, i);
            
            next_tx(&mut scenario, OWNER);
            {
                let ctx = ctx(&mut scenario);
                property::register_property(
                    b"37.7749",
                    b"122.4194",
                    b"Test Property",
                    b"Test Address",
                    b"+62812345678",
                    0, // Rumah
                    0, // Dijual
                    PROPERTY_PRICE,
                    100,
                    150,
                    cert_type,
                    if (cert_type == 2) b"Custom Certificate" else b"",
                    vector[b"https://example.com/image.jpg"],
                    b"https://example.com/doc.pdf",
                    ctx
                );
            };
            
            next_tx(&mut scenario, OWNER);
            {
                let property = test_scenario::take_from_sender<Property>(&scenario);
                test_scenario::return_to_sender(&scenario, property);
            };
            
            i = i + 1;
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_rental_property() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Register rental property
        next_tx(&mut scenario, OWNER);
        {
            let ctx = ctx(&mut scenario);
            property::register_property(
                b"37.7749",
                b"122.4194",
                b"Rental House",
                b"123 Rental St",
                b"+62812345678",
                0, // Rumah
                1, // Disewa (rental)
                PROPERTY_PRICE,
                80,
                100,
                1, // SHGB
                b"",
                vector[b"https://example.com/image.jpg"],
                b"https://example.com/doc.pdf",
                ctx
            );
        };

        // Property can still be "bought" (ownership transfer for rental management)
        next_tx(&mut scenario, BUYER);
        {
            let property = test_scenario::take_from_address<Property>(&scenario, OWNER);
            let ctx = ctx(&mut scenario);
            let payment = coin::mint_for_testing<SUI>(SUFFICIENT_PAYMENT, ctx);
            
            property::buy_property(property, payment, ctx);
        };

        // Verify ownership changed
        next_tx(&mut scenario, BUYER);
        {
            let property = test_scenario::take_from_sender<Property>(&scenario);
            let (_, _, new_owner) = property::get_property_info(&property);
            assert!(new_owner == BUYER, 0);
            test_scenario::return_to_sender(&scenario, property);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_view_functions() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Register property with specific data
        next_tx(&mut scenario, OWNER);
        {
            let ctx = ctx(&mut scenario);
            property::register_property(
                b"1.234567",
                b"103.654321",
                b"Test Villa",
                b"Prime Location",
                b"+6281234567890",
                1, // Apartemen
                0, // Dijual
                2_000_000_000, // 2 SUI
                300,
                500,
                1, // SHGB
                b"",
                vector[
                    b"https://example.com/img1.jpg",
                    b"https://example.com/img2.jpg",
                    b"https://example.com/img3.jpg"
                ],
                b"https://example.com/certificate.pdf",
                ctx
            );
        };

        // Test all view functions
        next_tx(&mut scenario, OWNER);
        {
            let property = test_scenario::take_from_sender<Property>(&scenario);
            
            // Test get_property_info
            let (nama, harga, pemilik) = property::get_property_info(&property);
            assert!(nama == b"Test Villa", 0);
            assert!(harga == 2_000_000_000, 1);
            assert!(pemilik == OWNER, 2);
            
            // Test get_location
            let (lat, lng) = property::get_location(&property);
            assert!(lat == b"1.234567", 3);
            assert!(lng == b"103.654321", 4);
            
            // Test get_details
            let (luas_bangunan, luas_tanah, _sertifikat) = property::get_details(&property);
            assert!(luas_bangunan == 300, 5);
            assert!(luas_tanah == 500, 6);
            
            test_scenario::return_to_sender(&scenario, property);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_exact_payment() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Register property
        next_tx(&mut scenario, OWNER);
        {
            let ctx = ctx(&mut scenario);
            property::register_property(
                b"37.7749",
                b"122.4194",
                b"Exact Price House",
                b"123 Exact St",
                b"+62812345678",
                0, // Rumah
                0, // Dijual
                PROPERTY_PRICE,
                150,
                200,
                0, // SHM
                b"",
                vector[b"https://example.com/image.jpg"],
                b"https://example.com/doc.pdf",
                ctx
            );
        };

        // Buy with exact payment amount
        next_tx(&mut scenario, BUYER);
        {
            let property = test_scenario::take_from_address<Property>(&scenario, OWNER);
            let ctx = ctx(&mut scenario);
            let exact_payment = coin::mint_for_testing<SUI>(PROPERTY_PRICE, ctx);
            
            property::buy_property(property, exact_payment, ctx);
        };

        // Verify successful purchase
        next_tx(&mut scenario, BUYER);
        {
            let property = test_scenario::take_from_sender<Property>(&scenario);
            let (_, _, owner) = property::get_property_info(&property);
            assert!(owner == BUYER, 0);
            test_scenario::return_to_sender(&scenario, property);
        };
        
        test_scenario::end(scenario);
    }
}