/*
  Warnings:

  - You are about to drop the column `stockStatus` on the `Book` table. All the data in the column will be lost.

*/
-- totalPage는 Int?인데 기본값이 0이라 "페이지 수 모름"이 NULL과 0 두 가지로 표현되고 있었음.
-- 기본값을 없애기 전에 기존 0을 NULL로 통일한다.
UPDATE `Book` SET `totalPage` = NULL WHERE `totalPage` = 0;

-- AlterTable
ALTER TABLE `Book` DROP COLUMN `stockStatus`,
    ALTER COLUMN `totalPage` DROP DEFAULT;
