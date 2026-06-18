import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5173', '*'],
    credentials: true,
  });

  // Global exception filter for debugging
  app.useGlobalFilters(new (class {
    catch(exception: any, host: any) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      console.error('ERROR:', exception?.message || exception);
      console.error('STACK:', exception?.stack?.split('\n').slice(0, 5).join('\n'));
      response.status(exception?.status || 500).json({
        statusCode: exception?.status || 500,
        message: exception?.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? exception?.stack : undefined,
      });
    }
  })());

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
}
bootstrap();
