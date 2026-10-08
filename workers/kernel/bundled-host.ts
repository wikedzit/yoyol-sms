import { findBundledEntrypoint } from './bundled-entrypoints';
import { createBundledExtensionHost } from './extension-host';

export const bundledExtensionHost = createBundledExtensionHost(findBundledEntrypoint);
