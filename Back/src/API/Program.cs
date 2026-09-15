using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using UKStady.API.Auth;
using UKStady.API.Endpoints;
using UKStady.API.Middlewares;
using UKStady.Application.Common.Interfaces;
using UKStady.Application;
using UKStady.Infrastructure;
using UKStady.Infrastructure.Auth;

var builder = WebApplication.CreateBuilder(args);
var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("JWT settings are not configured.");
var signingKey = Encoding.UTF8.GetBytes(jwtOptions.SigningKey);

builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "UKStady Knowledge Assessment API",
        Version = "v1",
        Description = "API for daily student knowledge assessment, grading, and gradebook workflows."
    });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter JWT bearer token."
    });
    options.AddSecurityRequirement(_ => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer", null, null),
            []
        }
    });
});
builder.Services.AddHealthChecks();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(signingKey),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });
builder.Services.AddAuthorization(options => options.AddRolePolicies());
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

app.UseGlobalExceptionHandling();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "UKStady API v1");
        options.RoutePrefix = "swagger";
        options.DocumentTitle = "UKStady API Swagger";
    });
}

app.MapHealthChecks("/health")
    .WithName("Health");

app.MapGet("/api/system/info", () => Results.Ok(new
{
    Name = "UKStady Knowledge Assessment API",
    Version = "0.1.0"
}))
.WithName("SystemInfo");

app.MapAuthEndpoints();

app.Run();

public partial class Program;
