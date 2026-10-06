# 0008. Site themes are uploaded token packages

- Status: Accepted
- Date: 2026-10-06

## Context

Schools want the same YOYOL screens with their own colours. The school profile already stores a primary and secondary colour, and the app already has a light and dark toggle. That is not enough for a full site theme, and it is not an extension.

ADR 0006 forbids installed extensions from sending HTML, scripts, or style overrides. A theme that accepts raw CSS could change layout, hide controls, or load remote images. The current product must keep looking and behaving as it does today until a school deliberately activates another theme.

## Decision

1. Site themes are the bundled plugin `themes` (`provides: ["themes.package"]`). They are not kernel screens and they are not executable code.
2. A theme package is a JSON document, version 1, with a key, English and Swahili names, and a fixed set of hex colours for light and dark. The schema lives in `extensions/themes`. Extra fields, non-hex colours, and files over 64 KB are rejected.
3. The core stores accepted packages in `school_themes`. The plugin never receives a database connection (ADR 0003).
4. The bundled theme key `yoyol` is reserved. While it is active, the core injects no colour overrides, so the stylesheet already in the app is what people see.
5. A school administrator uploads and activates themes for their own school from the school profile. This is not the extension-zip upload in ADR 0005. Arbitrary CSS and third-party code stay out.
6. Light and dark mode stay the existing toggle. An active theme only supplies the colours for each mode.

## Consequences

- Existing pages, navigation, and the default purple look stay in place.
- Uploaded themes can change colours only, through the CSS variables the app already uses.
- View documents (ADR 0006) later map `tone` through the same active theme.
- A school with several active themes is not switched per page until the school switcher (ADR 0002) exists. Until then the most recently activated theme for that account is applied across the dashboard.
