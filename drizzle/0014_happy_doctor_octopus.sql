CREATE TABLE `calendarEvents` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`exclusive` text,
	`description` text,
	`location` text,
	`agentId` text,
	`participants` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`sessionId` text,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
