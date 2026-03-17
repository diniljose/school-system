export enum Envconfig {
  dev = '.env.dev',
  test = '.env.test',
  prod = '.env.prod',
}

export function getEnvFilePath(): string {
  switch ((process.env.NODE_ENV || 'dev').toLowerCase()) {
    case 'production':
    case 'prod':
      return Envconfig.prod;
    case 'test':
      return Envconfig.test;
    case 'development':
    case 'dev':
    default:
      return Envconfig.dev;
  }
}
