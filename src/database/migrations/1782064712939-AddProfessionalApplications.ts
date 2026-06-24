import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProfessionalApplications1782064712939 implements MigrationInterface {
    name = 'AddProfessionalApplications1782064712939'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "professional_applications" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "reason" text, "certifications" jsonb DEFAULT '[]', "adminNotes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fe2a36eb841482c4da9abc0dcf3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "professional_services" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "professional_applications" ADD CONSTRAINT "FK_eea39da8951451db0d033dc778b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "professional_applications" DROP CONSTRAINT "FK_eea39da8951451db0d033dc778b"`);
        await queryRunner.query(`ALTER TABLE "professional_services" ADD "name" character varying(255)`);
        await queryRunner.query(`DROP TABLE "professional_applications"`);
    }

}
