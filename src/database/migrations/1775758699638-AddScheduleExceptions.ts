import { MigrationInterface, QueryRunner } from "typeorm";

export class AddScheduleExceptions1775758699638 implements MigrationInterface {
    name = 'AddScheduleExceptions1775758699638'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "schedule_exceptions" ("id" SERIAL NOT NULL, "professionalId" integer NOT NULL, "date" date NOT NULL, "startTime" TIME, "endTime" TIME, "isFullDay" boolean NOT NULL DEFAULT true, "reason" character varying(255), CONSTRAINT "PK_829b77f6edcc7e36993664df455" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "FK_a20330dfca17cc0e67985b07ca7" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schedule_exceptions" DROP CONSTRAINT "FK_a20330dfca17cc0e67985b07ca7"`);
        await queryRunner.query(`DROP TABLE "schedule_exceptions"`);
    }

}
