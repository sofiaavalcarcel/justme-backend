import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNameToProfessionalService1780425411848 implements MigrationInterface {
    name = 'AddNameToProfessionalService1780425411848'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "professional_services" ADD "name" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'pending'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'confirmed'`);
        await queryRunner.query(`ALTER TABLE "professional_services" DROP COLUMN "name"`);
    }

}
