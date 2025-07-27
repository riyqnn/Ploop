module ploop_donation::donation {
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::object::{Self, ID, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::dynamic_field as df;

    // ============== Error Codes ==============
    const EInsufficientAmount: u64 = 0;
    const EUnauthorized: u64 = 1;
    const EInvalidInput: u64 = 2;
    const EMessageTooLong: u64 = 3;
    const EProfileNotFound: u64 = 4;

    // ============== Constants ==============
    const MIN_DONATION: u64 = 100000; // 0.0001 SUI minimum
    const MAX_MESSAGE_LENGTH: u64 = 280; // Twitter-like limit
    const MAX_MEDIA_URL_LENGTH: u64 = 500;
    const PLATFORM_FEE_BPS: u16 = 200; // 2% platform fee

    // ============== Core Structs ==============

    /// Platform registry - simple singleton
    public struct Platform has key {
        id: UID,
        total_donations: u64,
        total_donated_amount: u64,
        platform_fee: u16, // basis points
        admin: address,
        treasury: Balance<SUI>,
    }

    /// Simple creator profile - just wallet address based
    public struct CreatorProfile has key {
        id: UID,
        creator: address, // wallet address is the identifier
        display_name: String,
        bio: String,
        avatar_url: String,
        
        // Optional media links
        youtube_url: String,
        tiktok_url: String, 
        twitch_url: String,
        
        // Stats
        total_received: u64,
        donation_count: u64,
        is_active: bool,
        
        // Treasury
        treasury: Balance<SUI>,
        
        // Timestamps
        created_at: u64,
        last_donation_at: u64,
    }

    /// Simple donation record
    public struct Donation has key, store {
        id: UID,
        donor: address,
        creator: address,
        amount: u64,
        message: String,
        is_anonymous: bool,
        timestamp: u64,
        
        // Optional media (voice/video message)
        // Stored as dynamic fields to save gas
    }

    // ============== Events for Real-time Updates ==============
    
    /// Main donation event - this triggers the notification
    public struct DonationReceived has copy, drop {
        donation_id: ID,
        creator: address,
        donor: address,
        amount: u64,
        message: String,
        is_anonymous: bool,
        timestamp: u64,
    }

    public struct CreatorRegistered has copy, drop {
        creator: address,
        display_name: String,
        timestamp: u64,
    }

    public struct CreatorStatusChanged has copy, drop {
        creator: address,
        is_active: bool,
        timestamp: u64,
    }

    // ============== Initialization ==============
    
    fun init(ctx: &mut TxContext) {
        let platform = Platform {
            id: object::new(ctx),
            total_donations: 0,
            total_donated_amount: 0,
            platform_fee: PLATFORM_FEE_BPS,
            admin: tx_context::sender(ctx),
            treasury: balance::zero(),
        };
        transfer::share_object(platform);
    }

    // ============== Test Initialization ==============
    
    /// Initialize platform for testing
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        let platform = Platform {
            id: object::new(ctx),
            total_donations: 0,
            total_donated_amount: 0,
            platform_fee: PLATFORM_FEE_BPS,
            admin: tx_context::sender(ctx),
            treasury: balance::zero(),
        };
        transfer::share_object(platform);
    }

    // ============== Creator Functions ==============
    
    /// Register as creator - simple wallet address based registration
    public fun register_creator(
        display_name: String,
        bio: String,
        avatar_url: String,
        youtube_url: String,
        tiktok_url: String,
        twitch_url: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let creator = tx_context::sender(ctx);
        
        let profile = CreatorProfile {
            id: object::new(ctx),
            creator,
            display_name,
            bio,
            avatar_url,
            youtube_url,
            tiktok_url,
            twitch_url,
            total_received: 0,
            donation_count: 0,
            is_active: true,
            treasury: balance::zero(),
            created_at: clock::timestamp_ms(clock),
            last_donation_at: 0,
        };

        event::emit(CreatorRegistered {
            creator,
            display_name: profile.display_name,
            timestamp: clock::timestamp_ms(clock),
        });

        transfer::share_object(profile);
    }

    /// Update creator profile
    public fun update_profile(
        profile: &mut CreatorProfile,
        mut display_name: Option<String>,
        mut bio: Option<String>,
        mut avatar_url: Option<String>,
        mut youtube_url: Option<String>,
        mut tiktok_url: Option<String>,
        mut twitch_url: Option<String>,
        ctx: &TxContext
    ) {
        assert!(profile.creator == tx_context::sender(ctx), EUnauthorized);
        
        if (option::is_some(&display_name)) {
            profile.display_name = option::extract(&mut display_name);
        };
        if (option::is_some(&bio)) {
            profile.bio = option::extract(&mut bio);
        };
        if (option::is_some(&avatar_url)) {
            profile.avatar_url = option::extract(&mut avatar_url);
        };
        if (option::is_some(&youtube_url)) {
            profile.youtube_url = option::extract(&mut youtube_url);
        };
        if (option::is_some(&tiktok_url)) {
            profile.tiktok_url = option::extract(&mut tiktok_url);
        };
        if (option::is_some(&twitch_url)) {
            profile.twitch_url = option::extract(&mut twitch_url);
        };
    }

    /// Toggle active status (for maintenance mode)
    public fun toggle_active_status(
        profile: &mut CreatorProfile,
        clock: &Clock,
        ctx: &TxContext
    ) {
        assert!(profile.creator == tx_context::sender(ctx), EUnauthorized);
        profile.is_active = !profile.is_active;
        
        event::emit(CreatorStatusChanged {
            creator: profile.creator,
            is_active: profile.is_active,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    // ============== Internal Helper Function ==============
    
    /// Internal helper to create donation with optional media
    fun create_donation_internal(
        platform: &mut Platform,
        creator_profile: &mut CreatorProfile,
        payment: Coin<SUI>,
        message: String,
        media_url: Option<String>,
        media_type: u8, // 0=none, 1=voice, 2=video
        is_anonymous: bool,
        clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        let amount = coin::value(&payment);
        assert!(amount >= MIN_DONATION, EInsufficientAmount);
        assert!(creator_profile.is_active, EProfileNotFound);
        assert!(string::length(&message) <= MAX_MESSAGE_LENGTH, EMessageTooLong);

        // Validate media URL if provided
        if (option::is_some(&media_url)) {
            let url = option::borrow(&media_url);
            assert!(string::length(url) <= MAX_MEDIA_URL_LENGTH, EInvalidInput);
        };

        let donor = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);
        
        // Calculate platform fee
        let platform_fee = (amount * (platform.platform_fee as u64)) / 10000;
        let creator_amount = amount - platform_fee;
        
        // Process payment
        let mut payment_balance = coin::into_balance(payment);
        let fee_balance = balance::split(&mut payment_balance, platform_fee);
        
        // Add to creator treasury
        balance::join(&mut creator_profile.treasury, payment_balance);
        balance::join(&mut platform.treasury, fee_balance);
        
        // Update stats
        creator_profile.total_received = creator_profile.total_received + creator_amount;
        creator_profile.donation_count = creator_profile.donation_count + 1;
        creator_profile.last_donation_at = timestamp;
        
        platform.total_donations = platform.total_donations + 1;
        platform.total_donated_amount = platform.total_donated_amount + amount;

        // Create donation record
        let mut donation = Donation {
            id: object::new(ctx),
            donor,
            creator: creator_profile.creator,
            amount: creator_amount,
            message,
            is_anonymous,
            timestamp,
        };

        // Add media URL as dynamic field if provided
        if (option::is_some(&media_url)) {
            let mut url_option = media_url;
            let url = option::extract(&mut url_option);
            if (media_type == 1) {
                df::add(&mut donation.id, b"voice_url", url);
            } else if (media_type == 2) {
                df::add(&mut donation.id, b"video_url", url);
            };
        };

        let donation_id = object::id(&donation);
        
        // Emit event - this triggers the live notification!
        event::emit(DonationReceived {
            donation_id,
            creator: creator_profile.creator,
            donor,
            amount: creator_amount,
            message: donation.message,
            is_anonymous,
            timestamp,
        });

        transfer::share_object(donation);
        donation_id
    }

    // ============== Main Donation Functions ==============
    
    /// Simple donation - this is the main function!
    public fun donate(
        platform: &mut Platform,
        creator_profile: &mut CreatorProfile,
        payment: Coin<SUI>,
        message: String,
        is_anonymous: bool,
        clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        create_donation_internal(
            platform,
            creator_profile,
            payment,
            message,
            option::none<String>(),
            0, // no media
            is_anonymous,
            clock,
            ctx
        )
    }

    /// Donate with voice message (IPFS URL)
    public fun donate_with_voice(
        platform: &mut Platform,
        creator_profile: &mut CreatorProfile,
        payment: Coin<SUI>,
        message: String,
        voice_url: String, // IPFS or storage URL
        is_anonymous: bool,
        clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        create_donation_internal(
            platform,
            creator_profile,
            payment,
            message,
            option::some(voice_url),
            1, // voice media
            is_anonymous,
            clock,
            ctx
        )
    }

    /// Donate with video message
    public fun donate_with_video(
        platform: &mut Platform,
        creator_profile: &mut CreatorProfile,
        payment: Coin<SUI>,
        message: String,
        video_url: String, // Link to video
        is_anonymous: bool,
        clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        create_donation_internal(
            platform,
            creator_profile,
            payment,
            message,
            option::some(video_url),
            2, // video media
            is_anonymous,
            clock,
            ctx
        )
    }

    /// Donate with media - flexible function
    public fun donate_with_media(
        platform: &mut Platform,
        creator_profile: &mut CreatorProfile,
        payment: Coin<SUI>,
        message: String,
        media_url: Option<String>, // voice or video URL
        media_type: u8, // 0=none, 1=voice, 2=video
        is_anonymous: bool,
        clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        create_donation_internal(
            platform,
            creator_profile,
            payment,
            message,
            media_url,
            media_type,
            is_anonymous,
            clock,
            ctx
        )
    }

    // ============== Withdrawal Functions ==============
    
    /// Withdraw earnings - simple and clean
    public fun withdraw_earnings(
        creator_profile: &mut CreatorProfile,
        amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(creator_profile.creator == tx_context::sender(ctx), EUnauthorized);
        assert!(balance::value(&creator_profile.treasury) >= amount, EInsufficientAmount);
        
        let withdrawn_balance = balance::split(&mut creator_profile.treasury, amount);
        let withdrawn_coin = coin::from_balance(withdrawn_balance, ctx);
        
        transfer::public_transfer(withdrawn_coin, creator_profile.creator);
    }

    /// Withdraw all earnings
    public fun withdraw_all_earnings(
        creator_profile: &mut CreatorProfile,
        ctx: &mut TxContext
    ) {
        assert!(creator_profile.creator == tx_context::sender(ctx), EUnauthorized);
        
        let total_balance = balance::value(&creator_profile.treasury);
        if (total_balance > 0) {
            let all_balance = balance::withdraw_all(&mut creator_profile.treasury);
            let withdrawn_coin = coin::from_balance(all_balance, ctx);
            transfer::public_transfer(withdrawn_coin, creator_profile.creator);
        };
    }

    // ============== View Functions ==============
    
    /// Get creator info
    public fun get_creator_info(profile: &CreatorProfile): (
        address,
        String,
        String,
        String,
        String,
        String,
        String,
        u64,
        u64,
        bool,
        u64,
        u64,
        u64
    ) {
        (
            profile.creator,
            profile.display_name,
            profile.bio,
            profile.avatar_url,
            profile.youtube_url,
            profile.tiktok_url,
            profile.twitch_url,
            profile.total_received,
            profile.donation_count,
            profile.is_active,
            balance::value(&profile.treasury),
            profile.created_at,
            profile.last_donation_at
        )
    }

    /// Get donation info
    public fun get_donation_info(donation: &Donation): (
        address,
        address,
        u64,
        String,
        bool,
        u64
    ) {
        (
            donation.donor,
            donation.creator,
            donation.amount,
            donation.message,
            donation.is_anonymous,
            donation.timestamp
        )
    }

    /// Get platform stats
    public fun get_platform_stats(platform: &Platform): (u64, u64, u16) {
        (
            platform.total_donations,
            platform.total_donated_amount,
            platform.platform_fee
        )
    }

    /// Check if donation has voice message
    public fun has_voice_message(donation: &Donation): bool {
        df::exists_(&donation.id, b"voice_url")
    }

    /// Get voice message URL
    public fun get_voice_url(donation: &Donation): String {
        *df::borrow<vector<u8>, String>(&donation.id, b"voice_url")
    }

    /// Check if donation has video message
    public fun has_video_message(donation: &Donation): bool {
        df::exists_(&donation.id, b"video_url")
    }

    /// Get video message URL
    public fun get_video_url(donation: &Donation): String {
        *df::borrow<vector<u8>, String>(&donation.id, b"video_url")
    }

    // ============== Admin Functions ==============
    
    /// Update platform fee (admin only)
    public fun update_platform_fee(
        platform: &mut Platform,
        new_fee_bps: u16,
        ctx: &TxContext
    ) {
        assert!(platform.admin == tx_context::sender(ctx), EUnauthorized);
        assert!(new_fee_bps <= 1000, EInvalidInput); // Max 10%
        platform.platform_fee = new_fee_bps;
    }

    /// Withdraw platform earnings (admin only)
    public fun withdraw_platform_earnings(
        platform: &mut Platform,
        amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(platform.admin == tx_context::sender(ctx), EUnauthorized);
        assert!(balance::value(&platform.treasury) >= amount, EInsufficientAmount);
        
        let withdrawn_balance = balance::split(&mut platform.treasury, amount);
        let withdrawn_coin = coin::from_balance(withdrawn_balance, ctx);
        
        transfer::public_transfer(withdrawn_coin, platform.admin);
    }
}