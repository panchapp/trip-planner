# App Service — NestJS 11

## Quick Start

```bash
pnpm --filter app-service start:dev   # watch mode
pnpm --filter app-service test        # unit tests
pnpm --filter app-service test:e2e    # e2e tests
pnpm --filter app-service build       # production build
pnpm --filter app-service lint        # lint
pnpm --filter app-service format      # prettier
```

## Architecture

- **Modular architecture** — one module per feature domain
- **Express v5** — use named wildcards (`*splat` not bare `*`)
- **ESM compatible** — `nodenext` module resolution
- Bootstrap via `NestFactory.create` with root `AppModule`

## Project Structure

```
src/
├── main.ts                     # Bootstrap, global pipes/filters/interceptors
├── app.module.ts               # Root module
├── app.controller.ts           # Root health/info endpoint
├── app.service.ts              # Root service
├── common/                     # Shared utilities across all features
│   ├── decorators/
│   ├── dto/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── middleware/
│   ├── pipes/
│   └── interfaces/
└── modules/                    # Feature modules
    └── <feature>/
        ├── <feature>.module.ts
        ├── <feature>.controller.ts
        ├── <feature>.service.ts
        ├── dto/
        ├── entities/
        └── interfaces/
```

## Naming Conventions

| Artifact    | File name                   | Class/function name   |
| ----------- | --------------------------- | --------------------- |
| Module      | `trips.module.ts`           | `TripsModule`         |
| Controller  | `trips.controller.ts`       | `TripsController`     |
| Service     | `trips.service.ts`          | `TripsService`        |
| Guard       | `auth.guard.ts`             | `AuthGuard`           |
| Interceptor | `logging.interceptor.ts`    | `LoggingInterceptor`  |
| Pipe        | `parse-objectid.pipe.ts`    | `ParseObjectIdPipe`   |
| Filter      | `http-exception.filter.ts`  | `HttpExceptionFilter` |
| Middleware  | `logger.middleware.ts`      | `LoggerMiddleware`    |
| DTO         | `create-trip.dto.ts`        | `CreateTripDto`       |
| Entity      | `trip.entity.ts`            | `Trip`                |
| Decorator   | `current-user.decorator.ts` | `CurrentUser`         |
| Spec        | `<name>.spec.ts`            | —                     |

## Key Patterns

### Modules

- One module per feature domain
- Export services that other modules consume
- Use `forRoot()` / `forRootAsync()` for configurable dynamic modules

### Controllers

- Handle HTTP concerns only — delegate business logic to services
- Use `@HttpCode()` with appropriate status codes
- Use parameter pipes (`ParseIntPipe`, `ParseUUIDPipe`, etc.) for validation
- Express v5 wildcard routes: `@Get('files/*path')` not `@Get('files/*')`

### Services

- All business logic lives here — keep controllers thin
- Throw NestJS built-in HTTP exceptions (`NotFoundException`, `BadRequestException`, etc.)
- Constructor-based DI with `@Injectable()`

### DTOs & Validation

- `class-validator` decorators for validation, `class-transformer` for transformation
- Global `ValidationPipe` in `main.ts`: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- `@nestjs/mapped-types`: `PartialType`, `PickType`, `OmitType`, `IntersectionType`
- Mark DTO properties as `readonly`

### Error Handling

- Built-in HTTP exceptions — avoid raw `throw new Error()`
- Global exception filters registered in `main.ts`

### Configuration

- `@nestjs/config` with `ConfigService` — never read `process.env` directly
- `ConfigModule.forRoot({ isGlobal: true })`
- Typed config via `registerAs()` factory functions

### Logging

- Built-in `Logger` / `ConsoleLogger` — no `console.log`
- Scoped loggers: `private readonly logger = new Logger(MyService.name)`

### Bootstrap (`main.ts`)

- Register global pipes, filters, interceptors, and prefix (`api`)
- Enable CORS explicitly
- Use `enableShutdownHooks()` when relying on lifecycle hooks

## Path Aliases

| Alias        | Maps to         |
| ------------ | --------------- |
| `@common/*`  | `src/common/*`  |
| `@modules/*` | `src/modules/*` |

Always use path aliases for cross-boundary imports. Relative imports are fine within the same feature module.

## TypeScript

- `strictNullChecks: true`, `nodenext` module resolution
- No `any` in new code — use `unknown` and narrow
- `interface` for data shapes; `type` for unions/intersections
- `readonly` for DTO properties and injected dependencies

## Testing

- **Jest** with `ts-jest`
- Unit tests: `*.spec.ts` colocated with source
- E2E tests: `test/*.e2e-spec.ts`
- `@nestjs/testing` `Test.createTestingModule()` for isolation
- `supertest` for HTTP assertions
