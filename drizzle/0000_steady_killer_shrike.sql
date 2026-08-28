CREATE TYPE "public"."delivery_attempt_status" AS ENUM('SCHEDULED', 'PROCESSING', 'FAILED', 'DELIVERED');--> statement-breakpoint
CREATE TYPE "public"."delivery_failure_reason" AS ENUM('ACCOUNT_CLOSED', 'INVALID_ACCOUNT', 'BANK_REJECTED', 'IDENTITY_MISMATCH', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."destination_validation_status" AS ENUM('UNVALIDATED', 'VALIDATING', 'VALIDATED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."obligation_status" AS ENUM('OWED', 'BLOCKED', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"obligation_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"obligation_id" uuid NOT NULL,
	"destination_id" uuid NOT NULL,
	"status" "delivery_attempt_status" NOT NULL,
	"failure_reason" "delivery_failure_reason",
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "government_obligations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount_paise" bigint NOT NULL,
	"assessment_year" text NOT NULL,
	"status" "obligation_status" NOT NULL,
	"legal_hold" boolean DEFAULT false NOT NULL,
	"adjustment_pending" boolean DEFAULT false NOT NULL,
	"identity_conflict" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refund_destinations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"bank_name" text NOT NULL,
	"masked_account" text NOT NULL,
	"account_holder" text NOT NULL,
	"validation_status" "destination_validation_status" NOT NULL,
	"refund_authorized" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"validated_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_obligation_id_government_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."government_obligations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_obligation_id_government_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."government_obligations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_destination_id_refund_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."refund_destinations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "government_obligations" ADD CONSTRAINT "government_obligations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_destinations" ADD CONSTRAINT "refund_destinations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_obligation_created_at_idx" ON "audit_events" USING btree ("obligation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_attempts_idempotency_key_unique" ON "delivery_attempts" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "delivery_attempts_obligation_id_idx" ON "delivery_attempts" USING btree ("obligation_id");--> statement-breakpoint
CREATE INDEX "delivery_attempts_obligation_status_idx" ON "delivery_attempts" USING btree ("obligation_id","status");--> statement-breakpoint
CREATE INDEX "government_obligations_user_id_idx" ON "government_obligations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "government_obligations_user_status_idx" ON "government_obligations" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "refund_destinations_user_id_idx" ON "refund_destinations" USING btree ("user_id");