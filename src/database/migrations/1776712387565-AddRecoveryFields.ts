import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRecoveryFields1776712387565 implements MigrationInterface {
    name = 'AddRecoveryFields1776712387565'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "recoveryToken" character varying`);
        await queryRunner.query(`ALTER TABLE "user" ADD "recoveryTokenExpires" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "recoveryTokenExpires"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "recoveryToken"`);
    }

}
