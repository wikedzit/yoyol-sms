# Email

A notification channel that records a transactional email for a guardian, with a delivery receipt.

The sender is a per-school setting. When the gateway setting is empty, the receipt says the message was not sent. Saving a gateway address does not place the call. This server has no email provider binding.

## Package

- `yoyol.extension.json` declares the plugin and the `notifications.channel` provider
- `entrypoint.ts` lists receipts at `/x/email`
- `locales/` has English and Swahili

Receipts are stored on the kernel `notifications` table. A plugin does not own a schema.
