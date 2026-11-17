CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` text NOT NULL,
	`time_sec` integer NOT NULL,
	`type` text NOT NULL,
	`detail` text,
	`team_id` integer NOT NULL,
	`is_ally` integer NOT NULL,
	`killer` text,
	`victim` text,
	`assists` text,
	`involves_me` integer NOT NULL,
	`my_involvement` text,
	`x` integer,
	`y` integer,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`match_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `events_match_idx` ON `events` (`match_id`,`time_sec`);--> statement-breakpoint
CREATE TABLE `frames` (
	`match_id` text NOT NULL,
	`minute` integer NOT NULL,
	`participant_id` integer NOT NULL,
	`gold` integer NOT NULL,
	`cs` integer NOT NULL,
	`xp` integer NOT NULL,
	`level` integer NOT NULL,
	PRIMARY KEY(`match_id`, `minute`, `participant_id`),
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`match_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `item_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` text NOT NULL,
	`time_sec` integer NOT NULL,
	`action` text NOT NULL,
	`item_id` integer NOT NULL,
	`item` text NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`match_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `item_events_match_idx` ON `item_events` (`match_id`,`time_sec`);--> statement-breakpoint
CREATE TABLE `matches` (
	`match_id` text PRIMARY KEY NOT NULL,
	`game_start_ms` integer NOT NULL,
	`start_jst` text NOT NULL,
	`duration_sec` integer NOT NULL,
	`result` text NOT NULL,
	`win` integer NOT NULL,
	`remake` integer DEFAULT false NOT NULL,
	`my_team_id` integer NOT NULL,
	`my_participant_id` integer NOT NULL,
	`my_champion_id` integer NOT NULL,
	`my_champion` text NOT NULL,
	`my_role` text NOT NULL,
	`opponent_participant_id` integer,
	`opponent_champion_id` integer,
	`opponent_champion` text,
	`patch` text NOT NULL,
	`game_version` text NOT NULL,
	`ddragon_version` text NOT NULL,
	`imported_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`match_id` text NOT NULL,
	`participant_id` integer NOT NULL,
	`puuid` text NOT NULL,
	`is_me` integer NOT NULL,
	`team_id` integer NOT NULL,
	`win` integer NOT NULL,
	`role` text NOT NULL,
	`champion_id` integer NOT NULL,
	`champion_key` text NOT NULL,
	`champion` text NOT NULL,
	`player_name` text NOT NULL,
	`kills` integer NOT NULL,
	`deaths` integer NOT NULL,
	`assists` integer NOT NULL,
	`kill_participation` real NOT NULL,
	`damage_dealt` integer NOT NULL,
	`damage_taken` integer NOT NULL,
	`gold` integer NOT NULL,
	`cs` integer NOT NULL,
	`level` integer NOT NULL,
	`vision_score` integer NOT NULL,
	`wards_placed` integer NOT NULL,
	`wards_killed` integer NOT NULL,
	`control_wards_bought` integer NOT NULL,
	`runes` text NOT NULL,
	`summoner_spells` text NOT NULL,
	`items` text NOT NULL,
	PRIMARY KEY(`match_id`, `participant_id`),
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`match_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `raw_matches` (
	`match_id` text PRIMARY KEY NOT NULL,
	`match` text NOT NULL,
	`timeline` text,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` text NOT NULL,
	`category` text NOT NULL,
	`position` integer NOT NULL,
	`item` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`match_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reviews_match_idx` ON `reviews` (`match_id`);--> statement-breakpoint
CREATE TABLE `skill_order` (
	`match_id` text NOT NULL,
	`level` integer NOT NULL,
	`time_sec` integer NOT NULL,
	`slot` text NOT NULL,
	`skill` text NOT NULL,
	PRIMARY KEY(`match_id`, `level`),
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`match_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `team_stats` (
	`match_id` text NOT NULL,
	`team_id` integer NOT NULL,
	`is_my_team` integer NOT NULL,
	`win` integer NOT NULL,
	`kills` integer NOT NULL,
	`towers` integer NOT NULL,
	`inhibitors` integer NOT NULL,
	`dragons` integer NOT NULL,
	`barons` integer NOT NULL,
	`heralds` integer NOT NULL,
	`void_grubs` integer NOT NULL,
	`atakhans` integer NOT NULL,
	`first_blood` integer NOT NULL,
	`first_tower` integer NOT NULL,
	`first_dragon` integer NOT NULL,
	PRIMARY KEY(`match_id`, `team_id`),
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`match_id`) ON UPDATE no action ON DELETE cascade
);
