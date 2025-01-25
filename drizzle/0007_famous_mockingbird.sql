ALTER TABLE `results` RENAME COLUMN `user` TO `userName`;--> statement-breakpoint
ALTER TABLE `results` ADD `userEmail` text;