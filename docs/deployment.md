# Deployment

## Local Cloudflare

```bash
pnpm install
cp .dev.vars.example .dev.vars
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`pnpm db:migrate` updates the local D1 database named `yoyol-student-system`. `pnpm build` then `pnpm deploy:production` builds the Worker and deploys it with Wrangler. Remote migration is a separate command and is not part of local work.

## Not configured

These are named in the architecture and are not set up in this repository:

- R2 for files and package storage
- Cloudflare Queues
- Cron Triggers
- A Worker Loader binding for zip upload
- A Docker image and a Compose file with PostgreSQL
- A tested backup and restore

Until those exist, package upload stays hidden, channel receipts stay `not_sent`, and fee reminders run only when an administrator presses the button.
