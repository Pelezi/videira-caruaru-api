/*
  Warnings:

  - A unique constraint covering the columns `[name,matrixId]` on the table `Celula` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,matrixId]` on the table `Ministry` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,matrixId]` on the table `Rede` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,matrixId]` on the table `Role` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,matrixId]` on the table `WinnerPath` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `matrixId` to the `ApiKey` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matrixId` to the `Celula` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matrixId` to the `Discipulado` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matrixId` to the `Ministry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matrixId` to the `Rede` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matrixId` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matrixId` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matrixId` to the `WinnerPath` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Celula_name_key";

-- DropIndex
DROP INDEX "Ministry_name_key";

-- DropIndex
DROP INDEX "Rede_name_key";

-- DropIndex
DROP INDEX "Role_name_key";

-- DropIndex
DROP INDEX "WinnerPath_name_key";

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "matrixId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Celula" ADD COLUMN     "matrixId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Discipulado" ADD COLUMN     "matrixId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Ministry" ADD COLUMN     "matrixId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Rede" ADD COLUMN     "matrixId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "matrixId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "matrixId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "WinnerPath" ADD COLUMN     "matrixId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Matrix" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Matrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatrixDomain" (
    "id" SERIAL NOT NULL,
    "domain" TEXT NOT NULL,
    "matrixId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatrixDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberMatrix" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "matrixId" INTEGER NOT NULL,

    CONSTRAINT "MemberMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatrixDomain_domain_key" ON "MatrixDomain"("domain");

-- CreateIndex
CREATE INDEX "MatrixDomain_matrixId_idx" ON "MatrixDomain"("matrixId");

-- CreateIndex
CREATE INDEX "MemberMatrix_memberId_idx" ON "MemberMatrix"("memberId");

-- CreateIndex
CREATE INDEX "MemberMatrix_matrixId_idx" ON "MemberMatrix"("matrixId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberMatrix_memberId_matrixId_key" ON "MemberMatrix"("memberId", "matrixId");

-- CreateIndex
CREATE INDEX "ApiKey_matrixId_idx" ON "ApiKey"("matrixId");

-- CreateIndex
CREATE INDEX "Celula_matrixId_idx" ON "Celula"("matrixId");

-- CreateIndex
CREATE UNIQUE INDEX "Celula_name_matrixId_key" ON "Celula"("name", "matrixId");

-- CreateIndex
CREATE INDEX "Discipulado_matrixId_idx" ON "Discipulado"("matrixId");

-- CreateIndex
CREATE INDEX "Ministry_matrixId_idx" ON "Ministry"("matrixId");

-- CreateIndex
CREATE UNIQUE INDEX "Ministry_name_matrixId_key" ON "Ministry"("name", "matrixId");

-- CreateIndex
CREATE INDEX "Rede_matrixId_idx" ON "Rede"("matrixId");

-- CreateIndex
CREATE UNIQUE INDEX "Rede_name_matrixId_key" ON "Rede"("name", "matrixId");

-- CreateIndex
CREATE INDEX "Report_matrixId_idx" ON "Report"("matrixId");

-- CreateIndex
CREATE INDEX "Role_matrixId_idx" ON "Role"("matrixId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_matrixId_key" ON "Role"("name", "matrixId");

-- CreateIndex
CREATE INDEX "WinnerPath_matrixId_idx" ON "WinnerPath"("matrixId");

-- CreateIndex
CREATE UNIQUE INDEX "WinnerPath_name_matrixId_key" ON "WinnerPath"("name", "matrixId");

-- AddForeignKey
ALTER TABLE "MatrixDomain" ADD CONSTRAINT "MatrixDomain_matrixId_fkey" FOREIGN KEY ("matrixId") REFERENCES "Matrix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberMatrix" ADD CONSTRAINT "MemberMatrix_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberMatrix" ADD CONSTRAINT "MemberMatrix_matrixId_fkey" FOREIGN KEY ("matrixId") REFERENCES "Matrix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Celula" ADD CONSTRAINT "Celula_matrixId_fkey" FOREIGN KEY ("matrixId") REFERENCES "Matrix"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_matrixId_fkey" FOREIGN KEY ("matrixId") REFERENCES "Matrix"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ministry" ADD CONSTRAINT "Ministry_matrixId_fkey" FOREIGN KEY ("matrixId") REFERENCES "Matrix"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WinnerPath" ADD CONSTRAINT "WinnerPath_matrixId_fkey" FOREIGN KEY ("matrixId") REFERENCES "Matrix"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rede" ADD CONSTRAINT "Rede_matrixId_fkey" FOREIGN KEY ("matrixId") REFERENCES "Matrix"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discipulado" ADD CONSTRAINT "Discipulado_matrixId_fkey" FOREIGN KEY ("matrixId") REFERENCES "Matrix"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_matrixId_fkey" FOREIGN KEY ("matrixId") REFERENCES "Matrix"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_matrixId_fkey" FOREIGN KEY ("matrixId") REFERENCES "Matrix"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
