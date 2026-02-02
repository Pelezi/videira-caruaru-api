-- AlterTable
ALTER TABLE "Member" ALTER COLUMN "hasDefaultPassword" DROP NOT NULL,
ALTER COLUMN "hasDefaultPassword" DROP DEFAULT;
