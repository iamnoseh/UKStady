using UKStady.API.Middlewares;
using UKStady.Application;
using UKStady.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

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
});
builder.Services.AddHealthChecks();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

app.UseGlobalExceptionHandling();

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

app.Run();

public partial class Program;
