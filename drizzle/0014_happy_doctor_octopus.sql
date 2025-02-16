CREATE TABLE `calendarEvents` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`exclusive` text,
	`description` text,
	`location` text,
	`participants` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
