-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('CELULA', 'CULTO');

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "type" "ReportType" NOT NULL DEFAULT 'CELULA';
