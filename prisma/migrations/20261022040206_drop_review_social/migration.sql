/*
  Warnings:

  - You are about to drop the `MyBookReview` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReviewComment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReviewLike` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `MyBookReview` DROP FOREIGN KEY `MyBookReview_myBookId_fkey`;

-- DropForeignKey
ALTER TABLE `ReviewComment` DROP FOREIGN KEY `ReviewComment_myBookReviewId_fkey`;

-- DropForeignKey
ALTER TABLE `ReviewComment` DROP FOREIGN KEY `ReviewComment_userId_fkey`;

-- DropForeignKey
ALTER TABLE `ReviewLike` DROP FOREIGN KEY `ReviewLike_myBookReviewId_fkey`;

-- DropForeignKey
ALTER TABLE `ReviewLike` DROP FOREIGN KEY `ReviewLike_userId_fkey`;

-- DropTable
DROP TABLE `MyBookReview`;

-- DropTable
DROP TABLE `ReviewComment`;

-- DropTable
DROP TABLE `ReviewLike`;
