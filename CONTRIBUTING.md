# Contributing

Work happens on a branch. Do not commit architecture changes straight to `develop`.

1. Install and start the app with the sequence in [docs/contributor-quickstart.md](docs/contributor-quickstart.md).
2. Add a test named after the feature id from [docs/features.md](docs/features.md).
3. Keep queries scoped to the active school, and check permission with `can()`.
4. Add English and Swahili copy together.
5. Run `node --experimental-strip-types --test workers/kernel/<file>.test.ts` for the kernel test you changed.

Do not commit `.dev.vars`, signing keys, or passwords. A private extension signing key belongs in the CI secret `YOYOL_SIGNING_KEY`.

Pull requests name the feature ids they close. The checklist is [docs/plans/adopt-pluggable-architecture.md](docs/plans/adopt-pluggable-architecture.md).
