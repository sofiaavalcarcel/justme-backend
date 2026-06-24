import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserProfileFields1782250172921 implements MigrationInterface {
    name = 'AddUserProfileFields1782250172921'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "birthDate" date`);
        await queryRunner.query(`ALTER TABLE "user" ADD "city" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "user" ADD "bio" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "bio"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "city"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "birthDate"`);
    }

}
