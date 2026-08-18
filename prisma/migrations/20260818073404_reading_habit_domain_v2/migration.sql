-- CreateTable
CREATE TABLE `Book` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `subTitle` VARCHAR(191) NULL,
    `isbn` VARCHAR(13) NOT NULL,
    `authors` JSON NULL,
    `translators` JSON NULL,
    `publisher` VARCHAR(191) NULL,
    `thumbnail` VARCHAR(191) NULL,
    `coverImage` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `url` TEXT NULL,
    `pubDate` DATE NULL,
    `totalPage` INTEGER NULL DEFAULT 0,
    `stockStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Book_isbn_key`(`isbn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `birthday` DATE NULL,
    `gender` ENUM('MALE', 'FEMALE') NULL,
    `provider` ENUM('LOCAL', 'KAKAO') NOT NULL DEFAULT 'LOCAL',
    `profile` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MyBook` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `bookId` INTEGER NOT NULL,
    `rating` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('WANT_TO_READ', 'CURRENTLY_READING', 'READ') NOT NULL DEFAULT 'WANT_TO_READ',
    `currentPage` INTEGER NOT NULL DEFAULT 0,
    `readCount` INTEGER NOT NULL DEFAULT 0,
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `lastReadAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MyBook_userId_status_idx`(`userId`, `status`),
    UNIQUE INDEX `MyBook_userId_bookId_key`(`userId`, `bookId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MyBookReview` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `myBookId` INTEGER NOT NULL,
    `review` VARCHAR(150) NOT NULL,
    `isPublic` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MyBookReview_myBookId_key`(`myBookId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReviewLike` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `myBookReviewId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ReviewLike_userId_myBookReviewId_key`(`userId`, `myBookReviewId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReviewComment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `comment` VARCHAR(1000) NOT NULL,
    `myBookReviewId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `value` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Tag_value_key`(`value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MyBookTag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `myBookId` INTEGER NOT NULL,
    `tagId` INTEGER NOT NULL,

    UNIQUE INDEX `MyBookTag_myBookId_tagId_key`(`myBookId`, `tagId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReadingLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `myBookId` INTEGER NOT NULL,
    `startPage` INTEGER NOT NULL,
    `endPage` INTEGER NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `readingMinutes` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `memo` VARCHAR(500) NULL,
    `readingMood` ENUM('INSPIRED', 'EXCITED', 'INTRIGUED', 'SATISFIED', 'NEUTRAL', 'CONFUSED', 'DISAPPOINTED', 'BORED', 'EMOTIONAL', 'THOUGHTFUL', 'CHALLENGED', 'ENLIGHTENED') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ReadingLog_myBookId_date_idx`(`myBookId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `readingLogId` INTEGER NOT NULL,
    `page` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Quote_readingLogId_idx`(`readingLogId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReadingGoal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NULL,
    `metric` ENUM('BOOK_COUNT', 'PAGE_COUNT', 'MINUTES') NOT NULL,
    `targetValue` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReadingGoal_userId_year_month_metric_key`(`userId`, `year`, `month`, `metric`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MyBook` ADD CONSTRAINT `MyBook_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MyBook` ADD CONSTRAINT `MyBook_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `Book`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MyBookReview` ADD CONSTRAINT `MyBookReview_myBookId_fkey` FOREIGN KEY (`myBookId`) REFERENCES `MyBook`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewLike` ADD CONSTRAINT `ReviewLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewLike` ADD CONSTRAINT `ReviewLike_myBookReviewId_fkey` FOREIGN KEY (`myBookReviewId`) REFERENCES `MyBookReview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewComment` ADD CONSTRAINT `ReviewComment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewComment` ADD CONSTRAINT `ReviewComment_myBookReviewId_fkey` FOREIGN KEY (`myBookReviewId`) REFERENCES `MyBookReview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MyBookTag` ADD CONSTRAINT `MyBookTag_myBookId_fkey` FOREIGN KEY (`myBookId`) REFERENCES `MyBook`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MyBookTag` ADD CONSTRAINT `MyBookTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReadingLog` ADD CONSTRAINT `ReadingLog_myBookId_fkey` FOREIGN KEY (`myBookId`) REFERENCES `MyBook`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_readingLogId_fkey` FOREIGN KEY (`readingLogId`) REFERENCES `ReadingLog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReadingGoal` ADD CONSTRAINT `ReadingGoal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
