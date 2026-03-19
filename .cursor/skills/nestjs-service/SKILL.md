---
name: nestjs-service
description: NestJS 11 best practices and coding guidelines for the app-service project. Use when generating, reviewing, or refactoring modules, controllers, services, DTOs, guards, interceptors, pipes, middleware, filters, or any backend code in app-service. Applies to any NestJS code creation or modification.
---

# NestJS 11 Service — Code Patterns

> **Conventions reference**: `app-service/CLAUDE.md` (always loaded) covers project structure, naming, path aliases, and key patterns. This skill provides detailed code generation patterns and decision guidance.

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

- One module per feature domain.
- Export services that other modules consume.
- Use `forRoot()` / `forRootAsync()` patterns for configurable dynamic modules.
- Register feature modules in `AppModule` imports.

## Controllers

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new trip' })
  @ApiResponse({ status: 201, description: 'Trip created' })
  create(@Body() dto: CreateTripDto) {
    return this.tripsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all trips' })
  findAll(@Query('page', new ParseIntPipe({ optional: true })) page?: number) {
    return this.tripsService.findAll(page);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a trip by ID' })
  @ApiParam({ name: 'id', description: 'Trip ID' })
  @ApiResponse({ status: 200, description: 'Trip found' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  findOne(@Param('id') id: string) {
    return this.tripsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a trip' })
  update(@Param('id') id: string, @Body() dto: UpdateTripDto) {
    return this.tripsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a trip' })
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
import { Injectable, NotFoundException } from '@nestjs/common';
import { TripRepositoryPort } from '../domain/ports/trip-repository.port';
import { CreateTripDto } from './dto/create-trip.dto';

@Injectable()
export class TripsService {
  constructor(private readonly tripRepository: TripRepositoryPort) {}

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
import { IntrinsicException } from '@nestjs/common';

throw new IntrinsicException('Rate limit exceeded');
```

- Extract reusable logic into shared services in `common/`.

## DTOs and Validation

```typescript
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTripDto {
  @ApiProperty({ description: 'Trip title', example: 'Summer in Italy' })
  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @ApiPropertyOptional({ description: 'Trip description' })
  @IsString()
  @IsOptional()
  readonly description?: string;

  @ApiProperty({ description: 'Start date (ISO 8601)', example: '2026-07-01' })
  @IsDateString()
  readonly startDate: string;

  @ApiProperty({ description: 'End date (ISO 8601)', example: '2026-07-15' })
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
- Add `@ApiProperty()` / `@ApiPropertyOptional()` on every DTO property.

## Database & Repository Pattern

Abstract data access behind repository classes to keep services ORM-agnostic:

```typescript
// domain/ports/trip-repository.port.ts
export abstract class TripRepositoryPort {
  abstract create(data: CreateTripDto): Promise<Trip>;
  abstract findById(id: string): Promise<Trip | null>;
  abstract findAll(options?: { page?: number }): Promise<Trip[]>;
  abstract update(id: string, data: UpdateTripDto): Promise<Trip>;
  abstract remove(id: string): Promise<void>;
}
```

```typescript
// infrastructure/repositories/trip.repository.ts
import { Injectable } from '@nestjs/common';
import { TripRepositoryPort } from '../../domain/ports/trip-repository.port';

@Injectable()
export class TripRepository extends TripRepositoryPort {
  async findById(id: string): Promise<Trip | null> {
    // Implement with your chosen ORM:
    // Prisma:   return this.prisma.trip.findUnique({ where: { id } });
    // Mongoose: return this.tripModel.findById(id);
    // TypeORM:  return this.tripRepo.findOneBy({ id });
  }
}
```

```typescript
// trips.module.ts — bind the abstract port to the concrete implementation
@Module({
  providers: [
    TripsService,
    { provide: TripRepositoryPort, useClass: TripRepository },
  ],
})
export class TripsModule {}
```

### Rules

- Define abstract repository ports in `domain/ports/`.
- Implement concrete repositories in `infrastructure/repositories/`.
- Bind abstractions to implementations in the module `providers` array.
- Services depend on the abstract port — never on the concrete repository directly.
- This makes swapping ORMs or adding test doubles straightforward.

## Swagger / OpenAPI

Decorate controllers and DTOs for auto-generated API documentation.

Setup in `main.ts`:

```typescript
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Trip Planner API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### Rules

- Add `@ApiTags()` on every controller.
- Add `@ApiOperation()` and `@ApiResponse()` on every endpoint.
- Add `@ApiProperty()` / `@ApiPropertyOptional()` on every DTO property.
- Use `@ApiBearerAuth()` on protected endpoints.

## Security

### Rate Limiting

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

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
import helmet from 'helmet';

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
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

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
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

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
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

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
import { ConfigModule, ConfigService } from '@nestjs/config';

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
- [ ] Repository pattern for data access — services depend on abstract ports
- [ ] Swagger decorators on controllers (`@ApiTags`, `@ApiOperation`, `@ApiResponse`) and DTOs (`@ApiProperty`)
- [ ] `@nestjs/config` `ConfigService` — no raw `process.env`
- [ ] Scoped `Logger` instances — no `console.log`
- [ ] Guards for auth, interceptors for cross-cutting, pipes for validation
- [ ] Helmet and rate limiting configured
- [ ] Express v5 named wildcards (`*splat` not `*`)
- [ ] Strict TypeScript — no `any` in new code
- [ ] Path aliases (`@common/*`, `@modules/*`) for cross-boundary imports
- [ ] Unit tests colocated with source, E2E tests in `test/`
- [ ] Dependencies injected via constructor — services marked `@Injectable()`
