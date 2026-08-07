import { loadWebConfig } from '@pci/config';

export const webConfig = loadWebConfig(
  import.meta.env as unknown as Record<string, string | undefined>,
);
