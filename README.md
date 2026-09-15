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

Endpoint-ҳои skeleton:

- `GET /health`
- `GET /openapi/v1.json` дар Development
- `GET /swagger` дар Development
- `GET /api/system/info`

Login-и seed барои development:

- username: `superadmin`
- password: `Admin123!`
