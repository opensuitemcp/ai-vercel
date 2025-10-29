CREATE TABLE IF NOT EXISTS "NetSuiteAuth" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"accountId" varchar(255) NOT NULL,
	"clientId" varchar(255) NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"tokenExpiresAt" timestamp,
	"codeVerifier" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "NetSuiteAuth" ADD CONSTRAINT "NetSuiteAuth_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
