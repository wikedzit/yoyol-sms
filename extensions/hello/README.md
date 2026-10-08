# Hello

A bundled plugin that proves a school can turn an extension on and off.

## Package

This folder follows the kernel extension layout:

- `yoyol.extension.json` declares the plugin
- `entrypoint.ts` is the bundled entrypoint
- `locales/` has English and Swahili

Hello has no tables, so it has no `schema/` folder. A plugin is rejected if it adds one.

The kernel lists every valid folder on the Extensions page.
