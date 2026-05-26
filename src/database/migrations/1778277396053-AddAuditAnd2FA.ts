import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditAnd2FA1778277396053 implements MigrationInterface {
    name = 'AddAuditAnd2FA1778277396053'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" SERIAL NOT NULL, "action" character varying(50) NOT NULL, "entity" character varying(100) NOT NULL, "entityId" character varying(100), "oldData" jsonb, "newData" jsonb, "ipAddress" character varying(255), "userAgent" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "user" ADD "twoFactorSecret" character varying`);
        await queryRunner.query(`ALTER TABLE "user" ADD "isTwoFactorEnabled" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_cfa83f61e4d27a87fcae1e025ab" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_cfa83f61e4d27a87fcae1e025ab"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isTwoFactorEnabled"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "twoFactorSecret"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
    }

}
