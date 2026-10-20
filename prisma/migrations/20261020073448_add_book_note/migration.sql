-- CreateTable
CREATE TABLE `BookNote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `myBookId` INTEGER NOT NULL,
    `template` ENUM('ONE_SENTENCE', 'BON_KKAE_JEOK', 'KWL', 'THREE_TWO_ONE', 'FREE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BookNote_myBookId_key`(`myBookId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookNoteSection` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookNoteId` INTEGER NOT NULL,
    `key` VARCHAR(30) NOT NULL,
    `content` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BookNoteSection_bookNoteId_key_key`(`bookNoteId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BookNote` ADD CONSTRAINT `BookNote_myBookId_fkey` FOREIGN KEY (`myBookId`) REFERENCES `MyBook`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookNoteSection` ADD CONSTRAINT `BookNoteSection_bookNoteId_fkey` FOREIGN KEY (`bookNoteId`) REFERENCES `BookNote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
