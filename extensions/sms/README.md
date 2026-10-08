# SMS

A notification channel that records an SMS for a guardian, with a delivery receipt.

The sender is a per-school setting. When the gateway setting is empty, the receipt says the message was not sent. Saving a gateway address does not place the call. This server has no SMS provider binding.

## Package

- `yoyol.extension.json` declares the plugin and the `notifications.channel` provider
- `entrypoint.ts` lists receipts at `/x/sms`
- `locales/` has English and Swahili

Receipts are stored on the kernel `notifications` table. A plugin does not own a schema.
