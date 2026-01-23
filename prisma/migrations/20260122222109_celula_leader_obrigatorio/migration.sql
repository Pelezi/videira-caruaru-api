/*
  Warnings:

  - Made the column `discipuladoId` on table `Celula` required. This step will fail if there are existing NULL values in that column.
  - Made the column `leaderMemberId` on table `Celula` required. This step will fail if there are existing NULL values in that column.
  - Made the column `discipuladorMemberId` on table `Discipulado` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ministryPositionId` on table `Member` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Celula" DROP CONSTRAINT "Celula_discipuladoId_fkey";

-- DropForeignKey
ALTER TABLE "Celula" DROP CONSTRAINT "Celula_leaderMemberId_fkey";

-- DropForeignKey
ALTER TABLE "Celula" DROP CONSTRAINT "Celula_viceLeaderMemberId_fkey";

-- DropForeignKey
ALTER TABLE "Discipulado" DROP CONSTRAINT "Discipulado_discipuladorMemberId_fkey";

-- DropForeignKey
ALTER TABLE "Discipulado" DROP CONSTRAINT "Discipulado_redeId_fkey";

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_ministryPositionId_fkey";

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_spouseId_fkey";

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_winnerPathId_fkey";

-- DropForeignKey
ALTER TABLE "MemberRole" DROP CONSTRAINT "MemberRole_memberId_fkey";

-- DropForeignKey
ALTER TABLE "MemberRole" DROP CONSTRAINT "MemberRole_roleId_fkey";

-- DropForeignKey
ALTER TABLE "Rede" DROP CONSTRAINT "Rede_pastorMemberId_fkey";

-- DropForeignKey
ALTER TABLE "ReportAttendance" DROP CONSTRAINT "ReportAttendance_memberId_fkey";

-- DropForeignKey
ALTER TABLE "ReportAttendance" DROP CONSTRAINT "ReportAttendance_reportId_fkey";

-- AlterTable
ALTER TABLE "Celula" ALTER COLUMN "discipuladoId" SET NOT NULL,
ALTER COLUMN "leaderMemberId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Discipulado" ALTER COLUMN "discipuladorMemberId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Member" ALTER COLUMN "ministryPositionId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Celula" ADD CONSTRAINT "Celula_discipuladoId_fkey" FOREIGN KEY ("discipuladoId") REFERENCES "Discipulado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Celula" ADD CONSTRAINT "Celula_leaderMemberId_fkey" FOREIGN KEY ("leaderMemberId") REFERENCES "Member"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Celula" ADD CONSTRAINT "Celula_viceLeaderMemberId_fkey" FOREIGN KEY ("viceLeaderMemberId") REFERENCES "Member"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_ministryPositionId_fkey" FOREIGN KEY ("ministryPositionId") REFERENCES "Ministry"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_winnerPathId_fkey" FOREIGN KEY ("winnerPathId") REFERENCES "WinnerPath"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_spouseId_fkey" FOREIGN KEY ("spouseId") REFERENCES "Member"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rede" ADD CONSTRAINT "Rede_pastorMemberId_fkey" FOREIGN KEY ("pastorMemberId") REFERENCES "Member"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discipulado" ADD CONSTRAINT "Discipulado_redeId_fkey" FOREIGN KEY ("redeId") REFERENCES "Rede"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discipulado" ADD CONSTRAINT "Discipulado_discipuladorMemberId_fkey" FOREIGN KEY ("discipuladorMemberId") REFERENCES "Member"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAttendance" ADD CONSTRAINT "ReportAttendance_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAttendance" ADD CONSTRAINT "ReportAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRole" ADD CONSTRAINT "MemberRole_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRole" ADD CONSTRAINT "MemberRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
