-- Quote를 ReadingLog에서 떼어 MyBook에 직접 단다. readingLogId는 선택 연결이 되고,
-- 기록을 지우면 인용은 남고 연결만 풀린다(SET NULL).
-- 생성된 SQL은 NOT NULL 컬럼을 바로 추가해 기존 행이 있으면 실패하므로,
-- nullable로 추가 -> 연결된 기록의 myBookId로 채우기 -> NOT NULL 순서로 고쳤다.

-- DropForeignKey
ALTER TABLE `Quote` DROP FOREIGN KEY `Quote_readingLogId_fkey`;

-- AlterTable
ALTER TABLE `Quote` ADD COLUMN `myBookId` INTEGER NULL,
    MODIFY `readingLogId` INTEGER NULL;

-- Backfill: 지금까지의 인용은 모두 독서 기록에 달려 있었다.
UPDATE `Quote` q
    JOIN `ReadingLog` r ON r.`id` = q.`readingLogId`
    SET q.`myBookId` = r.`myBookId`;

ALTER TABLE `Quote` MODIFY `myBookId` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `Quote_myBookId_page_idx` ON `Quote`(`myBookId`, `page`);

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_myBookId_fkey` FOREIGN KEY (`myBookId`) REFERENCES `MyBook`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_readingLogId_fkey` FOREIGN KEY (`readingLogId`) REFERENCES `ReadingLog`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
