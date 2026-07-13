using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
//using Npgsql;
using PickNBook.Api.Data;
using PickNBook.Api.Middleware;
using PickNBook.Api.Models;
using PickNBook.Api.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ---------------- SERVICES ----------------
builder.Services.Configure<AmadeusSettings>(
    builder.Configuration.GetSection("Amadeus"));
builder.Services.AddHttpClient<IAmadeusService, AmadeusService>();

builder.Services.AddHttpClient("TicketEmailApi", client =>
{
    client.Timeout = TimeSpan.FromSeconds(20);
});
builder.Services.Configure<HotelbedsSettings>(
    builder.Configuration.GetSection("Hotelbeds"));
builder.Services.AddHttpClient<IHotelService, HotelbedsService>();
builder.Services.AddHttpClient<IGeoIpService, GeoIpService>();

builder.Services.AddScoped<IBookingNotificationService, BookingNotificationService>();

builder.Services.AddMemoryCache();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IFlightAnalyticsService, FlightAnalyticsService>();
builder.Services.AddScoped<IFeaturedOffersService, FeaturedOffersService>();
// Email Settings
builder.Services.Configure<EmailSettings>(
    builder.Configuration.GetSection("EmailSettings"));
builder.Services.Configure<WhatsAppSettings>(
    builder.Configuration.GetSection("WhatsAppSettings"));
builder.Services.Configure<SmsSettings>(
    builder.Configuration.GetSection("SmsSettings"));

builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddHttpClient<IWhatsAppService, WhatsAppService>();
builder.Services.AddHttpClient<ISmsService, SmsService>();
builder.Services.AddScoped<IExclusiveOfferSubscriptionService, ExclusiveOfferSubscriptionService>();
builder.Services.AddScoped<ITicketPdfService, TicketPdfService>();
builder.Services.AddScoped<ITicketEmailService, TicketEmailService>();
builder.Services.AddScoped<IBookingHistoryService, BookingHistoryService>();
builder.Services.AddScoped< IAdminFeaturedOffersService, AdminFeaturedOffersService>();
builder.Services.AddScoped<
    IBusPromotionEngineService,
    BusPromotionEngineService>();
builder.Services.AddScoped<IFlightMarkupService, FlightMarkupService>();
builder.Services.AddScoped<IFlightPromotionEngine, FlightPromotionEngine>();
builder.Services.AddScoped<IFlightPricingService, FlightPricingService>();
builder.Services.AddScoped<IUserBookingHistoryService, UserBookingHistoryService>();
builder.Services.AddScoped<IAgentWalletService, AgentWalletService>();
// JWT Service
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IAboutUsService, AboutUsService>();
builder.Services.AddScoped<IFileStorageService, LocalFileStorageService>();
builder.Services.AddScoped<IBlogsService, BlogsService>();
builder.Services.AddScoped<Microsoft.AspNetCore.Identity.IPasswordHasher<User>, Microsoft.AspNetCore.Identity.PasswordHasher<User>>();
builder.Services.AddSingleton<IBackgroundJobQueue, BackgroundJobQueue>();
builder.Services.AddHostedService<BackgroundJobExecutor>();

// Database



var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("DefaultConnection is not configured.");

// Serverless Postgres can close idle sockets; keepalive + retries prevents transient failures.


var serverVersion = new MySqlServerVersion(new Version(8, 0, 35));
bool isTesting = AppDomain.CurrentDomain.GetAssemblies().Any(a => a.FullName != null && a.FullName.Contains("Test", StringComparison.OrdinalIgnoreCase));

if (isTesting)
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseMySql(
            connectionString,
            serverVersion,
            mysqlOptions =>
            {
                mysqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 5,
                    maxRetryDelay: TimeSpan.FromSeconds(10),
                    errorNumbersToAdd: null);
            }
        ));
}
else
{
    builder.Services.AddDbContextPool<AppDbContext>(options =>
        options.UseMySql(
            connectionString,
            serverVersion,
            mysqlOptions =>
            {
                mysqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 5,
                    maxRetryDelay: TimeSpan.FromSeconds(10),
                    errorNumbersToAdd: null);
            }
        ));
}


// ---------------- CORS CONFIG ----------------

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin => true)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// ---------------- JWT AUTH ----------------
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;


})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,

        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],

        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!))
    };
});

builder.Services.AddControllers();
builder.Services.AddOutputCache();

// ---------------- SWAGGER + JWT BUTTON ----------------
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter JWT token like this: Bearer {your token}"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

var app = builder.Build();

app.UseMiddleware<GlobalExceptionHandlingMiddleware>();
app.UseMiddleware<RequestProfilingMiddleware>();


// ---------------- MIDDLEWARE ----------------

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

var shouldSeed = builder.Configuration.GetValue<bool>("SeedDatabase", false);
if (shouldSeed)
{
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        const int maxSeedAttempts = 3;
        for (var attempt = 1; attempt <= maxSeedAttempts; attempt++)
        {
            try
            {
                await DbSeeder.SeedAsync(dbContext);
                break;
            }
            catch (Exception) when (attempt < maxSeedAttempts)
            {
                await Task.Delay(TimeSpan.FromSeconds(2 * attempt));
            }
        }
    }
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Enable CORS (Must be before UseStaticFiles)
app.UseCors("AllowFrontend");

// 🔥 VERY IMPORTANT (Added this line only)
app.UseStaticFiles();

app.UseOutputCache();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();



app.Run();

