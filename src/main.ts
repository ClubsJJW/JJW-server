import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const useHttp2 = process.env.USE_HTTP2 === 'true';
  const port = process.env.PORT ?? 3090;

  let httpsOptions: { key: Buffer; cert: Buffer; allowHTTP1: boolean } | undefined = undefined;
  
  if (useHttp2) {
    const certPath = path.join(__dirname, '..', 'certs', 'localhost-cert.pem');
    const keyPath = path.join(__dirname, '..', 'certs', 'localhost-key.pem');

    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
        allowHTTP1: true, // HTTP/1.1 폴백 허용
      };
    } else {
      console.warn('⚠️  SSL 인증서를 찾을 수 없습니다. HTTP/1.1로 실행합니다.');
    }
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    httpsOptions,
  });

  // CORS 활성화 (브라우저에서 접근 허용)
  app.enableCors({
    origin: '*', // 개발 환경용, 프로덕션에서는 특정 도메인으로 제한
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 정적 파일 서빙 (test-1.html, test-2.html 등)
  app.useStaticAssets(path.join(__dirname, '..'), {
    prefix: '/',
  });

  await app.listen(port);

  const protocol = httpsOptions ? 'https' : 'http';
  console.log(`🚀 Application is running on: ${protocol}://localhost:${port}`);
  if (useHttp2 && httpsOptions) {
    console.log('✅ HTTP/2 enabled');
  } else {
    console.log('📡 HTTP/1.1 mode');
  }
}
bootstrap();
