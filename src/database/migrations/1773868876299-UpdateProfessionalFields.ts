import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateProfessionalFields1773868876299 implements MigrationInterface {
    name = 'UpdateProfessionalFields1773868876299'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "professionals" DROP COLUMN IF EXISTS "certificationNumber"`);
        await queryRunner.query(`ALTER TABLE "professionals" ADD "certificationNumber" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "professionals" DROP COLUMN IF EXISTS "specialties"`);
        await queryRunner.query(`ALTER TABLE "professionals" ADD "specialties" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "professionals" DROP COLUMN IF EXISTS "specialties"`);
        await queryRunner.query(`ALTER TABLE "professionals" ADD "specialties" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "professionals" DROP COLUMN IF EXISTS "certificationNumber"`);
        await queryRunner.query(`ALTER TABLE "professionals" ADD "certificationNumber" character varying(100)`);
    }

}
