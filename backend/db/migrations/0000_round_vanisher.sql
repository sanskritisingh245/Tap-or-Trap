CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"player_one" text NOT NULL,
	"player_two" text NOT NULL,
	"state" text DEFAULT 'WAITING' NOT NULL,
	"draw_time_ms" bigint,
	"draw_fired_at" bigint,
	"draw_secret" text,
	"draw_commitment" text,
	"player_one_tap_at" bigint,
	"player_one_reaction_ms" real,
	"player_one_early" integer DEFAULT 0,
	"player_two_tap_at" bigint,
	"player_two_reaction_ms" real,
	"player_two_early" integer DEFAULT 0,
	"winner" text,
	"forfeit_reason" text,
	"escrow_tx" text,
	"settle_tx" text,
	"mode" text DEFAULT 'single' NOT NULL,
	"series_id" text,
	"round_number" integer DEFAULT 1,
	"created_at" bigint NOT NULL,
	"settled_at" bigint
);
--> statement-breakpoint
CREATE TABLE "players" (
	"wallet" text PRIMARY KEY NOT NULL,
	"session_token" text,
	"session_expires" bigint,
	"nonce" text,
	"nonce_expires" bigint,
	"avg_rtt_ms" real DEFAULT 100,
	"last_seen" bigint,
	"credits" integer DEFAULT 100 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"max_streak" integer DEFAULT 0 NOT NULL,
	"best_reaction_ms" real,
	"total_matches" integer DEFAULT 0 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"tier" text DEFAULT 'BRONZE' NOT NULL,
	"last_login_date" text,
	"login_streak" integer DEFAULT 0 NOT NULL,
	"winnings" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet" text NOT NULL,
	"challenge_type" text NOT NULL,
	"target" integer NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"completed" integer DEFAULT 0 NOT NULL,
	"reward_xp" integer DEFAULT 0 NOT NULL,
	"reward_credits" integer DEFAULT 0 NOT NULL,
	"date" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"wallet" text NOT NULL,
	"achievement_id" text NOT NULL,
	"unlocked_at" bigint NOT NULL,
	CONSTRAINT "achievements_wallet_achievement_id_pk" PRIMARY KEY("wallet","achievement_id")
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" text PRIMARY KEY NOT NULL,
	"player_one" text NOT NULL,
	"player_two" text NOT NULL,
	"score_one" integer DEFAULT 0 NOT NULL,
	"score_two" integer DEFAULT 0 NOT NULL,
	"mode" text DEFAULT 'bo3' NOT NULL,
	"state" text DEFAULT 'ACTIVE' NOT NULL,
	"winner" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queue" (
	"wallet" text PRIMARY KEY NOT NULL,
	"joined_at" bigint NOT NULL,
	"mode" text DEFAULT 'single' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_bets" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet" text NOT NULL,
	"game_type" text NOT NULL,
	"amount" integer NOT NULL,
	"payout" integer DEFAULT 0,
	"won" integer,
	"result" text,
	"server_seed" text,
	"client_seed" text,
	"nonce" integer,
	"seed_hash" text,
	"state" text DEFAULT 'resolved',
	"mines_revealed" text,
	"mine_count" integer,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crash_rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"crash_point" real NOT NULL,
	"server_seed" text,
	"seed_hash" text NOT NULL,
	"state" text DEFAULT 'betting',
	"started_at" bigint,
	"crashed_at" bigint,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crash_players" (
	"round_id" text NOT NULL,
	"wallet" text NOT NULL,
	"bet_amount" integer NOT NULL,
	"cashed_out_at" real,
	"payout" integer DEFAULT 0,
	CONSTRAINT "crash_players_round_id_wallet_pk" PRIMARY KEY("round_id","wallet")
);
--> statement-breakpoint
CREATE TABLE "used_topup_signatures" (
	"signature" text PRIMARY KEY NOT NULL,
	"wallet" text NOT NULL,
	"credits_granted" integer NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"code" text PRIMARY KEY NOT NULL,
	"creator_wallet" text NOT NULL,
	"joiner_wallet" text,
	"match_id" text,
	"status" text DEFAULT 'WAITING' NOT NULL,
	"created_at" bigint NOT NULL,
	"expires_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "daily_challenges_wallet_type_date" ON "daily_challenges" USING btree ("wallet","challenge_type","date");