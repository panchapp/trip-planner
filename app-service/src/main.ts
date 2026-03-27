import { AppModule } from '@app/app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
}

function configureSecurity(app: INestApplication, configService: ConfigService): void {
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: configService.getOrThrow<string>('app.corsOrigin'),
    credentials: true,
  });
}

function configureValidation(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}

function configureSwagger(app: INestApplication): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Trip Planner API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      tryItOutEnabled: false,
      supportedSubmitMethods: [],
    },
  });
}

async function startServer(app: INestApplication, configService: ConfigService): Promise<void> {
  const port = configService.getOrThrow<number>('app.port');
  await app.listen(port);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  configureApp(app);
  configureSecurity(app, configService);
  configureValidation(app);
  configureSwagger(app);

  await startServer(app, configService);
}

void bootstrap();
