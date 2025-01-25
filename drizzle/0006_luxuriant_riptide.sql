ALTER TABLE `sessions` RENAME COLUMN `user` TO `userName`;--> statement-breakpoint
ALTER TABLE `sessions` ADD `userEmail` text;