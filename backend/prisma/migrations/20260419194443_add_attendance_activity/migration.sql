-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('MUNCA', 'WEEKEND', 'CONCEDIU', 'SARBATOARE', 'ABSENT');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "activity" "ActivityType" NOT NULL DEFAULT 'MUNCA',
ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3);
