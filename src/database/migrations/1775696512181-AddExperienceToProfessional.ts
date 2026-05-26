import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExperienceToProfessional1775696512181 implements MigrationInterface {
    name = 'AddExperienceToProfessional1775696512181'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "professionals" ADD "experience" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "professionals" DROP COLUMN "experience"`);
    }

}
