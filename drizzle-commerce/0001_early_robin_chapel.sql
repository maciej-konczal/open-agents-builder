ALTER TABLE `products` RENAME COLUMN `priceValue` TO `price`;--> statement-breakpoint
ALTER TABLE `products` RENAME COLUMN `priceCurrency` TO `currency`;--> statement-breakpoint
ALTER TABLE `products` RENAME COLUMN `priceInclTaxValue` TO `priceInclTax`;--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `priceInclTaxCurrency`;