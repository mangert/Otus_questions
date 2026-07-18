// Defines environment-based backend configuration and its defaults.

export const defaultCorsOrigins = Object.freeze([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

/** Parses a comma-separated CORS origin list or returns local defaults. */
export const parseCorsOrigins = (value: string | undefined): string[] => {
  const origins = value
    ?.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');

  return origins && origins.length > 0
    ? [...new Set(origins)]
    : [...defaultCorsOrigins];
};

export const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);
