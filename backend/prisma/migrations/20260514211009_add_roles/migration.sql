-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ROOT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';
