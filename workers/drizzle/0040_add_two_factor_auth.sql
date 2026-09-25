ALTER TABLE `users` ADD `two_factor_secret` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `two_factor_recovery_codes` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `two_factor_confirmed_at` integer;