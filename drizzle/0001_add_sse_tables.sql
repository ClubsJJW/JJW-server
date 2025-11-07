-- Add SSE tables for Channel Talk integration
-- Migration: 0001_add_sse_tables

-- Create sse_connections table
CREATE TABLE `sse_connections` (
  `id` serial AUTO_INCREMENT PRIMARY KEY,
  `channel_id` varchar(255) NOT NULL,
  `user_chat_id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `client_connection_id` varchar(255) NOT NULL UNIQUE,
  `member_id` varchar(255),
  `member_hash` varchar(255),
  `medium_type` varchar(50) DEFAULT 'web',
  `medium_key` varchar(255),
  `session_id` varchar(255),
  `connected_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `last_activity_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `ttl_expires_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `metadata` text,
  INDEX `idx_sse_matching` (`channel_id`, `user_chat_id`, `medium_key`, `ttl_expires_at`),
  INDEX `idx_user_chat` (`user_chat_id`, `ttl_expires_at`),
  INDEX `idx_client_connection` (`client_connection_id`),
  INDEX `idx_channel_user` (`channel_id`, `user_id`)
);

-- Create sse_events table
CREATE TABLE `sse_events` (
  `id` serial AUTO_INCREMENT PRIMARY KEY,
  `client_connection_id` varchar(255) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `event_data` text NOT NULL,
  `user_chat_id` varchar(255),
  `channel_id` varchar(255),
  `delivered` int DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_event_lookup` (`client_connection_id`, `created_at`),
  INDEX `idx_chat_event` (`user_chat_id`, `created_at`)
);
