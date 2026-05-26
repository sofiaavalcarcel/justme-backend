import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserLocationAndAddresses1776980066187 implements MigrationInterface {
    name = 'AddUserLocationAndAddresses1776980066187'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "addresses" jsonb DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "user" ADD "latitude" numeric(10,7)`);
        await queryRunner.query(`ALTER TABLE "user" ADD "longitude" numeric(10,7)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "longitude"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "latitude"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "addresses"`);
    }

}
