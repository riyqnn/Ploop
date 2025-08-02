#[test_only]
module ploop_donation::property_tests {
    use sui::test_scenario::{Self, Scenario, next_tx, ctx};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::test_utils;
    use std::string::{Self, String};
    use ploop_donation::property::{Self, Property, PropertyRegistered, PropertySold};

    // Test addresses
    const OWNER: address = @0xA;
    const BUYER: address = @0xB;
    const INVALID_BUYER: address = @0xC;

    // Test constants
    const PROPERTY_PRICE: u64 = 1_000_000_000; // 1 SUI in MIST
    const INSUFFICIENT_PAYMENT: u64 = 500_000_000; // 0.5 SUI in MIST
    const SUFFICIENT_PAYMENT: u64 = 1_500_000_000; // 1.5 SUI in MIST

    // Helper function to create string from bytes
    fun utf8(bytes: vector<u8>): String {
        string::utf8(bytes)
    }

    #[test]
    fun test_register_property_success() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Register a new property
        next_tx(&mut scenario, OWNER);
        {
            let ctx = ctx(&mut scenario);
            property::register_property(
                utf8(b"37.7749"), // latitude
                utf8(b"122.4194"), // longitude
                utf8(b"Beautiful House"), // name
                utf8(b"123 Main Street, Jakarta"), // address
                utf8(b"+62812345678"), // whatsapp_contact
                0, // property_type: House
                0, // status: ForSale
                PROPERTY_PRICE, // price
                150, // building_area
                200, // land_area
                0, // certificate: SHM
                utf8(b""), // other_certificate
                vector[utf8(b"https://example.com/image1.jpg"), utf8(b"https://example.com/image2.jpg")], // image_urls
                utf8(b"https://example.com/document.pdf"), // document_url
                ctx
            );
        };

        // Check if property was created and transferred to owner
        next_tx(&mut scenario, OWNER);
        {
            let property = test_scenario::take_from_sender<Property>(&scenario);
            let (name, price, owner) = property::get_property_info(&property);
            
            assert!(name == utf8(b"Beautiful House"), 0);
            assert!(price == PROPERTY_PRICE, 1);
            assert!(owner == OWNER, 2);
            
            let (latitude, longitude) = property::get_location(&property);
            assert!(latitude == utf8(b"37.7749"), 3);
            assert!(longitude == utf8(b"122.4194"), 4);
            
            let (building_area, land_area, certificate) = property::get_details(&property);
            assert!(building_area == 150, 5);
            assert!(land_area == 200, 6);

            let (whatsapp, address) = property::get_contact_info(&property);
            assert!(whatsapp == utf8(b"+62812345678"), 7);
            assert!(address == utf8(b"123 Main Street, Jakarta"), 8);

            let (images, doc_url) = property::get_images_and_docs(&property);
            assert!(vector::length(&images) == 2, 9);
            assert!(doc_url == utf8(b"https://example.com/document.pdf"), 10);
            
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
            let mut images = vector::empty<String>();
            let mut i = 0;
            while (i < 11) {
                vector::push_back(&mut images, utf8(b"https://example.com/image.jpg"));
                i = i + 1;
            };
            
            property::register_property(
                utf8(b"37.7749"),
                utf8(b"122.4194"),
                utf8(b"Test House"),
                utf8(b"Test Address"),
                utf8(b"+62812345678"),
                0, // House
                0, // ForSale
                PROPERTY_PRICE,
                150,
                200,
                0, // SHM
                utf8(b""),
                images, // 11 images - should fail
                utf8(b"https://example.com/doc.pdf"),
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
                utf8(b"37.7749"),
                utf8(b"122.4194"),
                utf8(b"Test House"),
                utf8(b"Test Address"),
                utf8(b"+62812345678"),
                5, // Invalid type (only 0-4 are valid)
                0, // ForSale
                PROPERTY_PRICE,
                150,
                200,
                0, // SHM
                utf8(b""),
                vector[utf8(b"https://example.com/image.jpg")],
                utf8(b"https://example.com/doc.pdf"),
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
                utf8(b"37.7749"),
                utf8(b"122.4194"),
                utf8(b"Test House"),
                utf8(b"Test Address"),
                utf8(b"+62812345678"),
                0, // House
                2, // Invalid status (only 0-1 are valid)
                PROPERTY_PRICE,
                150,
                200,
                0, // SHM
                utf8(b""),
                vector[utf8(b"https://example.com/image.jpg")],
                utf8(b"https://example.com/doc.pdf"),
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
                utf8(b"37.7749"),
                utf8(b"122.4194"),
                utf8(b"Test House"),
                utf8(b"Test Address"),
                utf8(b"+62812345678"),
                0, // House
                0, // ForSale
                PROPERTY_PRICE,
                150,
                200,
                3, // Invalid certificate type (only 0-2 are valid)
                utf8(b""),
                vector[utf8(b"https://example.com/image.jpg")],
                utf8(b"https://example.com/doc.pdf"),
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
                utf8(b"37.7749"),
                utf8(b"122.4194"),
                utf8(b"House for Sale"),
                utf8(b"456 Sale Street"),
                utf8(b"+62812345678"),
                0, // House
                0, // ForSale
                PROPERTY_PRICE,
                120,
                180,
                0, // SHM
                utf8(b""),
                vector[utf8(b"https://example.com/image.jpg")],
                utf8(b"https://example.com/doc.pdf"),
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
                utf8(b"37.7749"),
                utf8(b"122.4194"),
                utf8(b"Expensive House"),
                utf8(b"789 Expensive Ave"),
                utf8(b"+62812345678"),
                0, // House
                0, // ForSale
                PROPERTY_PRICE,
                200,
                300,
                0, // SHM
                utf8(b""),
                vector[utf8(b"https://example.com/image.jpg")],
                utf8(b"https://example.com/doc.pdf"),
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
        let property_types = vector[0u8, 1u8, 2u8, 3u8, 4u8]; // House, Apartment, Shop, Boarding, Warehouse
        let mut i = 0;
        
        while (i < vector::length(&property_types)) {
            let property_type = *vector::borrow(&property_types, i);
            
            next_tx(&mut scenario, OWNER);
            {
                let ctx = ctx(&mut scenario);
                property::register_property(
                    utf8(b"37.7749"),
                    utf8(b"122.4194"),
                    utf8(b"Test Property"),
                    utf8(b"Test Address"),
                    utf8(b"+62812345678"),
                    property_type,
                    0, // ForSale
                    PROPERTY_PRICE,
                    100,
                    150,
                    0, // SHM
                    utf8(b""),
                    vector[utf8(b"https://example.com/image.jpg")],
                    utf8(b"https://example.com/doc.pdf"),
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
        let certificate_types = vector[0u8, 1u8, 2u8]; // SHM, SHGB, Other
        let mut i = 0;
        
        while (i < vector::length(&certificate_types)) {
            let cert_type = *vector::borrow(&certificate_types, i);
            
            next_tx(&mut scenario, OWNER);
            {
                let ctx = ctx(&mut scenario);
                property::register_property(
                    utf8(b"37.7749"),
                    utf8(b"122.4194"),
                    utf8(b"Test Property"),
                    utf8(b"Test Address"),
                    utf8(b"+62812345678"),
                    0, // House
                    0, // ForSale
                    PROPERTY_PRICE,
                    100,
                    150,
                    cert_type,
                    if (cert_type == 2) utf8(b"Custom Certificate") else utf8(b""),
                    vector[utf8(b"https://example.com/image.jpg")],
                    utf8(b"https://example.com/doc.pdf"),
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
                utf8(b"37.7749"),
                utf8(b"122.4194"),
                utf8(b"Rental House"),
                utf8(b"123 Rental St"),
                utf8(b"+62812345678"),
                0, // House
                1, // ForRent
                PROPERTY_PRICE,
                80,
                100,
                1, // SHGB
                utf8(b""),
                vector[utf8(b"https://example.com/image.jpg")],
                utf8(b"https://example.com/doc.pdf"),
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
                utf8(b"1.234567"),
                utf8(b"103.654321"),
                utf8(b"Test Villa"),
                utf8(b"Prime Location"),
                utf8(b"+6281234567890"),
                1, // Apartment
                0, // ForSale
                2_000_000_000, // 2 SUI
                300,
                500,
                1, // SHGB
                utf8(b""),
                vector[
                    utf8(b"https://example.com/img1.jpg"),
                    utf8(b"https://example.com/img2.jpg"),
                    utf8(b"https://example.com/img3.jpg")
                ],
                utf8(b"https://example.com/certificate.pdf"),
                ctx
            );
        };

        // Test all view functions
        next_tx(&mut scenario, OWNER);
        {
            let property = test_scenario::take_from_sender<Property>(&scenario);
            
            // Test get_property_info
            let (name, price, owner) = property::get_property_info(&property);
            assert!(name == utf8(b"Test Villa"), 0);
            assert!(price == 2_000_000_000, 1);
            assert!(owner == OWNER, 2);
            
            // Test get_location
            let (lat, lng) = property::get_location(&property);
            assert!(lat == utf8(b"1.234567"), 3);
            assert!(lng == utf8(b"103.654321"), 4);
            
            // Test get_details
            let (building_area, land_area, _certificate) = property::get_details(&property);
            assert!(building_area == 300, 5);
            assert!(land_area == 500, 6);

            // Test get_contact_info
            let (whatsapp, address) = property::get_contact_info(&property);
            assert!(whatsapp == utf8(b"+6281234567890"), 7);
            assert!(address == utf8(b"Prime Location"), 8);

            // Test get_images_and_docs
            let (images, doc_url) = property::get_images_and_docs(&property);
            assert!(vector::length(&images) == 3, 9);
            assert!(doc_url == utf8(b"https://example.com/certificate.pdf"), 10);
            
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
                utf8(b"37.7749"),
                utf8(b"122.4194"),
                utf8(b"Exact Price House"),
                utf8(b"123 Exact St"),
                utf8(b"+62812345678"),
                0, // House
                0, // ForSale
                PROPERTY_PRICE,
                150,
                200,
                0, // SHM
                utf8(b""),
                vector[utf8(b"https://example.com/image.jpg")],
                utf8(b"https://example.com/doc.pdf"),
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

    #[test]
    fun test_string_data_integrity() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Register property with complex string data
        next_tx(&mut scenario, OWNER);
        {
            let ctx = ctx(&mut scenario);
            property::register_property(
                utf8(b"-6.200000"), // negative latitude
                utf8(b"106.816666"), // longitude Jakarta
                utf8(b"Villa Mewah Jakarta Selatan"), // Indonesian property name
                utf8(b"Jalan Sudirman No. 123, Jakarta Selatan, DKI Jakarta 12190"), // full address
                utf8(b"+62-21-1234-5678"), // formatted phone
                2, // Shop
                0, // ForSale
                5_000_000_000, // 5 SUI
                250,
                400,
                2, // Other certificate
                utf8(b"Sertifikat Hak Milik Khusus"), // custom certificate in Indonesian
                vector[
                    utf8(b"https://cdn.example.com/property/front-view.jpg"),
                    utf8(b"https://cdn.example.com/property/interior-1.jpg"),
                    utf8(b"https://cdn.example.com/property/interior-2.jpg"),
                    utf8(b"https://cdn.example.com/property/backyard.jpg")
                ],
                utf8(b"https://docs.example.com/property-certificate-123.pdf"),
                ctx
            );
        };

        // Verify all string data is preserved correctly
        next_tx(&mut scenario, OWNER);
        {
            let property = test_scenario::take_from_sender<Property>(&scenario);
            
            let (name, price, owner) = property::get_property_info(&property);
            assert!(name == utf8(b"Villa Mewah Jakarta Selatan"), 0);
            assert!(price == 5_000_000_000, 1);
            assert!(owner == OWNER, 2);
            
            let (lat, lng) = property::get_location(&property);
            assert!(lat == utf8(b"-6.200000"), 3);
            assert!(lng == utf8(b"106.816666"), 4);
            
            let (whatsapp, address) = property::get_contact_info(&property);
            assert!(whatsapp == utf8(b"+62-21-1234-5678"), 5);
            assert!(address == utf8(b"Jalan Sudirman No. 123, Jakarta Selatan, DKI Jakarta 12190"), 6);
            
            let (images, doc_url) = property::get_images_and_docs(&property);
            assert!(vector::length(&images) == 4, 7);
            assert!(doc_url == utf8(b"https://docs.example.com/property-certificate-123.pdf"), 8);
            
            test_scenario::return_to_sender(&scenario, property);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_empty_string_fields() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Register property with some empty string fields
        next_tx(&mut scenario, OWNER);
        {
            let ctx = ctx(&mut scenario);
            property::register_property(
                utf8(b"0.0"), // minimal coordinate
                utf8(b"0.0"), // minimal coordinate
                utf8(b"Minimal Property"), // basic name
                utf8(b"Address"), // basic address
                utf8(b""), // empty whatsapp
                0, // House
                0, // ForSale
                1_000_000_000,
                1, // minimal building area
                1, // minimal land area
                0, // SHM
                utf8(b""), // empty other certificate
                vector[], // no images
                utf8(b""), // empty document url
                ctx
            );
        };

        // Verify property was created successfully with empty fields
        next_tx(&mut scenario, OWNER);
        {
            let property = test_scenario::take_from_sender<Property>(&scenario);
            
            let (name, _, _) = property::get_property_info(&property);
            assert!(name == utf8(b"Minimal Property"), 0);
            
            let (whatsapp, _) = property::get_contact_info(&property);
            assert!(whatsapp == utf8(b""), 1); // empty string should work
            
            let (images, doc_url) = property::get_images_and_docs(&property);
            assert!(vector::length(&images) == 0, 2); // empty vector should work
            assert!(doc_url == utf8(b""), 3); // empty string should work
            
            test_scenario::return_to_sender(&scenario, property);
        };
        
        test_scenario::end(scenario);
    }
}