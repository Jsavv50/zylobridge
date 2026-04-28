CREATE TABLE `email_otps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`otp` varchar(8) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`verified` boolean NOT NULL DEFAULT false,
	`attempts` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_otps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);