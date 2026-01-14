import { ValidationPipe } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import { AppNameLogger } from '../loggers/appName.logger';

const whitelist = new Set([
  'http://localhost:4200',
  'https://localhost:4200',
  'http://localhost:8100',
]);
const allowedHeaders = [
  'Access-Control-Allow-Origin',
  'Origin',
  'X-Requested-With',
  'Accept',
  'Content-Type',
];

export async function setupCors(app: NestFastifyApplication) {
  await app.register(fastifyCors, {
    origin: (origin, callback) => {
      if (origin === undefined || whitelist.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    allowedHeaders: allowedHeaders,
    methods: ['GET', 'PATCH', 'POST', 'DELETE'],
    exposedHeaders: 'cookies',
    credentials: true,
  });
}

export async function setupHelmets(app: NestFastifyApplication) {
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        frameAncestors: ["'self'", 'http://localhost:4200'],
        scriptSrc: [
          `'self'`,
          `https: 'unsafe-inline'`,
          `http: 'unsafe-inline'`,
          `cdn.jsdelivr.net`,
          `'unsafe-eval'`,
        ],
        frameSrc: [
          "'self'", // Allow content from the same origin
          // 'https://test-nbkpayment.mtf.gateway.mastercard.com', // Allow embedding from the external domain
        ],
      },
    },
  });
}

export async function setUpCookies(app: NestFastifyApplication) {
  await app.register(fastifyCookie, {
    secret: process.env.Access_token_secret,
    parseOptions: {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24,
      // sameSite: 'none',
      sameSite: 'strict',
    },
  });
}

export async function globalSetupValidations(app: NestFastifyApplication) {
  app.useLogger(new AppNameLogger());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.register(fastifyMultipart, {
    addToBody: true,
    limits: {
      fileSize: 10 * 1024 * 1024, // Set max file size to 10 MB
      files: 10, // Allow up to 10 files
    },
  });
  //app.useGlobalInterceptors(new CustomErrorHandler());
}

export async function trackSecurity(app: NestFastifyApplication) {
  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.addHook('onSend', (request, reply, payload, next) => {
    console.log('request header = ', request.headers);
    console.log('payload = ', payload);
    console.log('responce headers = ', reply.getHeaders()); // Log headers
    next();
  });
}
