CREATE TABLE `mock_redirect_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`client_id` varchar(255) NOT NULL,
	`from_url` varchar(500),
	`to_url` varchar(500) NOT NULL,
	`triggered_by` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mock_redirect_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mock_sse_sessions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`client_id` varchar(255) NOT NULL,
	`user_id` int,
	`connected_at` timestamp NOT NULL DEFAULT (now()),
	`last_activity_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`metadata` text,
	CONSTRAINT `mock_sse_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `mock_sse_sessions_client_id_unique` UNIQUE(`client_id`)
);
--> statement-breakpoint
CREATE TABLE `mock_users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`nickname` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mock_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `mock_users_nickname_unique` UNIQUE(`nickname`)
);
