export enum Envconfig {
  dev = '.env.dev',
  test = '.env.test',
  prod = '.env.prod',
}

export function getEnvFilePath(): string {
  switch (process.env.NODE_ENV) {
    case 'prod':
      return Envconfig.prod;
    case 'test':
      return Envconfig.test;
    case 'dev':
    default:
      return Envconfig.dev;
  }
}
