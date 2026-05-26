import { MigrationInterface, QueryRunner } from "typeorm";

export class Migracion1773698255684 implements MigrationInterface {
    name = 'Migracion1773698255684'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ─── Alter existing tables to add new columns ───────────────────
        await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "phone" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "avatar" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "loyaltyPoints" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "refreshToken" text`);
        await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "lastName" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "docType" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "docNumber" DROP NOT NULL`);

        // ─── New domain tables ───────────────────────────────────────────
        await queryRunner.query(`CREATE TABLE "wallets" ("id" SERIAL NOT NULL, "professionalId" integer NOT NULL, "balance" numeric(12,2) NOT NULL DEFAULT '0', "currency" character varying(10) NOT NULL DEFAULT 'USD', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_6594bc25d67de3ed94c800dd02" UNIQUE ("professionalId"), CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('payment', 'commission', 'recharge', 'payout')`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_status_enum" AS ENUM('completed', 'pending', 'failed')`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" SERIAL NOT NULL, "walletId" integer NOT NULL, "type" "public"."transactions_type_enum" NOT NULL, "amount" numeric(12,2) NOT NULL, "description" character varying(500) NOT NULL, "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'completed', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "services" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "icon" character varying(100), "category" character varying(100) NOT NULL, "description" text, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "professional_services" ("id" SERIAL NOT NULL, "professionalId" integer NOT NULL, "serviceId" integer NOT NULL, "price" numeric(10,2) NOT NULL, "duration" integer NOT NULL, "description" text, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_0a792d3d12548bf1ae788f55654" PRIMARY KEY ("id")); COMMENT ON COLUMN "professional_services"."duration" IS 'Duration in minutes'`);
        await queryRunner.query(`CREATE TABLE "schedule_breaks" ("id" SERIAL NOT NULL, "scheduleId" integer NOT NULL, "title" character varying(100) NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, CONSTRAINT "PK_d8b9da07c5926fb28d2b7c371e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "schedules" ("id" SERIAL NOT NULL, "professionalId" integer NOT NULL, "dayOfWeek" character varying(20) NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_7e33fc2ea755a5765e3564e66dd" PRIMARY KEY ("id")); COMMENT ON COLUMN "schedules"."dayOfWeek" IS 'e.g. Monday, Tuesday, etc.'`);
        await queryRunner.query(`CREATE TABLE "reviews" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "professionalId" integer NOT NULL, "bookingId" integer, "rating" numeric(2,1) NOT NULL, "comment" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "professionals" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "bio" text, "latitude" numeric(10,7), "longitude" numeric(10,7), "address" character varying(500), "serviceRadius" numeric(5,2) NOT NULL DEFAULT '5', "verified" boolean NOT NULL DEFAULT false, "completedServices" integer NOT NULL DEFAULT '0', "averageRating" numeric(3,2) NOT NULL DEFAULT '0', "reviewCount" integer NOT NULL DEFAULT '0', "isVisible" boolean NOT NULL DEFAULT true, "joinDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_6104e0ee835d83143d5cbae2b1" UNIQUE ("userId"), CONSTRAINT "PK_d7dc8473b49fcd938def2799387" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('booking', 'wallet', 'review', 'system')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "title" character varying(255) NOT NULL, "message" text NOT NULL, "type" "public"."notifications_type_enum" NOT NULL DEFAULT 'system', "isRead" boolean NOT NULL DEFAULT false, "data" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "portfolio_images" ("id" SERIAL NOT NULL, "professionalId" integer NOT NULL, "imageUrl" character varying(500) NOT NULL, "caption" character varying(255), "order" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4fb584b54f9368be1a6612a4e83" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "favorites" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "professionalId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c0726d738cddf25512c7f0e3457" UNIQUE ("userId", "professionalId"), CONSTRAINT "PK_890818d27523748dd36a4d1bdc8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."incentive_programs_rewardtype_enum" AS ENUM('bonus', 'commission_free')`);
        await queryRunner.query(`CREATE TABLE "incentive_programs" ("id" SERIAL NOT NULL, "title" character varying(255) NOT NULL, "description" text NOT NULL, "targetServices" integer NOT NULL, "rewardValue" numeric(10,2) NOT NULL, "rewardType" "public"."incentive_programs_rewardtype_enum" NOT NULL DEFAULT 'bonus', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_7e497284b3881dbd1dc25598f39" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "coupons" ("id" SERIAL NOT NULL, "code" character varying(50) NOT NULL, "discount" integer NOT NULL, "description" character varying(255) NOT NULL, "expiresAt" date NOT NULL, "userId" integer, "isUsed" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e025109230e82925843f2a14c48" UNIQUE ("code"), CONSTRAINT "PK_d7ea8864a0150183770f3e9a8cb" PRIMARY KEY ("id")); COMMENT ON COLUMN "coupons"."discount" IS 'Discount percentage (15, 20, 30)'`);
        await queryRunner.query(`CREATE TYPE "public"."bookings_status_enum" AS ENUM('pending', 'confirmed', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TYPE "public"."bookings_locationtype_enum" AS ENUM('professional', 'home')`);
        await queryRunner.query(`CREATE TABLE "bookings" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "professionalId" integer NOT NULL, "professionalServiceId" integer NOT NULL, "date" date NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "status" "public"."bookings_status_enum" NOT NULL DEFAULT 'confirmed', "price" numeric(10,2) NOT NULL, "location" character varying(500), "locationType" "public"."bookings_locationtype_enum" NOT NULL DEFAULT 'professional', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`);

        // ─── Foreign keys for new tables ─────────────────────────────────
        await queryRunner.query(`ALTER TABLE "wallets" ADD CONSTRAINT "FK_6594bc25d67de3ed94c800dd02c" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_a88f466d39796d3081cf96e1b66" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "professional_services" ADD CONSTRAINT "FK_ed45de526444e6dcaf0591ac56e" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "professional_services" ADD CONSTRAINT "FK_b4a2af28688daa756c0ce0c84a8" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schedule_breaks" ADD CONSTRAINT "FK_d25bfa71120389a1a6b62001803" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schedules" ADD CONSTRAINT "FK_0cd2e6104498cfadfcebc60e1d3" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_7ed5659e7139fc8bc039198cc1f" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_4f67c9296d687e0f144a961cf46" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "professionals" ADD CONSTRAINT "FK_6104e0ee835d83143d5cbae2b1a" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "portfolio_images" ADD CONSTRAINT "FK_8756695c6f1bbccaa3b95550522" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "favorites" ADD CONSTRAINT "FK_e747534006c6e3c2f09939da60f" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "favorites" ADD CONSTRAINT "FK_c72fc6c1b4c84bf7077a2bdeabd" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "coupons" ADD CONSTRAINT "FK_81dcb5419991c66b6fd4a1b6188" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_38a69a58a323647f2e75eb994de" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_2b528b862fd94d290bda8d83e1c" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_c35a7b75dc7d57787c3ec2bfcc5" FOREIGN KEY ("professionalServiceId") REFERENCES "professional_services"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_c35a7b75dc7d57787c3ec2bfcc5"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_2b528b862fd94d290bda8d83e1c"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_38a69a58a323647f2e75eb994de"`);
        await queryRunner.query(`ALTER TABLE "coupons" DROP CONSTRAINT "FK_81dcb5419991c66b6fd4a1b6188"`);
        await queryRunner.query(`ALTER TABLE "favorites" DROP CONSTRAINT "FK_c72fc6c1b4c84bf7077a2bdeabd"`);
        await queryRunner.query(`ALTER TABLE "favorites" DROP CONSTRAINT "FK_e747534006c6e3c2f09939da60f"`);
        await queryRunner.query(`ALTER TABLE "portfolio_images" DROP CONSTRAINT "FK_8756695c6f1bbccaa3b95550522"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_692a909ee0fa9383e7859f9b406"`);
        await queryRunner.query(`ALTER TABLE "professionals" DROP CONSTRAINT "FK_6104e0ee835d83143d5cbae2b1a"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_4f67c9296d687e0f144a961cf46"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_7ed5659e7139fc8bc039198cc1f"`);
        await queryRunner.query(`ALTER TABLE "schedules" DROP CONSTRAINT "FK_0cd2e6104498cfadfcebc60e1d3"`);
        await queryRunner.query(`ALTER TABLE "schedule_breaks" DROP CONSTRAINT "FK_d25bfa71120389a1a6b62001803"`);
        await queryRunner.query(`ALTER TABLE "professional_services" DROP CONSTRAINT "FK_b4a2af28688daa756c0ce0c84a8"`);
        await queryRunner.query(`ALTER TABLE "professional_services" DROP CONSTRAINT "FK_ed45de526444e6dcaf0591ac56e"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_a88f466d39796d3081cf96e1b66"`);
        await queryRunner.query(`ALTER TABLE "wallets" DROP CONSTRAINT "FK_6594bc25d67de3ed94c800dd02c"`);
        await queryRunner.query(`DROP TABLE "bookings"`);
        await queryRunner.query(`DROP TYPE "public"."bookings_locationtype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."bookings_status_enum"`);
        await queryRunner.query(`DROP TABLE "coupons"`);
        await queryRunner.query(`DROP TABLE "incentive_programs"`);
        await queryRunner.query(`DROP TYPE "public"."incentive_programs_rewardtype_enum"`);
        await queryRunner.query(`DROP TABLE "favorites"`);
        await queryRunner.query(`DROP TABLE "portfolio_images"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TABLE "professionals"`);
        await queryRunner.query(`DROP TABLE "reviews"`);
        await queryRunner.query(`DROP TABLE "schedules"`);
        await queryRunner.query(`DROP TABLE "schedule_breaks"`);
        await queryRunner.query(`DROP TABLE "professional_services"`);
        await queryRunner.query(`DROP TABLE "services"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
        await queryRunner.query(`DROP TABLE "wallets"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "createdAt"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "refreshToken"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "loyaltyPoints"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "avatar"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "phone"`);
    }
}
