import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProSchedulePreferences1775759311610 implements MigrationInterface {
    name = 'AddProSchedulePreferences1775759311610'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "professionals" ADD "maxAppointments" integer NOT NULL DEFAULT '8'`);
        await queryRunner.query(`ALTER TABLE "professionals" ADD "bufferTime" integer NOT NULL DEFAULT '15'`);
        await queryRunner.query(`COMMENT ON COLUMN "professionals"."bufferTime" IS 'Buffer time in minutes'`);
        await queryRunner.query(`ALTER TABLE "professionals" ADD "advanceNotice" integer NOT NULL DEFAULT '2'`);
        await queryRunner.query(`COMMENT ON COLUMN "professionals"."advanceNotice" IS 'Advance notice in hours'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "professionals"."advanceNotice" IS 'Advance notice in hours'`);
        await queryRunner.query(`ALTER TABLE "professionals" DROP COLUMN "advanceNotice"`);
        await queryRunner.query(`COMMENT ON COLUMN "professionals"."bufferTime" IS 'Buffer time in minutes'`);
        await queryRunner.query(`ALTER TABLE "professionals" DROP COLUMN "bufferTime"`);
        await queryRunner.query(`ALTER TABLE "professionals" DROP COLUMN "maxAppointments"`);
    }

}
