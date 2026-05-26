import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCoordinatesToBookings1775700349004 implements MigrationInterface {
    name = 'AddCoordinatesToBookings1775700349004'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bookings" ADD "latitude" numeric(10,7)`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "longitude" numeric(10,7)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "longitude"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "latitude"`);
    }

}
