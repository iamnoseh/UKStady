# UKStady

Системаи санҷиш ва баҳогузории дониши донишҷӯён.

## Ҳуҷҷатҳои асосӣ

- `PROJECT_CONTEXT.md` - бизнес-мантиқ, нақшҳо, MVP ва қарорҳои пешфарз.
- `AGENTS.md` - қоидаҳои кор барои AI/Codex.
- `IMPLEMENTATION_PLAN.md` - нақшаи марҳила ба марҳилаи татбиқ.

## Stack

- Backend: ASP.NET Core Web API, EF Core, PostgreSQL, JWT.
- Frontend: React, TypeScript, Vite, Tailwind CSS.
- Target backend framework: `net10.0`.

## Оғози кор

Аввал `PROJECT_CONTEXT.md` ва `IMPLEMENTATION_PLAN.md`-ро хонед. Баъд сохтани лоиҳа аз Марҳилаи 1 оғоз мешавад.

## Backend

```powershell
cd Back
dotnet restore UKStady.Back.slnx
dotnet build UKStady.Back.slnx
dotnet test UKStady.Back.slnx
dotnet run --project src/API/UKStady.API.csproj
```

Ҳангоми `dotnet run` migration-ҳои EF Core худкор ба PostgreSQL apply мешаванд, агар `Database:AutoMigrate` фаъол бошад. Агар password-и PostgreSQL-и шумо дигар бошад, connection string-ро бо environment variable гузоред:

```powershell
$env:ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=ukstady;Username=postgres;Password=YOUR_PASSWORD"
dotnet run --project src/API/UKStady.API.csproj --urls http://localhost:5036
```

Endpoint-ҳои skeleton:

- `GET /health`
- `GET /openapi/v1.json` дар Development
- `GET /swagger` дар Development
- `GET /api/system/info`

Login-и seed барои development бо рақами телефон:

- phone: `+992000000000`
- password: `Admin123!`
