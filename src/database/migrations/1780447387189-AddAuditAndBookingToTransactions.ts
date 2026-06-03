import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditAndBookingToTransactions1780447387189 implements MigrationInterface {
    name = 'AddAuditAndBookingToTransactions1780447387189'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Add the new audit and booking columns
        await queryRunner.query(`ALTER TABLE "transactions" ADD "serviceAmount" numeric(12,2)`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "commissionPercentage" numeric(5,4)`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "balanceBefore" numeric(12,2)`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "balanceAfter" numeric(12,2)`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "relatedBookingId" integer`);

        // 2. Temporarily cast type column to varchar to allow enum modification without dropping data
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "type" TYPE varchar(50)`);

        // 3. Drop the old enum type definition
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);

        // 4. Update existing enum string values to match the new uppercase schema
        await queryRunner.query(`UPDATE "transactions" SET "type" = 'TOP_UP' WHERE "type" = 'recharge'`);
        await queryRunner.query(`UPDATE "transactions" SET "type" = 'COMMISSION' WHERE "type" = 'commission'`);
        await queryRunner.query(`UPDATE "transactions" SET "type" = 'ADJUSTMENT' WHERE "type" IN ('payment', 'payout')`);

        // 5. Create the new enum type definition
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('TOP_UP', 'COMMISSION', 'ADJUSTMENT', 'REFUND', 'BONUS')`);

        // 6. Cast the column back to the new enum type
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "public"."transactions_type_enum" USING "type"::"public"."transactions_type_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 1. Temporarily cast type column to varchar
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "type" TYPE varchar(50)`);

        // 2. Drop the new enum definition
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);

        // 3. Revert uppercase strings back to lowercase/original strings
        await queryRunner.query(`UPDATE "transactions" SET "type" = 'recharge' WHERE "type" = 'TOP_UP'`);
        await queryRunner.query(`UPDATE "transactions" SET "type" = 'commission' WHERE "type" = 'COMMISSION'`);
        await queryRunner.query(`UPDATE "transactions" SET "type" = 'payment' WHERE "type" IN ('ADJUSTMENT', 'REFUND', 'BONUS')`);

        // 4. Create the old enum type definition
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('payment', 'commission', 'recharge', 'payout')`);

        // 5. Cast the column back to the old enum type
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "public"."transactions_type_enum" USING "type"::"public"."transactions_type_enum"`);

        // 6. Drop the new audit/booking columns
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "relatedBookingId"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "balanceAfter"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "balanceBefore"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "commissionPercentage"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "serviceAmount"`);
    }
}
