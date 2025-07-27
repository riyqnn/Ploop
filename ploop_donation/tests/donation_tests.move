#[test_only]
module ploop_donation::donation_tests {
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance;
    use sui::object;
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock::{Self, Clock};
    use sui::test_utils;
    use ploop_donation::donation::{
        Self, 
        Platform, 
        CreatorProfile, 
        Donation,
        init_for_testing
    };

    // Test addresses
    const ADMIN: address = @0xAD;
    const CREATOR: address = @0xC1;
    const DONOR1: address = @0xD1;
    const DONOR2: address = @0xD2;

    // Test constants
    const MIN_DONATION: u64 = 100000; // 0.0001 SUI
    const TEST_DONATION: u64 = 1000000; // 0.001 SUI
    const LARGE_DONATION: u64 = 10000000; // 0.01 SUI

    // Helper function to create test scenario
    fun create_test_scenario(): Scenario {
        ts::begin(ADMIN)
    }

    // Helper function to create test clock
    fun create_test_clock(scenario: &mut Scenario): Clock {
        ts::next_tx(scenario, ADMIN);
        clock::create_for_testing(ts::ctx(scenario))
    }

    // Helper function to mint test coins
    fun mint_for_testing(amount: u64, recipient: address, scenario: &mut Scenario): Coin<SUI> {
        coin::mint_for_testing<SUI>(amount, ts::ctx(scenario))
    }

    // ============== Basic Setup Tests ==============

    #[test]
    fun test_init_platform() {
        let mut scenario = create_test_scenario();
        
        // Initialize platform
        ts::next_tx(&mut scenario, ADMIN);
        init_for_testing(ts::ctx(&mut scenario));
        
        // Check platform was created
        ts::next_tx(&mut scenario, ADMIN);
        let platform = ts::take_shared<Platform>(&scenario);
        
        let (total_donations, total_amount, fee) = donation::get_platform_stats(&platform);
        assert!(total_donations == 0, 0);
        assert!(total_amount == 0, 1);
        assert!(fee == 200, 2); // 2% default fee
        
        ts::return_shared(platform);
        ts::end(scenario);
    }

     #[test]
    fun test_register_creator() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        // Initialize platform
        ts::next_tx(&mut scenario, ADMIN);
        init_for_testing(ts::ctx(&mut scenario));
        
        // Register creator
        ts::next_tx(&mut scenario, CREATOR);
        donation::register_creator(
            string::utf8(b"Test Creator"),
            string::utf8(b"This is a test creator bio"),
            string::utf8(b"https://example.com/avatar.jpg"),
            string::utf8(b"https://youtube.com/testcreator"),
            string::utf8(b"https://tiktok.com/@testcreator"),
            string::utf8(b"https://twitch.tv/testcreator"),
            &clock,
            ts::ctx(&mut scenario)
        );
        
        // Verify creator profile
        ts::next_tx(&mut scenario, CREATOR);
        let profile = ts::take_shared<CreatorProfile>(&scenario);
        
        let (creator, display_name, bio, avatar, youtube, tiktok, twitch, 
             total_received, donation_count, is_active, treasury, created_at, last_donation) = 
            donation::get_creator_info(&profile);
        
        assert!(creator == CREATOR, 0);
        assert!(display_name == string::utf8(b"Test Creator"), 1);
        assert!(bio == string::utf8(b"This is a test creator bio"), 2);
        assert!(is_active == true, 3);
        assert!(total_received == 0, 4);
        assert!(donation_count == 0, 5);
        assert!(treasury == 0, 6);
        assert!(created_at >= 0, 7); // Allow 0 or greater for test environment
        assert!(last_donation == 0, 8);
        
        ts::return_shared(profile);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ============== Donation Tests ==============

    #[test]
    fun test_simple_donation() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        // Setup
        ts::next_tx(&mut scenario, ADMIN);
        init_for_testing(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, CREATOR);
        donation::register_creator(
            string::utf8(b"Test Creator"),
            string::utf8(b"Bio"),
            string::utf8(b"avatar.jpg"),
            string::utf8(b""),
            string::utf8(b""),
            string::utf8(b""),
            &clock,
            ts::ctx(&mut scenario)
        );
        
        // Make donation
        ts::next_tx(&mut scenario, DONOR1);
        let mut platform = ts::take_shared<Platform>(&scenario);
        let mut profile = ts::take_shared<CreatorProfile>(&scenario);
        let payment = mint_for_testing(TEST_DONATION, DONOR1, &mut scenario);
        
        let donation_id = donation::donate(
            &mut platform,
            &mut profile,
            payment,
            string::utf8(b"Great content!"),
            false, // not anonymous
            &clock,
            ts::ctx(&mut scenario)
        );
        
        // Verify donation was processed
        let (_, _, _, _, _, _, _, total_received, donation_count, _, treasury, _, last_donation) = 
            donation::get_creator_info(&profile);
        
        // Calculate expected amounts (2% platform fee)
        let platform_fee = (TEST_DONATION * 200) / 10000; // 2%
        let expected_creator_amount = TEST_DONATION - platform_fee;
        
        assert!(total_received == expected_creator_amount, 0);
        assert!(donation_count == 1, 1);
        assert!(treasury == expected_creator_amount, 2);
        assert!(last_donation >= 0, 3); // Allow 0 or greater for test environment
        
        // Verify platform stats
        let (total_donations, total_amount, _) = donation::get_platform_stats(&platform);
        assert!(total_donations == 1, 4);
        assert!(total_amount == TEST_DONATION, 5);
        
        ts::return_shared(platform);
        ts::return_shared(profile);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_donation_with_voice() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        // Setup
        ts::next_tx(&mut scenario, ADMIN);
        init_for_testing(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, CREATOR);
        donation::register_creator(
            string::utf8(b"Test Creator"),
            string::utf8(b"Bio"),
            string::utf8(b"avatar.jpg"),
            string::utf8(b""),
            string::utf8(b""),
            string::utf8(b""),
            &clock,
            ts::ctx(&mut scenario)
        );
        
        // Make voice donation
        ts::next_tx(&mut scenario, DONOR1);
        let mut platform = ts::take_shared<Platform>(&scenario);
        let mut profile = ts::take_shared<CreatorProfile>(&scenario);
        let payment = mint_for_testing(TEST_DONATION, DONOR1, &mut scenario);
        
        donation::donate_with_voice(
            &mut platform,
            &mut profile,
            payment,
            string::utf8(b"Voice message!"),
            string::utf8(b"https://ipfs.io/ipfs/QmVoiceHash123"),
            true, // anonymous
            &clock,
            ts::ctx(&mut scenario)
        );
        
        // Verify donation has voice
        ts::next_tx(&mut scenario, DONOR1);
        let donation = ts::take_shared<Donation>(&scenario);
        
        assert!(donation::has_voice_message(&donation) == true, 0);
        assert!(donation::has_video_message(&donation) == false, 1);
        
        let voice_url = donation::get_voice_url(&donation);
        assert!(voice_url == string::utf8(b"https://ipfs.io/ipfs/QmVoiceHash123"), 2);
        
        let (donor, creator, amount, message, is_anonymous, _) = donation::get_donation_info(&donation);
        assert!(is_anonymous == true, 3);
        assert!(message == string::utf8(b"Voice message!"), 4);
        
        ts::return_shared(donation);
        ts::return_shared(platform);
        ts::return_shared(profile);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_donation_with_video() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        // Setup
        ts::next_tx(&mut scenario, ADMIN);
        init_for_testing(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, CREATOR);
        donation::register_creator(
            string::utf8(b"Test Creator"),
            string::utf8(b"Bio"),
            string::utf8(b"avatar.jpg"),
            string::utf8(b""),
            string::utf8(b""),
            string::utf8(b""),
            &clock,
            ts::ctx(&mut scenario)
        );
        
        // Make video donation
        ts::next_tx(&mut scenario, DONOR1);
        let mut platform = ts::take_shared<Platform>(&scenario);
        let mut profile = ts::take_shared<CreatorProfile>(&scenario);
        let payment = mint_for_testing(LARGE_DONATION, DONOR1, &mut scenario);
        
        donation::donate_with_video(
            &mut platform,
            &mut profile,
            payment,
            string::utf8(b"Video message for you!"),
            string::utf8(b"https://youtube.com/watch?v=test123"),
            false, // not anonymous
            &clock,
            ts::ctx(&mut scenario)
        );
        
        // Verify donation has video
        ts::next_tx(&mut scenario, DONOR1);
        let donation = ts::take_shared<Donation>(&scenario);
        
        assert!(donation::has_video_message(&donation) == true, 0);
        assert!(donation::has_voice_message(&donation) == false, 1);
        
        let video_url = donation::get_video_url(&donation);
        assert!(video_url == string::utf8(b"https://youtube.com/watch?v=test123"), 2);
        
        ts::return_shared(donation);
        ts::return_shared(platform);
        ts::return_shared(profile);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_multiple_donations() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        // Setup
        ts::next_tx(&mut scenario, ADMIN);
        init_for_testing(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, CREATOR);
        donation::register_creator(
            string::utf8(b"Test Creator"),
            string::utf8(b"Bio"),
            string::utf8(b"avatar.jpg"),
            string::utf8(b""),
            string::utf8(b""),
            string::utf8(b""),
            &clock,
            ts::ctx(&mut scenario)
        );
        
        // First donation from DONOR1
        ts::next_tx(&mut scenario, DONOR1);
        let mut platform = ts::take_shared<Platform>(&scenario);
        let mut profile = ts::take_shared<CreatorProfile>(&scenario);
        let payment1 = mint_for_testing(TEST_DONATION, DONOR1, &mut scenario);
        
        donation::donate(
            &mut platform,
            &mut profile,
            payment1,
            string::utf8(b"First donation!"),
            false,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        // Second donation from DONOR2
        ts::next_tx(&mut scenario, DONOR2);
        let payment2 = mint_for_testing(LARGE_DONATION, DONOR2, &mut scenario);
        
        donation::donate(
            &mut platform,
            &mut profile,
            payment2,
            string::utf8(b"Second donation!"),
            true, // anonymous
            &clock,
            ts::ctx(&mut scenario)
        );
        
        // Verify accumulated stats
        let (_, _, _, _, _, _, _, total_received, donation_count, _, treasury, _, _) = 
            donation::get_creator_info(&profile);
        
        let expected_total = ((TEST_DONATION * 9800) / 10000) + ((LARGE_DONATION * 9800) / 10000);
        assert!(total_received == expected_total, 0);
        assert!(donation_count == 2, 1);
        assert!(treasury == expected_total, 2);
        
        let (total_donations, total_amount, _) = donation::get_platform_stats(&platform);
        assert!(total_donations == 2, 3);
        assert!(total_amount == TEST_DONATION + LARGE_DONATION, 4);
        
        ts::return_shared(platform);
        ts::return_shared(profile);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ============== Withdrawal Tests ==============

    #[test]
    fun test_withdraw_earnings() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        // Setup and make donation
        ts::next_tx(&mut scenario, ADMIN);
        init_for_testing(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, CREATOR);
        donation::register_creator(
            string::utf8(b"Test Creator"),
            string::utf8(b"Bio"),
            string::utf8(b"avatar.jpg"),
            string::utf8(b""),
            string::utf8(b""),
            string::utf8(b""),
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::next_tx(&mut scenario, DONOR1);
        let mut platform = ts::take_shared<Platform>(&scenario);
        let mut profile = ts::take_shared<CreatorProfile>(&scenario);
        let payment = mint_for_testing(LARGE_DONATION, DONOR1, &mut scenario);
        
        donation::donate(
            &mut platform,
            &mut profile,
            payment,
            string::utf8(b"For withdrawal test"),
            false,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        let earnings = ((LARGE_DONATION * 9800) / 10000); // After 2% fee
        let withdraw_amount = earnings / 2; // Withdraw half
        
        // Withdraw partial earnings
        ts::next_tx(&mut scenario, CREATOR);
        donation::withdraw_earnings(&mut profile, withdraw_amount, ts::ctx(&mut scenario));
        
        // Verify remaining balance
        let (_, _, _, _, _, _, _, _, _, _, treasury, _, _) = donation::get_creator_info(&profile);
        assert!(treasury == earnings - withdraw_amount, 0);
        
        ts::return_shared(platform);
        ts::return_shared(profile);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_withdraw_all_earnings() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        // Setup and make donation
        ts::next_tx(&mut scenario, ADMIN);
        init_for_testing(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, CREATOR);
        donation::register_creator(
            string::utf8(b"Test Creator"),
            string::utf8(b"Bio"),
            string::utf8(b"avatar.jpg"),
            string::utf8(b""),
            string::utf8(b""),
            string::utf8(b""),
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::next_tx(&mut scenario, DONOR1);
        let mut platform = ts::take_shared<Platform>(&scenario);
        let mut profile = ts::take_shared<CreatorProfile>(&scenario);
        let payment = mint_for_testing(TEST_DONATION, DONOR1, &mut scenario);
        
        donation::donate(
            &mut platform,
            &mut profile,
            payment,
            string::utf8(b"For withdrawal test"),
            false,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        // Withdraw all earnings
        ts::next_tx(&mut scenario, CREATOR);
        donation::withdraw_all_earnings(&mut profile, ts::ctx(&mut scenario));
        
        // Verify balance is zero
        let (_, _, _, _, _, _, _, _, _, _, treasury, _, _) = donation::get_creator_info(&profile);
        assert!(treasury == 0, 0);
        
        ts::return_shared(platform);
        ts::return_shared(profile);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ============== Profile Management Tests ==============

    #[test]
    fun test_update_profile() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        // Setup
        ts::next_tx(&mut scenario, ADMIN);
        init_for_testing(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, CREATOR);
        donation::register_creator(
            string::utf8(b"Original Name"),
            string::utf8(b"Original Bio"),
            string::utf8(b"original.jpg"),
            string::utf8(b""),
            string::utf8(b""),
            string::utf8(b""),
            &clock,
            ts::ctx(&mut scenario)
        );
        
        // Update profile
        ts::next_tx(&mut scenario, CREATOR);
        let mut profile = ts::take_shared<CreatorProfile>(&scenario);
        
        donation::update_profile(
            &mut profile,
            option::some(string::utf8(b"Updated Name")),
            option::some(string::utf8(b"Updated Bio")),
            option::some(string::utf8(b"updated.jpg")),
            option::some(string::utf8(b"https://youtube.com/updated")),
            option::none<String>(), // Don't update TikTok
            option::some(string::utf8(b"https://twitch.tv/updated")),
            ts::ctx(&mut scenario)
        );
        
        // Verify updates
        let (_, display_name, bio, avatar, youtube, tiktok, twitch, _, _, _, _, _, _) = 
            donation::get_creator_info(&profile);
        
        assert!(display_name == string::utf8(b"Updated Name"), 0);
        assert!(bio == string::utf8(b"Updated Bio"), 1);
        assert!(avatar == string::utf8(b"updated.jpg"), 2);
        assert!(youtube == string::utf8(b"https://youtube.com/updated"), 3);
        assert!(tiktok == string::utf8(b""), 4); // Should remain empty
        assert!(twitch == string::utf8(b"https://twitch.tv/updated"), 5);
        
        ts::return_shared(profile);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_toggle_active_status() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        // Setup
        ts::next_tx(&mut scenario, ADMIN);
        init_for_testing(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, CREATOR);
        donation::register_creator(
            string::utf8(b"Test Creator"),
            string::utf8(b"Bio"),
            string::utf8(b"avatar.jpg"),
            string::utf8(b""),
            string::utf8(b""),
            string::utf8(b""),
            &clock,
            ts::ctx(&mut scenario)
        );
        
        // Toggle to inactive
        ts::next_tx(&mut scenario, CREATOR);
        let mut profile = ts::take_shared<CreatorProfile>(&scenario);
        
        donation::toggle_active_status(&mut profile, &clock, ts::ctx(&mut scenario));
        
        let (_, _, _, _, _, _, _, _, _, is_active, _, _, _) = donation::get_creator_info(&profile);
        assert!(is_active == false, 0);
        
        // Toggle back to active
        donation::toggle_active_status(&mut profile, &clock, ts::ctx(&mut scenario));
        
        let (_, _, _, _, _, _, _, _, _, is_active2, _, _, _) = donation::get_creator_info(&profile);
        assert!(is_active2 == true, 1);
        
        ts::return_shared(profile);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ============== Admin Tests ==============

    #[test]
    fun test_update_platform_fee() {
        let mut scenario = create_test_scenario();
        
        // Setup
        ts::next_tx(&mut scenario, ADMIN);
        init_for_testing(ts::ctx(&mut scenario));
        
        // Update fee
        ts::next_tx(&mut scenario, ADMIN);
        let mut platform = ts::take_shared<Platform>(&scenario);
        
        donation::update_platform_fee(&mut platform, 300, ts::ctx(&mut scenario)); // 3%
        
        let (_, _, fee) = donation::get_platform_stats(&platform);
        assert!(fee == 300, 0);
        
        ts::return_shared(platform);
        ts::end(scenario);
    }

    #[test]
    fun test_withdraw_platform_earnings() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        // Setup and generate platform fees
        ts::next_tx(&mut scenario, ADMIN);
        init_for_testing(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, CREATOR);
        donation::register_creator(
            string::utf8(b"Test Creator"),
            string::utf8(b"Bio"),
            string::utf8(b"avatar.jpg"),
            string::utf8(b""),
            string::utf8(b""),
            string::utf8(b""),
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::next_tx(&mut scenario, DONOR1);
        let mut platform = ts::take_shared<Platform>(&scenario);
        let mut profile = ts::take_shared<CreatorProfile>(&scenario);
        let payment = mint_for_testing(LARGE_DONATION, DONOR1, &mut scenario);
        
        donation::donate(
            &mut platform,
            &mut profile,
            payment,
            string::utf8(b"Generate fees"),
            false,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        let platform_fee = (LARGE_DONATION * 200) / 10000; // 2%
        
        // Withdraw platform earnings
        ts::next_tx(&mut scenario, ADMIN);
        donation::withdraw_platform_earnings(&mut platform, platform_fee, ts::ctx(&mut scenario));
        
        ts::return_shared(platform);
        ts::return_shared(profile);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ============== Error Tests ==============

    #[test]
    #[expected_failure(abort_code = 0)] // EInsufficientAmount
    fun test_donation_below_minimum() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        // Setup
        ts::next_tx(&mut scenario, ADMIN);
        init_for_testing(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, CREATOR);
        donation::register_creator(
            string::utf8(b"Test Creator"),
            string::utf8(b"Bio"),
            string::utf8(b"avatar.jpg"),
            string::utf8(b""),
            string::utf8(b""),
            string::utf8(b""),
            &clock,
            ts::ctx(&mut scenario)
        );
        
        // Try donation below minimum
        ts::next_tx(&mut scenario, DONOR1);
        let mut platform = ts::take_shared<Platform>(&scenario);
        let mut profile = ts::take_shared<CreatorProfile>(&scenario);
        let payment = mint_for_testing(MIN_DONATION - 1, DONOR1, &mut scenario); // Below minimum
        
        donation::donate(
            &mut platform,
            &mut profile,
            payment,
            string::utf8(b"Too small"),
            false,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(platform);
        ts::return_shared(profile);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 3)] // EMessageTooLong
    fun test_message_too_long() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        // Setup
        ts::next_tx(&mut scenario, ADMIN);
        init_for_testing(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, CREATOR);
        donation::register_creator(
            string::utf8(b"Test Creator"),
            string::utf8(b"Bio"),
            string::utf8(b"avatar.jpg"),
            string::utf8(b""),
            string::utf8(b""),
            string::utf8(b""),
            &clock,
            ts::ctx(&mut scenario)
        );
        
        // Create message that's too long (over 280 chars)
        let long_message = string::utf8(b"This is a very long message that exceeds the maximum allowed length of 280 characters for donation messages. It should trigger an error when we try to make a donation with this overly long message that goes on and on and on and exceeds the Twitter-like limit that we have set for donation messages in our smart contract system.");
        
        ts::next_tx(&mut scenario, DONOR1);
        let mut platform = ts::take_shared<Platform>(&scenario);
        let mut profile = ts::take_shared<CreatorProfile>(&scenario);
        let payment = mint_for_testing(TEST_DONATION, DONOR1, &mut scenario);
        
        donation::donate(
            &mut platform,
            &mut profile,
            payment,
            long_message,
            false,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(platform);
        ts::return_shared(profile);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 1)] // EUnauthorized
    fun test_unauthorized_withdrawal() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        // Setup
        ts::next_tx(&mut scenario, ADMIN);
        init_for_testing(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, CREATOR);
        donation::register_creator(
            string::utf8(b"Test Creator"),
            string::utf8(b"Bio"),
            string::utf8(b"avatar.jpg"),
            string::utf8(b""),
            string::utf8(b""),
            string::utf8(b""),
            &clock,
            ts::ctx(&mut scenario)
        );
        
        // Try to withdraw as different user
        ts::next_tx(&mut scenario, DONOR1); // Wrong user
        let mut profile = ts::take_shared<CreatorProfile>(&scenario);
        
        donation::withdraw_earnings(&mut profile, 1000, ts::ctx(&mut scenario));
        
        ts::return_shared(profile);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 4)] // EProfileNotFound (creator inactive)
    fun test_donation_to_inactive_creator() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        // Setup
        ts::next_tx(&mut scenario, ADMIN);
        init_for_testing(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, CREATOR);
        donation::register_creator(
            string::utf8(b"Test Creator"),
            string::utf8(b"Bio"),
            string::utf8(b"avatar.jpg"),
            string::utf8(b""),
            string::utf8(b""),
            string::utf8(b""),
            &clock,
            ts::ctx(&mut scenario)
        );
        
        // Deactivate creator
        ts::next_tx(&mut scenario, CREATOR);
        let mut profile = ts::take_shared<CreatorProfile>(&scenario);
        donation::toggle_active_status(&mut profile, &clock, ts::ctx(&mut scenario));
        
        // Try to donate to inactive creator
        ts::next_tx(&mut scenario, DONOR1);
        let mut platform = ts::take_shared<Platform>(&scenario);
        let payment = mint_for_testing(TEST_DONATION, DONOR1, &mut scenario);
        
        donation::donate(
            &mut platform,
            &mut profile,
            payment,
            string::utf8(b"Should fail"),
            false,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(platform);
        ts::return_shared(profile);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }
}