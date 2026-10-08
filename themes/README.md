# Site themes

YOYOL and Green come with the system. A school can activate one, or upload its own colours later.

## Package

This folder follows the kernel extension layout:

- `yoyol.extension.json` declares the plugin
- `entrypoint.ts` is the bundled entrypoint
- `locales/` has English and Swahili
- `themes/` holds theme package JSON
- `src/` holds the theme document checker

Themes is a plugin, so it does not own tables. The kernel stores the active theme in `school_themes`.
