using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Models;

namespace PickNBook.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        // =============================
        // DbSets
        // =============================
        public DbSet<User> Users { get; set; }
        public DbSet<OTP> OTPs { get; set; }
        public DbSet<CheapestFlight> CheapestFlights { get; set; }
        public DbSet<FeaturedOffer> FeaturedOffers { get; set; }
        public DbSet<CouponRedemption> CouponRedemptions { get; set; }
        public DbSet<OfferSubscriber> OfferSubscribers { get; set; }
        public DbSet<BlogPost> BlogPosts { get; set; }
        public DbSet<FlightBooking> FlightBookings => Set<FlightBooking>();
        public DbSet<FlightClassInventory> FlightClassInventories => Set<FlightClassInventory>();
        public DbSet<BusBooking> BusBookings => Set<BusBooking>();
        public DbSet<FlightReservation> FlightReservations => Set<FlightReservation>();
        public DbSet<BusReservation> BusReservations => Set<BusReservation>();
        public DbSet<BusReservationPassenger> BusReservationPassengers => Set<BusReservationPassenger>();
        public DbSet<FlightReservationPassenger> FlightReservationPassengers => Set<FlightReservationPassenger>();
        public DbSet<Traveler> Travelers => Set<Traveler>();
        public DbSet<FlightRouteStat> FlightRouteStats => Set<FlightRouteStat>();
        public DbSet<BusRouteStat> BusRouteStats => Set<BusRouteStat>();
        public DbSet<FlightSeat> FlightSeats => Set<FlightSeat>();
        public DbSet<BusSeat> BusSeats => Set<BusSeat>();
        public DbSet<BusDiscount> BusDiscounts => Set<BusDiscount>();
        public DbSet<BusCoupon> BusCoupons => Set<BusCoupon>();
        public DbSet<BusCouponUsage> BusCouponUsages => Set<BusCouponUsage>();
        public DbSet<BusConvenienceFee> BusConvenienceFees => Set<BusConvenienceFee>();
        public DbSet<BusSearchLog> BusSearchLogs => Set<BusSearchLog>();
        public DbSet<BusMarkupSetting> BusMarkupSettings => Set<BusMarkupSetting>();

        public DbSet<BusGstSetting> BusGstSettings => Set<BusGstSetting>();
        public DbSet<FlightDiscount> FlightDiscounts => Set<FlightDiscount>();
        public DbSet<FlightRemark> FlightRemarks => Set<FlightRemark>();
        public DbSet<FlightCoupon> FlightCoupons => Set<FlightCoupon>();
        public DbSet<FlightCouponUsage> FlightCouponUsages => Set<FlightCouponUsage>();
        public DbSet<FlightConvenienceFee> FlightConvenienceFees => Set<FlightConvenienceFee>();
        public DbSet<FlightSearchLog> FlightSearchLogs => Set<FlightSearchLog>();
        public DbSet<PendingAirline> PendingAirlines => Set<PendingAirline>();
        public DbSet<Airline> Airlines => Set<Airline>();
        public DbSet<AirlineWebcheckLink> AirlineWebcheckLinks => Set<AirlineWebcheckLink>();
        public DbSet<PopularDestination> PopularDestinations => Set<PopularDestination>();
        public DbSet<FlightCancellationRequest> FlightCancellationRequests => Set<FlightCancellationRequest>();
        public DbSet<FlightAmendmentRequest> FlightAmendmentRequests => Set<FlightAmendmentRequest>();
        public DbSet<BusPromotion> BusPromotions => Set<BusPromotion>();
        public DbSet<HotelReservation> HotelReservations => Set<HotelReservation>();

        public DbSet<BusPromotionCondition> BusPromotionConditions => Set<BusPromotionCondition>();

        public DbSet<BusPromotionUsage> BusPromotionUsages => Set<BusPromotionUsage>();

        public DbSet<FeaturedOfferCondition> FeaturedOfferConditions => Set<FeaturedOfferCondition>();

        public DbSet<FeaturedOfferUsage> FeaturedOfferUsages => Set<FeaturedOfferUsage>();

        public DbSet<BusDiscountCondition> BusDiscountConditions => Set<BusDiscountCondition>();

        public DbSet<FlightPromotion> FlightPromotions => Set<FlightPromotion>();
        public DbSet<FlightPromotionCondition> FlightPromotionConditions => Set<FlightPromotionCondition>();
        public DbSet<FlightPromotionUsage> FlightPromotionUsages => Set<FlightPromotionUsage>();
        public DbSet<FlightMarkupRule> FlightMarkupRules => Set<FlightMarkupRule>();
        public DbSet<FlightConvenienceFeeRule> FlightConvenienceFeeRules => Set<FlightConvenienceFeeRule>();
        public DbSet<FlightDiscountCondition> FlightDiscountConditions => Set<FlightDiscountCondition>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<BusPromotion>()
                .ToTable("buspromotions");

            modelBuilder.Entity<BusPromotionCondition>()
                .ToTable("buspromotionconditions");

            modelBuilder.Entity<BusPromotionUsage>()
                .ToTable("buspromotionusages");

            modelBuilder.Entity<BusDiscountCondition>()
                .ToTable("busdiscountconditions");

            modelBuilder.Entity<FlightDiscountCondition>()
                .ToTable("flightdiscountconditions");

            // =============================
            // TABLE NAME MAPPING
            // =============================
            modelBuilder.Entity<User>().ToTable("users");
            modelBuilder.Entity<OTP>().ToTable("otps");
            modelBuilder.Entity<CheapestFlight>().ToTable("cheapestflights");
            modelBuilder.Entity<FeaturedOffer>().ToTable("featuredoffers");
            modelBuilder.Entity<CouponRedemption>().ToTable("couponredemptions");
            modelBuilder.Entity<OfferSubscriber>().ToTable("offersubscribers");
            modelBuilder.Entity<BlogPost>().ToTable("blogposts");

            // =============================
            // User Configuration
            // =============================
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<User>()
                .Property(u => u.Role)
                .HasMaxLength(20)
                .HasDefaultValue(AuthRoles.User);

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Role);

            // =============================
            // OTP Configuration
            // =============================
            modelBuilder.Entity<OTP>()
                .HasOne(o => o.User)
                .WithMany()
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<OTP>()
                .Property(o => o.Purpose)
                .HasMaxLength(50);

            modelBuilder.Entity<OTP>()
                .Property(o => o.ChallengeId)
                .HasMaxLength(64);

            modelBuilder.Entity<OTP>()
                .HasIndex(o => new { o.UserId, o.Purpose, o.IsUsed, o.Expiry });

            modelBuilder.Entity<OTP>()
                .HasIndex(o => o.ChallengeId);

            // =============================
            // CheapestFlight Configuration
            // =============================
            modelBuilder.Entity<CheapestFlight>()
                .HasIndex(x => new { x.Origin, x.Destination, x.RecordedAt });

            modelBuilder.Entity<CheapestFlight>()
                .Property(x => x.Price)
                .HasPrecision(18, 2);

            modelBuilder.Entity<CheapestFlight>().Property(x => x.DepartureDate);
            modelBuilder.Entity<CheapestFlight>().Property(x => x.ArrivalDate);
            modelBuilder.Entity<CheapestFlight>().Property(x => x.RecordedAt);

            // =============================
            // FeaturedOffer Configuration
            // =============================
            modelBuilder.Entity<FeaturedOffer>(entity =>
            {
                entity.Property(x => x.DiscountValue).HasPrecision(10, 2);
                entity.Property(x => x.MaxDiscountAmount).HasPrecision(10, 2);
                entity.Property(x => x.MinBookingAmount).HasPrecision(10, 2);

                entity.HasMany(x => x.Usages)
                    .WithOne(x => x.FeaturedOffer)
                    .HasForeignKey(x => x.FeaturedOfferId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // =============================
            // FeaturedOfferUsage Configuration
            // =============================
            modelBuilder.Entity<FeaturedOfferUsage>(entity =>
            {
                entity.ToTable("featuredofferusages");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.UserId).HasMaxLength(50).IsRequired();
                entity.Property(x => x.DiscountAmount).HasPrecision(10, 2);

                entity.HasOne(x => x.BusReservation)
                    .WithMany()
                    .HasForeignKey(x => x.BusReservationId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // =============================
            // FeaturedOfferCondition Configuration
            // =============================
            modelBuilder.Entity<FeaturedOfferCondition>(entity =>
            {
                entity.ToTable("featuredofferconditions");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.ConditionType).HasMaxLength(50).IsRequired();
                entity.Property(x => x.Value1).HasMaxLength(200).IsRequired();
                entity.Property(x => x.Value2).HasMaxLength(200);
                entity.HasOne(x => x.FeaturedOffer)
                    .WithMany(x => x.Conditions)
                    .HasForeignKey(x => x.FeaturedOfferId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // =============================
            // BusPromotionUsage Configuration
            // =============================
            modelBuilder.Entity<BusPromotionUsage>(entity =>
            {
                entity.ToTable("buspromotionusages");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.UserId).HasMaxLength(50).IsRequired();
                entity.Property(x => x.PromotionCode).HasMaxLength(40).IsRequired();
                entity.Property(x => x.PromotionType).HasMaxLength(20).IsRequired();
                entity.Property(x => x.BookingStatus).HasMaxLength(20).IsRequired();
                entity.Property(x => x.DiscountAmountInr).HasPrecision(10, 2);
                entity.Property(x => x.BookingTotalInr).HasPrecision(10, 2);

                entity.HasOne(x => x.Promotion)
                    .WithMany()
                    .HasForeignKey(x => x.BusPromotionId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.BusReservation)
                    .WithMany()
                    .HasForeignKey(x => x.BusReservationId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // =============================
            // CouponRedemption Configuration
            // =============================
            modelBuilder.Entity<CouponRedemption>()
                .Property(x => x.OriginalPrice)
                .HasPrecision(18, 2);

            modelBuilder.Entity<CouponRedemption>()
                .Property(x => x.DiscountAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<CouponRedemption>()
                .Property(x => x.FinalPrice)
                .HasPrecision(18, 2);

            modelBuilder.Entity<CouponRedemption>().Property(x => x.RedeemedAtUtc);

            modelBuilder.Entity<CouponRedemption>()
                .HasIndex(x => new { x.OfferCode, x.CouponCode, x.RedeemedAtUtc });

            modelBuilder.Entity<CouponRedemption>()
                .HasOne(x => x.FeaturedOffer)
                .WithMany()
                .HasForeignKey(x => x.FeaturedOfferId)
                .OnDelete(DeleteBehavior.Cascade);

            // =============================
            // OfferSubscriber Configuration
            // =============================
            modelBuilder.Entity<OfferSubscriber>()
                .HasIndex(x => x.Email)
                .IsUnique();

            modelBuilder.Entity<OfferSubscriber>().Property(x => x.SubscribedAtUtc);
            modelBuilder.Entity<OfferSubscriber>().Property(x => x.UpdatedAtUtc);

            // =============================
            // BlogPost Configuration
            // =============================
            modelBuilder.Entity<BlogPost>()
                .HasIndex(x => x.Slug)
                .IsUnique();

            modelBuilder.Entity<BlogPost>()
                .HasIndex(x => new { x.IsPublished, x.PublishedAtUtc });

            modelBuilder.Entity<BlogPost>()
                .HasIndex(x => x.Category);

            modelBuilder.Entity<BlogPost>()
                .Property(x => x.Title)
                .HasMaxLength(200);

            modelBuilder.Entity<BlogPost>()
                .Property(x => x.Slug)
                .HasMaxLength(220);

            modelBuilder.Entity<BlogPost>()
                .Property(x => x.Category)
                .HasMaxLength(80);

            modelBuilder.Entity<BlogPost>()
                .Property(x => x.SubCategory)
                .HasMaxLength(80);

            modelBuilder.Entity<BlogPost>()
                .Property(x => x.SubTitle)
                .HasMaxLength(200);

            modelBuilder.Entity<BlogPost>()
                .Property(x => x.MetaTitle)
                .HasMaxLength(200);

            modelBuilder.Entity<BlogPost>()
                .Property(x => x.MetaKeyword)
                .HasMaxLength(300);

            modelBuilder.Entity<BlogPost>()
                .Property(x => x.MetaDescription)
                .HasMaxLength(600);

            modelBuilder.Entity<BlogPost>()
                .Property(x => x.ImageUrl)
                .HasMaxLength(300);

            modelBuilder.Entity<BlogPost>()
                .Property(x => x.OgImageUrl)
                .HasMaxLength(300);

            modelBuilder.Entity<BlogPost>()
                .Property(x => x.AddedByName)
                .HasMaxLength(120);

            modelBuilder.Entity<BlogPost>().Property(x => x.CreatedAtUtc);
            modelBuilder.Entity<BlogPost>().Property(x => x.UpdatedAtUtc);
            modelBuilder.Entity<BlogPost>().Property(x => x.PublishedAtUtc);

            modelBuilder.Entity<FlightBooking>(entity =>
            {
                entity.ToTable("flight_bookings");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.FlightNumber).HasMaxLength(20).IsRequired();
                entity.Property(x => x.Airline).HasMaxLength(120).IsRequired();
                entity.Property(x => x.FromCity).HasMaxLength(80).IsRequired();
                entity.Property(x => x.ToCity).HasMaxLength(80).IsRequired();
                entity.Property(x => x.CabinClass).HasMaxLength(30).IsRequired();
                entity.Property(x => x.PriceInr).HasPrecision(10, 2);
                entity.HasIndex(x => new { x.FromCity, x.ToCity, x.DepartureTime });
            });

            modelBuilder.Entity<BusBooking>(entity =>
            {
                entity.ToTable("bus_bookings");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.BusNumber).HasMaxLength(20).IsRequired();
                entity.Property(x => x.OperatorName).HasMaxLength(120).IsRequired();
                entity.Property(x => x.BusType).HasMaxLength(40).IsRequired();
                entity.Property(x => x.FromCity).HasMaxLength(80).IsRequired();
                entity.Property(x => x.ToCity).HasMaxLength(80).IsRequired();
                entity.Property(x => x.BoardingPoint).HasMaxLength(120).IsRequired();
                entity.Property(x => x.DroppingPoint).HasMaxLength(120).IsRequired();
                entity.Property(x => x.PriceInr).HasPrecision(10, 2);
                entity.HasIndex(x => new { x.BusNumber, x.FromCity, x.ToCity, x.DepartureTime }).IsUnique();
            });

            modelBuilder.Entity<FlightClassInventory>(entity =>
            {
                entity.ToTable("flight_class_inventories");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.TravelClass).HasMaxLength(30).IsRequired();
                entity.Property(x => x.PriceInr).HasPrecision(10, 2);
                entity.HasIndex(x => new { x.FlightBookingId, x.TravelClass }).IsUnique();
                entity.HasOne(x => x.FlightBooking)
                    .WithMany()
                    .HasForeignKey(x => x.FlightBookingId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<FlightReservation>(entity =>
            {
                entity.ToTable("flight_reservations");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.BookingReference).HasMaxLength(40).IsRequired();
                entity.Property(x => x.Pnr).HasMaxLength(20).IsRequired().HasDefaultValue("");
                entity.Property(x => x.UserId).HasMaxLength(80).IsRequired();
                entity.Property(x => x.PassengerName).HasMaxLength(120).IsRequired();
                entity.Property(x => x.PassengerPhone).HasMaxLength(30).IsRequired();
                entity.Property(x => x.PassengerEmail).HasMaxLength(150);
                entity.Property(x => x.TravelClass).HasMaxLength(30).IsRequired();
                entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
                entity.Property(x => x.CancellationReason).HasMaxLength(300);
                entity.Property(x => x.CancellationChargeInr).HasPrecision(10, 2);
                entity.Property(x => x.RefundAmountInr).HasPrecision(10, 2);
                entity.Property(x => x.TotalPriceInr).HasPrecision(10, 2);
                entity.Property(x => x.CustomerFareInr).HasPrecision(10, 2);
                entity.Property(x => x.NetFareInr).HasPrecision(10, 2);
                entity.Property(x => x.DiscountAmountInr).HasPrecision(10, 2);
                entity.Property(x => x.ConvenienceFeeInr).HasPrecision(10, 2);
                entity.Property(x => x.CouponCode).HasMaxLength(40);
                entity.Property(x => x.SupplierBaseFare).HasPrecision(10, 2);
                entity.Property(x => x.SupplierTaxAmount).HasPrecision(10, 2);
                entity.Property(x => x.SupplierTotalFare).HasPrecision(10, 2);
                entity.Property(x => x.MarkupAmount).HasPrecision(10, 2);
                entity.Property(x => x.PromotionName).HasMaxLength(120);
                entity.Property(x => x.PromotionDiscount).HasPrecision(10, 2);
                entity.Property(x => x.CouponDiscount).HasPrecision(10, 2);
                entity.Property(x => x.ConvenienceFee).HasPrecision(10, 2);
                entity.Property(x => x.FinalAmount).HasPrecision(10, 2);
                entity.HasIndex(x => x.BookingReference).IsUnique();
                entity.HasIndex(x => x.UserId);
                entity.HasIndex(x => x.PassengerPhone);
                entity.HasOne(x => x.FlightBooking)
                    .WithMany()
                    .HasForeignKey(x => x.FlightBookingId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<BusReservation>(entity =>
            {
                entity.ToTable("bus_reservations");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.BookingReference).HasMaxLength(40).IsRequired();
                entity.Property(x => x.Pnr).HasMaxLength(20).IsRequired().HasDefaultValue("");
                entity.Property(x => x.UserId).HasMaxLength(80).IsRequired();
                entity.Property(x => x.PassengerName).HasMaxLength(120).IsRequired();
                entity.Property(x => x.PassengerPhone).HasMaxLength(30).IsRequired();
                entity.Property(x => x.PassengerEmail).HasMaxLength(150);
                entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
                entity.Property(x => x.CancellationReason).HasMaxLength(300);
                entity.Property(x => x.TotalPriceInr).HasPrecision(10, 2);
                entity.Property(x => x.CustomerFareInr).HasPrecision(10, 2);
                entity.Property(x => x.NetFareInr).HasPrecision(10, 2);
                entity.Property(x => x.DiscountAmountInr).HasPrecision(10, 2);
                entity.Property(x => x.ConvenienceFeeInr).HasPrecision(10, 2);
                entity.Property(x => x.CouponCode).HasMaxLength(40);
                entity.Property(x => x.CancellationChargeInr).HasPrecision(10, 2);
                entity.Property(x => x.RefundAmountInr).HasPrecision(10, 2);
                entity.HasIndex(x => x.BookingReference).IsUnique();
                entity.HasIndex(x => x.UserId);
                entity.HasIndex(x => x.PassengerPhone);
                entity.HasOne(x => x.BusBooking)
                    .WithMany()
                    .HasForeignKey(x => x.BusBookingId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<BusReservationPassenger>(entity =>
            {
                entity.ToTable("bus_reservation_passengers");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.FullName).HasMaxLength(120).IsRequired();
                entity.Property(x => x.Gender).HasMaxLength(20).IsRequired();
                entity.Property(x => x.SeatNumber).HasMaxLength(10);
                entity.HasIndex(x => x.BusReservationId);
                entity.HasIndex(x => new { x.BusReservationId, x.SeatNumber }).IsUnique();
                entity.HasOne(x => x.BusReservation)
                    .WithMany()
                    .HasForeignKey(x => x.BusReservationId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<FlightReservationPassenger>(entity =>
            {
                entity.ToTable("flight_reservation_passengers");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.FullName).HasMaxLength(120).IsRequired();
                entity.Property(x => x.PassengerType).HasMaxLength(20).IsRequired();
                entity.Property(x => x.Gender).HasMaxLength(20).IsRequired();
                entity.Property(x => x.SeatNumber).HasMaxLength(10);
                entity.HasIndex(x => x.FlightReservationId);
                entity.HasOne(x => x.FlightReservation)
                    .WithMany()
                    .HasForeignKey(x => x.FlightReservationId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Traveler>(entity =>
            {
                entity.ToTable("travelers");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.UserId).HasMaxLength(80).IsRequired();
                entity.Property(x => x.Type).HasMaxLength(20).IsRequired();
                entity.Property(x => x.Title).HasMaxLength(20).IsRequired();
                entity.Property(x => x.FirstName).HasMaxLength(80).IsRequired();
                entity.Property(x => x.LastName).HasMaxLength(80).IsRequired();
                entity.Property(x => x.Gender).HasMaxLength(20).IsRequired();
                entity.Property(x => x.Email).HasMaxLength(150).IsRequired();
                entity.Property(x => x.PhoneNo).HasMaxLength(30).IsRequired();
                entity.Property(x => x.PassportNo).HasMaxLength(40);
                entity.Property(x => x.Country).HasMaxLength(80).IsRequired();
                entity.HasIndex(x => x.UserId);
                entity.HasIndex(x => x.PhoneNo);
                entity.HasIndex(x => x.Email);
                entity.HasIndex(x => x.Type);
            });

            modelBuilder.Entity<FlightRouteStat>(entity =>
            {
                entity.ToTable("flight_route_stats");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.FromCity).HasMaxLength(80).IsRequired();
                entity.Property(x => x.ToCity).HasMaxLength(80).IsRequired();
                entity.HasIndex(x => new { x.FromCity, x.ToCity }).IsUnique();
            });

            modelBuilder.Entity<BusRouteStat>(entity =>
            {
                entity.ToTable("bus_route_stats");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.FromCity).HasMaxLength(80).IsRequired();
                entity.Property(x => x.ToCity).HasMaxLength(80).IsRequired();
                entity.HasIndex(x => new { x.FromCity, x.ToCity }).IsUnique();
            });

            modelBuilder.Entity<FlightSeat>(entity =>
            {
                entity.ToTable("flight_seats");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.TravelClass).HasMaxLength(30).IsRequired();
                entity.Property(x => x.SeatCode).HasMaxLength(10).IsRequired();
                entity.HasIndex(x => new { x.FlightBookingId, x.TravelClass, x.SeatCode }).IsUnique();
                entity.HasIndex(x => new { x.FlightBookingId, x.TravelClass, x.IsBooked });
            });

            modelBuilder.Entity<BusSeat>(entity =>
            {
                entity.ToTable("bus_seats");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.SeatCode).HasMaxLength(10).IsRequired();
                entity.HasIndex(x => new { x.BusBookingId, x.SeatCode }).IsUnique();
                entity.HasIndex(x => new { x.BusBookingId, x.IsBooked });
            });

            modelBuilder.Entity<BusDiscount>(entity =>
            {
                entity.ToTable("bus_discounts");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.DiscountType).HasMaxLength(20).IsRequired();
                entity.Property(x => x.Value).HasPrecision(10, 2);
                entity.Property(x => x.UpdatedBy).HasMaxLength(120).IsRequired();
                entity.Property(x => x.Remark).HasMaxLength(300);
                entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
            });

            modelBuilder.Entity<BusCoupon>(entity =>
            {
                entity.ToTable("bus_coupons");
                entity.Property(x => x.MinBookingAmount).HasPrecision(10, 2).HasDefaultValue(0);
                entity.Property(x => x.MaxUsagePerUser).IsRequired().HasDefaultValue(1);
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Value).HasPrecision(10, 2);
                entity.Property(x => x.CouponType).HasMaxLength(20).IsRequired();
                entity.Property(x => x.CouponCode).HasMaxLength(40).IsRequired();
                entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
                entity.Property(x => x.Remark).HasMaxLength(300);
                entity.HasIndex(x => x.CouponCode).IsUnique();
            });

            modelBuilder.Entity<BusCouponUsage>(entity =>
            {
                entity.ToTable("bus_coupon_usages");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.UserId).HasMaxLength(50).IsRequired();
                entity.HasIndex(x => new { x.CouponCode, x.UserId });
                entity.Property(x => x.CouponCode).HasMaxLength(40).IsRequired();
                entity.Property(x => x.CouponType).HasMaxLength(20).IsRequired();
                entity.Property(x => x.BookingStatus).HasMaxLength(20).IsRequired();
                entity.Property(x => x.TotalFareInr).HasPrecision(10, 2);
                entity.Property(x => x.CouponValue).HasPrecision(10, 2);
                entity.Property(x => x.CouponAmountInr).HasPrecision(10, 2);
                entity.HasOne(x => x.BusReservation)
                    .WithMany()
                    .HasForeignKey(x => x.BusReservationId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<BusConvenienceFee>(entity =>
            {
                entity.ToTable("bus_convenience_fee");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.FeeInr).HasPrecision(10, 2);
                entity.Property(x => x.UpdatedBy).HasMaxLength(120).IsRequired();
                entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
            });

            modelBuilder.Entity<BusSearchLog>(entity =>
            {
                entity.ToTable("bus_search_logs");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.UserId).HasMaxLength(80);
                entity.Property(x => x.UserOrGuestId).HasMaxLength(80);
                entity.Property(x => x.IsGuest);
                entity.Property(x => x.FromCity).HasMaxLength(80).IsRequired();
                entity.Property(x => x.ToCity).HasMaxLength(80).IsRequired();
                entity.HasIndex(x => x.SearchedAtUtc);
                entity.HasIndex(x => new { x.FromCity, x.ToCity });
            });

            modelBuilder.Entity<BusMarkupSetting>(entity =>
            {
                entity.ToTable("bus_markup_settings");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.SeatType).HasMaxLength(50).IsRequired();
                entity.Property(x => x.Value).HasPrecision(10, 2);
                entity.Property(x => x.MarkupType).HasMaxLength(20).IsRequired();
                entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
                entity.Property(x => x.UpdatedBy).HasMaxLength(120);
                entity.Property(x => x.Remark).HasMaxLength(300);
            });

            modelBuilder.Entity<BusGstSetting>(entity =>
            {
                entity.ToTable("bus_gst_settings");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.GstCategory).HasMaxLength(50).IsRequired();
                entity.Property(x => x.GstPercent).HasPrecision(10, 2);
                entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
                entity.Property(x => x.UpdatedBy).HasMaxLength(120);
                entity.Property(x => x.Remark).HasMaxLength(300);
            });

            modelBuilder.Entity<FlightDiscount>(entity =>
            {
                entity.ToTable("flight_discounts");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Value).HasPrecision(10, 2);
                entity.Property(x => x.DiscountType).HasMaxLength(20).IsRequired();
                entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
                entity.Property(x => x.UpdatedBy).HasMaxLength(120).IsRequired();
                entity.Property(x => x.Remark).HasMaxLength(300);
                entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
            });

            modelBuilder.Entity<FlightRemark>(entity =>
            {
                entity.ToTable("flight_remarks");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.SourceType).HasMaxLength(60).IsRequired();
                entity.Property(x => x.UpdatedBy).HasMaxLength(120).IsRequired();
                entity.Property(x => x.Remark).HasMaxLength(500).IsRequired();
                entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
            });

            modelBuilder.Entity<FlightCoupon>(entity =>
            {
                entity.ToTable("flight_coupons");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Value).HasPrecision(10, 2);
                entity.Property(x => x.CouponType).HasMaxLength(20).IsRequired();
                entity.Property(x => x.CouponCode).HasMaxLength(40).IsRequired();
                entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
                entity.Property(x => x.Remark).HasMaxLength(300);
                entity.HasIndex(x => x.CouponCode).IsUnique();
            });

            modelBuilder.Entity<FlightCouponUsage>(entity =>
            {
                entity.ToTable("flight_coupon_usages");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.CouponCode).HasMaxLength(40).IsRequired();
                entity.Property(x => x.CouponType).HasMaxLength(20).IsRequired();
                entity.Property(x => x.BookingStatus).HasMaxLength(20).IsRequired();
                entity.Property(x => x.TotalFareInr).HasPrecision(10, 2);
                entity.Property(x => x.CouponValue).HasPrecision(10, 2);
                entity.Property(x => x.CouponAmountInr).HasPrecision(10, 2);
                entity.HasOne(x => x.FlightReservation)
                    .WithMany()
                    .HasForeignKey(x => x.FlightReservationId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<FlightConvenienceFee>(entity =>
            {
                entity.ToTable("flight_convenience_fee");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.AmountType).HasMaxLength(20).IsRequired();
                entity.Property(x => x.Value).HasPrecision(10, 2);
                entity.Property(x => x.UpdatedBy).HasMaxLength(120).IsRequired();
                entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
            });

            modelBuilder.Entity<FlightSearchLog>(entity =>
            {
                entity.ToTable("flight_search_logs");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.UserId).HasMaxLength(80);
                entity.Property(x => x.UserOrGuestId).HasMaxLength(80);
                entity.Property(x => x.IsGuest);
                entity.Property(x => x.FromCity).HasMaxLength(80).IsRequired();
                entity.Property(x => x.ToCity).HasMaxLength(80).IsRequired();
                entity.Property(x => x.TripType).HasMaxLength(20).IsRequired();
                entity.HasIndex(x => x.SearchedAtUtc);
                entity.HasIndex(x => new { x.FromCity, x.ToCity });
            });

            modelBuilder.Entity<PendingAirline>(entity =>
            {
                entity.ToTable("pending_airlines");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.AirlineCode).HasMaxLength(10).IsRequired();
                entity.Property(x => x.FareType).HasMaxLength(40).IsRequired();
                entity.Property(x => x.UpdatedBy).HasMaxLength(120).IsRequired();
                entity.Property(x => x.Remark).HasMaxLength(300);
            });

            modelBuilder.Entity<Airline>(entity =>
            {
                entity.ToTable("airlines");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
                entity.Property(x => x.Code).HasMaxLength(10).IsRequired();
                entity.Property(x => x.ImageUrl).HasMaxLength(500);
                entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
                entity.HasIndex(x => x.Code).IsUnique();
            });

            modelBuilder.Entity<AirlineWebcheckLink>(entity =>
            {
                entity.ToTable("airline_webcheck_links");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Airline).HasMaxLength(120).IsRequired();
                entity.Property(x => x.AirlineCode).HasMaxLength(10).IsRequired();
                entity.Property(x => x.Url).HasMaxLength(500).IsRequired();
                entity.HasIndex(x => x.AirlineCode);
            });

            modelBuilder.Entity<PopularDestination>(entity =>
            {
                entity.ToTable("popular_destinations");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Title).HasMaxLength(120).IsRequired();
                entity.Property(x => x.SubTitle).HasMaxLength(180).IsRequired();
                entity.Property(x => x.ImageUrl).HasMaxLength(500);
                entity.Property(x => x.Category).HasMaxLength(80).IsRequired();
                entity.Property(x => x.Placement).HasMaxLength(20).IsRequired();
                entity.Property(x => x.Url).HasMaxLength(500);
                entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
            });

            modelBuilder.Entity<FlightCancellationRequest>(entity =>
            {
                entity.ToTable("flight_cancellation_requests");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.CancellationStatus).HasMaxLength(20).IsRequired();
                entity.Property(x => x.CustomerRefundStatus).HasMaxLength(20).IsRequired();
                entity.Property(x => x.AdminRefundStatus).HasMaxLength(20).IsRequired();
                entity.Property(x => x.CustomerRefundAmountInr).HasPrecision(10, 2);
                entity.Property(x => x.CustomerCancellationChargeInr).HasPrecision(10, 2);
                entity.Property(x => x.CustomerServiceChargeInr).HasPrecision(10, 2);
                entity.Property(x => x.AdminRefundAmountInr).HasPrecision(10, 2);
                entity.Property(x => x.AdminCancellationChargeInr).HasPrecision(10, 2);
                entity.Property(x => x.AdminServiceChargeInr).HasPrecision(10, 2);
                entity.Property(x => x.SupplierRemark).HasMaxLength(500);
                entity.Property(x => x.CustomerRemark).HasMaxLength(500);
                entity.Property(x => x.AdminRemark).HasMaxLength(500);
                entity.HasOne(x => x.FlightReservation)
                    .WithMany()
                    .HasForeignKey(x => x.FlightReservationId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<FlightAmendmentRequest>(entity =>
            {
                entity.ToTable("flight_amendment_requests");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.AmendmentStatus).HasMaxLength(20).IsRequired();
                entity.Property(x => x.SupplierRemark).HasMaxLength(500);
                entity.Property(x => x.CustomerRemark).HasMaxLength(500);
                entity.Property(x => x.AdminRemark).HasMaxLength(500);
                entity.HasOne(x => x.FlightReservation)
                    .WithMany()
                    .HasForeignKey(x => x.FlightReservationId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<HotelReservation>(entity =>
            {
                entity.ToTable("hotel_reservations");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.BookingReference).HasMaxLength(40).IsRequired();
                entity.Property(x => x.ProviderBookingId).HasMaxLength(80);
                entity.Property(x => x.UserId).HasMaxLength(80).IsRequired();
                entity.Property(x => x.HotelId).HasMaxLength(80).IsRequired();
                entity.Property(x => x.HotelName).HasMaxLength(200).IsRequired();
                entity.Property(x => x.OfferId).HasMaxLength(120).IsRequired();
                entity.Property(x => x.CityCode).HasMaxLength(10).IsRequired();
                entity.Property(x => x.GuestName).HasMaxLength(120).IsRequired();
                entity.Property(x => x.GuestEmail).HasMaxLength(150).IsRequired();
                entity.Property(x => x.GuestPhone).HasMaxLength(30).IsRequired();
                entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
                entity.Property(x => x.CancellationReason).HasMaxLength(300);
                entity.Property(x => x.Price).HasPrecision(10, 2);
                entity.Property(x => x.Currency).HasMaxLength(10).IsRequired();
                entity.HasIndex(x => x.BookingReference).IsUnique();
                entity.HasIndex(x => x.UserId);
                entity.HasIndex(x => x.HotelId);
            });

            modelBuilder.Entity<FlightPromotion>(entity =>
            {
                entity.ToTable("flight_promotions");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
                entity.Property(x => x.Description).HasMaxLength(500);
                entity.Property(x => x.DiscountType).HasConversion<string>().HasMaxLength(20).IsRequired();
                entity.Property(x => x.DiscountValue).HasPrecision(10, 2);
                entity.Property(x => x.MaximumDiscount).HasPrecision(10, 2);
                entity.Property(x => x.MinimumFare).HasPrecision(10, 2);
            });

            modelBuilder.Entity<FlightPromotionCondition>(entity =>
            {
                entity.ToTable("flight_promotion_conditions");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.ConditionType).HasConversion<string>().HasMaxLength(50).IsRequired();
                entity.Property(x => x.Operator).HasMaxLength(50).IsRequired();
                entity.Property(x => x.Value).HasMaxLength(200).IsRequired();
                entity.HasOne(x => x.FlightPromotion)
                    .WithMany(x => x.Conditions)
                    .HasForeignKey(x => x.FlightPromotionId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<FlightPromotionUsage>(entity =>
            {
                entity.ToTable("flight_promotion_usages");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.UserId).HasMaxLength(80).IsRequired();
                entity.Property(x => x.DiscountAmount).HasPrecision(10, 2);
                entity.HasOne(x => x.FlightPromotion)
                    .WithMany()
                    .HasForeignKey(x => x.FlightPromotionId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.FlightReservation)
                    .WithMany()
                    .HasForeignKey(x => x.ReservationId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<FlightMarkupRule>(entity =>
            {
                entity.ToTable("flight_markup_rules");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.AirlineCode).HasMaxLength(10).IsRequired();
                entity.Property(x => x.TripType).HasConversion<string>().HasMaxLength(20).IsRequired();
                entity.Property(x => x.MarkupType).HasConversion<string>().HasMaxLength(20).IsRequired();
                entity.Property(x => x.MarkupValue).HasPrecision(10, 2);
            });

            modelBuilder.Entity<FlightConvenienceFeeRule>(entity =>
            {
                entity.ToTable("flight_convenience_fee_rules");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.TripType).HasConversion<string>().HasMaxLength(20).IsRequired();
                entity.Property(x => x.FeeType).HasMaxLength(20).IsRequired();
                entity.Property(x => x.FeeValue).HasPrecision(10, 2);
            });
        }
    }
}
