-- DropForeignKey
ALTER TABLE "ReportAttendance" DROP CONSTRAINT "ReportAttendance_reportId_fkey";

-- AddForeignKey
ALTER TABLE "ReportAttendance" ADD CONSTRAINT "ReportAttendance_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
