// src/helpers/app-info.ts
import { name, version } from '../../package.json';

export const AppInfo = {
  name,
  version,
  fullName: `${name}-${version}`,
};
