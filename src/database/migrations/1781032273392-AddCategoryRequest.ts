import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCategoryRequest1781032273392 implements MigrationInterface {
    name = 'AddCategoryRequest1781032273392'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "category_requests" ("id" SERIAL NOT NULL, "professionalId" integer NOT NULL, "name" character varying(255) NOT NULL, "category" character varying(100) NOT NULL, "description" text, "icon" character varying(100), "status" character varying(20) NOT NULL DEFAULT 'pending', "adminNotes" text, "reviewedBy" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8761db16bbed36ed12b5c63aeb1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "professional_services" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "UQ_c357057587a1c2afae453515bf6" UNIQUE ("bookingId")`);
        await queryRunner.query(`ALTER TABLE "category_requests" ADD CONSTRAINT "FK_9f3b8a1519106905da11f53cf02" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_c357057587a1c2afae453515bf6" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_c357057587a1c2afae453515bf6"`);
        await queryRunner.query(`ALTER TABLE "category_requests" DROP CONSTRAINT "FK_9f3b8a1519106905da11f53cf02"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "UQ_c357057587a1c2afae453515bf6"`);
        await queryRunner.query(`ALTER TABLE "professional_services" ADD "name" character varying(255)`);
        await queryRunner.query(`DROP TABLE "category_requests"`);
    }

}
