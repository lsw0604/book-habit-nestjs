/*
  Warnings:

  - Added the required column `chosung` to the `Tag` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Tag` ADD COLUMN `chosung` VARCHAR(191) NOT NULL;
