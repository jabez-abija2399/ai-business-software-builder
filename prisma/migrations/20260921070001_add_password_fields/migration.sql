-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_hash" TEXT,
ADD COLUMN     "password_reset_expires" TIMESTAMP(3),
ADD COLUMN     "password_reset_token" TEXT;
