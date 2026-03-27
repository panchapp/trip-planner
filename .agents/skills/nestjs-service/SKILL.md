---
name: nestjs-service
description: NestJS 11 best practices and coding guidelines for the app-service project. Use when generating, reviewing, or refactoring modules, controllers, services, DTOs, guards, interceptors, pipes, middleware, filters, or any backend code in app-service. Applies to any NestJS code creation or modification.
---

# NestJS 11 Service — Code Patterns

> **Conventions reference**: `app-service/CLAUDE.md` (always loaded) covers project structure, naming, path aliases, and key patterns. This skill provides detailed code generation patterns and decision guidance.

## Modular architecture

Structure the app around **NestJS feature modules**, not around extra layering styles from other ecosystems.

- **`src/common/`** — shared building blocks used by many features (guards, pipes, database wiring, decorators).
- **`src/modules/<feature>/`** — everything that belongs to one feature stays together: module, controller, service, DTOs, and optional repositories.
- **Scalability** — add new capabilities by adding modules and declaring imports/exports; avoid turning the codebase into a deep global layer cake.
- **Simplicity** — prefer flat, obvious folders inside a feature; introduce subfolders (`dto/`, `repositories/`, `interfaces/`) only when a feature grows enough to need them.

## Modules

```typescript
import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
```

- One module per feature.
- Export services that other modules consume.
- Use `forRoot()` / `forRootAsync()` patterns for configurable dynamic modules.
- Register feature modules in `AppModule` imports.

## Controllers

```typescript
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTripDto) {
    return this.tripsService.create(dto);
  }

  @Get()
  findAll(@Query('page', new ParseIntPipe({ optional: true })) page?: number) {
    return this.tripsService.findAll(page);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tripsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTripDto) {
    return this.tripsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.tripsService.remove(id);
  }
}
```

### Rules

- Controllers handle HTTP concerns only — delegate business logic to services.
- Use appropriate HTTP status codes via `@HttpCode()`.
- Apply `ParseIntPipe`, `ParseUUIDPipe`, `ParseDatePipe`, or custom pipes for parameter validation.
- Group related endpoints under a single controller with a shared route prefix.
- Express v5 wildcard routes require a name: `@Get('files/*path')` not `@Get('files/*')`.

## Services

```typescript
@Injectable()
export class TripsService {
  constructor(private readonly tripRepository: TripRepository) {}

  async create(dto: CreateTripDto): Promise<Trip> {
    return this.tripRepository.create(dto);
  }

  async findOne(id: string): Promise<Trip> {
    const trip = await this.tripRepository.findById(id);
    if (!trip) {
      throw new NotFoundException(`Trip #${id} not found`);
    }
    return trip;
  }

  async findAll(page?: number): Promise<Trip[]> {
    return this.tripRepository.findAll({ page });
  }
}
```

### Rules

- Services contain all business logic — keep controllers thin.
- One primary service per feature module.
- Throw NestJS built-in HTTP exceptions (`NotFoundException`, `BadRequestException`, `ConflictException`, etc.) for error cases.
- Use `IntrinsicException` for errors that should bypass the global exception filter and automatic logging (e.g., expected validation rejections in hot paths):

```typescript
throw new IntrinsicException('Rate limit exceeded');
```

- Extract reusable logic into shared services in `common/`.

## DTOs and Validation

```typescript
export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @IsString()
  @IsOptional()
  readonly description?: string;

  @IsDateString()
  readonly startDate: string;

  @IsDateString()
  readonly endDate: string;
}

export class UpdateTripDto extends PartialType(CreateTripDto) {}
```

### Rules

- Use `class-validator` decorators for declarative validation.
- Use `class-transformer` for DTO transformation.
- `whitelist: true` strips undecorated properties.
- `forbidNonWhitelisted: true` rejects requests with unknown properties.
- `transform: true` auto-transforms payloads to DTO class instances.
- Use `@nestjs/mapped-types`: `PartialType`, `PickType`, `OmitType`, `IntersectionType`.
- Mark DTO properties as `readonly`.
- Do NOT add Swagger decorators (`@ApiProperty`, etc.) to DTOs — we use baseline Swagger only.

## Data access (repositories)

Keep persistence details inside the feature module. Expose an **abstract repository** to the service so the service stays focused on rules and orchestration; register the concrete implementation in the same module.

Example layout under `src/modules/trips/`:

```text
trips.module.ts
trips.controller.ts
trips.service.ts
dto/
interfaces/
  trip.repository.ts      # abstract class (contract)
repositories/
  trip-knex.repository.ts # concrete implementation (e.g. Knex)
```

```typescript
// modules/trips/interfaces/trip.repository.ts
export abstract class TripRepository {
  abstract create(data: CreateTripDto): Promise<Trip>;
  abstract findById(id: string): Promise<Trip | null>;
  abstract findAll(options?: { page?: number }): Promise<Trip[]>;
  abstract update(id: string, data: UpdateTripDto): Promise<Trip>;
  abstract remove(id: string): Promise<void>;
}
```

```typescript
// modules/trips/repositories/trip-knex.repository.ts
import { Injectable } from '@nestjs/common';
import { TripRepository } from '../interfaces/trip.repository';

@Injectable()
export class TripKnexRepository extends TripRepository {
  async findById(id: string): Promise<Trip | null> {
    // Implement with the project's DB client (e.g. Knex query builder).
  }
}
```

```typescript
// trips.module.ts — bind contract to implementation
@Module({
  providers: [
    TripsService,
    { provide: TripRepository, useClass: TripKnexRepository },
  ],
})
export class TripsModule {}
```

### Rules

- Keep repository contracts and implementations under the same feature folder.
- Register `{ provide: TripRepository, useClass: TripKnexRepository }` (or equivalent) in the feature module.
- Services inject `TripRepository` (the abstract class used as a token) — not the concrete class.
- Use test doubles by swapping the `useClass` (or `useValue`) binding in tests.

## Swagger / OpenAPI

Use baseline Swagger setup only — no custom decorators on controllers or DTOs. Swagger will infer schema from class-validator and route metadata.

Setup in `main.ts`:

```typescript
const config = new DocumentBuilder()
  .setTitle('Trip Planner API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### Rules

- Do NOT use `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiParam`, `@ApiProperty`, `@ApiPropertyOptional`, `@ApiBearerAuth`, or any other Swagger decorators.
- Rely on the baseline DocumentBuilder + createDocument setup — Swagger infers schemas from DTO types and route metadata automatically.

## Security

### Rate Limiting

```typescript
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 100 }],
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

### Helmet & CORS

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({
    origin: configService.get('CORS_ORIGIN'),
    credentials: true,
  });
}
```

### Rules

- Always enable `helmet()` for HTTP security headers.
- Configure CORS with explicit origins — avoid `origin: '*'` in production.
- Use `@nestjs/throttler` for rate limiting.
- Validate and sanitize all user inputs via DTOs and `ValidationPipe`.

## Error Handling

```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Rules

- Register global exception filters in `main.ts` via `app.useGlobalFilters()`.
- Use built-in exceptions for standard HTTP errors — avoid raw `throw new Error()`.
- Log unhandled exceptions; let expected exceptions pass through.

## Guards

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return roles.some((role) => user.roles?.includes(role));
  }
}
```

- Use guards for authentication and authorization only.
- Combine with custom decorators and `Reflector` for metadata-driven access control.
- Register globally via `APP_GUARD` provider for app-wide auth.

## Interceptors

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = Date.now();
    return next
      .handle()
      .pipe(tap(() => this.logger.log(`${Date.now() - now}ms`)));
  }
}
```

- Use interceptors for cross-cutting concerns: logging, caching, response transformation, timeout.
- Prefer `ClassSerializerInterceptor` for entity serialization.
- Keep interceptors lightweight.

## Configuration

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
})
export class AppModule {}
```

- Use `@nestjs/config` with `ConfigService` — never read `process.env` directly.
- Use typed configuration via `registerAs()` factory functions.
- In NestJS 11 custom config factories take precedence over `process.env`. Use `skipProcessEnv` for test isolation.

## Error Recovery

- **Build fails**: Run `pnpm --filter app-service build` and check for type errors or missing imports.
- **Lint errors**: Run `pnpm --filter app-service lint` after changes. Fix before committing.
- **Test failures**: Run `pnpm --filter app-service test`. Update specs when interfaces or DTOs change.
- **Circular dependencies**: NestJS warns at startup. Resolve with `forwardRef()` or restructure module boundaries.
- **Validation errors in requests**: Check DTO decorators and ensure the global `ValidationPipe` is configured in `main.ts`.

## Quick Checklist

- [ ] Feature organized as a module with its own controller, service, and DTOs
- [ ] Controllers handle HTTP only — business logic in services
- [ ] DTOs validated with `class-validator` decorators and `readonly` properties
- [ ] Global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform`
- [ ] Built-in HTTP exceptions for error responses
- [ ] Data access via feature-scoped repositories — services depend on abstract repository contracts
- [ ] No Swagger decorators — baseline setup only (DocumentBuilder + createDocument)
- [ ] `@nestjs/config` `ConfigService` — no raw `process.env`
- [ ] Scoped `Logger` instances — no `console.log`
- [ ] Guards for auth, interceptors for cross-cutting, pipes for validation
- [ ] Helmet and rate limiting configured
- [ ] Express v5 named wildcards (`*splat` not `*`)
- [ ] Strict TypeScript — no `any` in new code
- [ ] Path aliases (`@common/*`, `@modules/*`) for cross-boundary imports
- [ ] Unit tests colocated with source, E2E tests in `test/`
- [ ] Dependencies injected via constructor — services marked `@Injectable()`
