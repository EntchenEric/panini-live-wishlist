npm warn Unknown global config "python". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
-- CreateTable
CREATE TABLE `accountData` (
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `urlEnding` VARCHAR(191) NOT NULL,
    `encryptedPaniniPassword` VARCHAR(191) NULL,
    `tokenVersion` INTEGER NOT NULL DEFAULT 0,
    `loginAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `accountData_email_key`(`email`),
    UNIQUE INDEX `accountData_urlEnding_key`(`urlEnding`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cashedWishlist` (
    `urlEnding` VARCHAR(191) NOT NULL,
    `cash` LONGBLOB NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cashedWishlist_urlEnding_key`(`urlEnding`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cashedComicData` (
    `url` VARCHAR(191) NOT NULL,
    `price` VARCHAR(191) NOT NULL,
    `author` VARCHAR(191) NOT NULL,
    `drawer` VARCHAR(191) NOT NULL,
    `release` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `pageAmount` VARCHAR(191) NOT NULL,
    `storys` TEXT NOT NULL,
    `binding` VARCHAR(191) NOT NULL,
    `ISBN` VARCHAR(191) NOT NULL,
    `deliverableTo` VARCHAR(191) NOT NULL,
    `deliveryFrom` VARCHAR(191) NOT NULL,
    `articleNumber` VARCHAR(191) NULL DEFAULT '',
    `format` VARCHAR(191) NULL DEFAULT '',
    `color` VARCHAR(191) NULL DEFAULT '',
    `name` VARCHAR(191) NOT NULL DEFAULT 'Unknown Comic',
    `lastUpdated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `cashedComicData_url_key`(`url`),
    INDEX `cashedComicData_lastUpdated_idx`(`lastUpdated`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nameNumberMap` (
    `name` VARCHAR(191) NOT NULL DEFAULT 'Unknown',
    `url` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `nameNumberMap_url_key`(`url`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prioritys` (
    `urlEnding` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `priority` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `prioritys_urlEnding_idx`(`urlEnding`),
    UNIQUE INDEX `prioritys_urlEnding_url_key`(`urlEnding`, `url`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `note` (
    `urlEnding` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `note_urlEnding_idx`(`urlEnding`),
    UNIQUE INDEX `note_urlEnding_url_key`(`urlEnding`, `url`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dependency` (
    `urlEnding` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `dependencyUrl` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `dependency_urlEnding_idx`(`urlEnding`),
    UNIQUE INDEX `dependency_urlEnding_url_key`(`urlEnding`, `url`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

