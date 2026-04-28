CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`professionalId` int NOT NULL,
	`coverLetter` text NOT NULL,
	`bidAmount` decimal(12,2) NOT NULL,
	`status` enum('pending','accepted','rejected','withdrawn') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`vocation` enum('electrician','carpenter','plumber','mason_bricklayer','painter','flooring_tiler','heavy_equipment_operator','road_construction_worker','hvac_technician','elevator_installer_repairer','pest_control_technician','glazier') NOT NULL,
	`budget` decimal(12,2) NOT NULL,
	`location` varchar(255) NOT NULL,
	`deadline` timestamp,
	`status` enum('open','in_progress','completed','cancelled') NOT NULL DEFAULT 'open',
	`assignedProfessionalId` int,
	`isUrgent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`vocation` enum('electrician','carpenter','plumber','mason_bricklayer','painter','flooring_tiler','heavy_equipment_operator','road_construction_worker','hvac_technician','elevator_installer_repairer','pest_control_technician','glazier') NOT NULL,
	`bio` text,
	`skills` text,
	`certifications` text,
	`portfolioUrl` text,
	`hourlyRate` decimal(10,2),
	`location` varchar(255),
	`yearsExperience` int,
	`averageRating` decimal(3,2) DEFAULT '0.00',
	`totalReviews` int NOT NULL DEFAULT 0,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`revieweeId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `userType` enum('client','professional','unset') DEFAULT 'unset' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `isVerified` boolean DEFAULT false NOT NULL;