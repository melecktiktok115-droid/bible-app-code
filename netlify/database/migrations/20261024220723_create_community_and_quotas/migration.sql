CREATE TABLE "blocks" (
	"owner" text,
	"target" text,
	CONSTRAINT "blocks_pkey" PRIMARY KEY("owner","target")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"sender" text NOT NULL,
	"recipient" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"admin_id" text NOT NULL,
	"target" text NOT NULL,
	"decision" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotas" (
	"user_id" text,
	"day" text,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "quotas_pkey" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"target" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sanctions" (
	"user_id" text PRIMARY KEY,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
