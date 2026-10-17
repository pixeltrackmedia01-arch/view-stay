-- CreateEnum
CREATE TYPE "HotelTemplate" AS ENUM ('MOUNTAIN_LODGE', 'HERITAGE_BOUTIQUE', 'CITY_MODERN', 'COASTAL_RESORT', 'GARDEN_RETREAT');

-- CreateEnum
CREATE TYPE "CancellationPolicy" AS ENUM ('FLEXIBLE', 'MODERATE', 'STRICT');

-- CreateEnum
CREATE TYPE "RatePlan" AS ENUM ('FLEXIBLE', 'NON_REFUNDABLE');

-- CreateEnum
CREATE TYPE "RoomCategory" AS ENUM ('STANDARD', 'DELUXE', 'SUITE');

-- CreateEnum
CREATE TYPE "Side" AS ENUM ('TOP', 'RIGHT', 'BOTTOM', 'LEFT');

-- CreateEnum
CREATE TYPE "MediaCategory" AS ENUM ('DESTINATION', 'EXTERIOR', 'LOBBY', 'RECEPTION', 'RESTAURANT', 'POOL', 'COURTYARD', 'GARDEN', 'COMMON_AREA', 'ROOM_OVERVIEW', 'SLEEPING_AREA', 'WINDOW_VIEW', 'BALCONY', 'BATHROOM', 'SEATING_AREA', 'WORKSPACE', 'SPECIAL_FEATURE');

-- CreateEnum
CREATE TYPE "MediaSource" AS ENUM ('LIBRARY', 'UPLOAD');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MapElementKind" ADD VALUE 'COURTYARD';
ALTER TYPE "MapElementKind" ADD VALUE 'GARDEN';
ALTER TYPE "MapElementKind" ADD VALUE 'VERANDA';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ViewType" ADD VALUE 'LAKE';
ALTER TYPE "ViewType" ADD VALUE 'RIVER';
ALTER TYPE "ViewType" ADD VALUE 'VALLEY';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "commission" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "groupCode" TEXT,
ADD COLUMN     "holdGroupId" TEXT,
ADD COLUMN     "ratePlan" "RatePlan" NOT NULL DEFAULT 'FLEXIBLE';

-- AlterTable
ALTER TABLE "Floor" ADD COLUMN     "wings" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Hotel" DROP COLUMN "coverHue",
ADD COLUMN     "cancellationPolicy" "CancellationPolicy" NOT NULL DEFAULT 'FLEXIBLE',
ADD COLUMN     "destinationId" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "houseRules" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "mapX" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "mapY" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "neighborhood" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "palette" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ratingAvg" DOUBLE PRECISION,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "template" "HotelTemplate" NOT NULL DEFAULT 'CITY_MODERN';

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "balconySide" "Side",
ADD COLUMN     "bedType" TEXT NOT NULL DEFAULT 'Queen',
ADD COLUMN     "secondaryWindowSide" "Side",
ADD COLUMN     "sizeSqm" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "windowSide" "Side" NOT NULL DEFAULT 'TOP';

-- AlterTable
ALTER TABLE "RoomHold" ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "quotedTotal" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "RoomType" ADD COLUMN     "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "category" "RoomCategory" NOT NULL DEFAULT 'STANDARD';

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "themes" TEXT[],
    "attractions" TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "heroAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "category" "MediaCategory" NOT NULL,
    "alt" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "illustrative" BOOLEAN NOT NULL DEFAULT true,
    "source" "MediaSource" NOT NULL DEFAULT 'LIBRARY',
    "mimeType" TEXT NOT NULL DEFAULT 'image/svg+xml',
    "sizeBytes" INTEGER,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelPhoto" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "category" "MediaCategory" NOT NULL,
    "alt" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "HotelPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomPhoto" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "category" "MediaCategory" NOT NULL,
    "alt" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "illustrative" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RoomPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);


-- Backfill: existing holds become single-room groups.
UPDATE "RoomHold" SET "groupId" = "id" WHERE "groupId" IS NULL;
ALTER TABLE "RoomHold" ALTER COLUMN "groupId" SET NOT NULL;

-- Backfill: create a destination for every city that already has hotels, then link them.
INSERT INTO "Destination" ("id", "slug", "name", "state", "region", "tagline", "description", "latitude", "longitude", "themes", "attractions")
SELECT 'dst_legacy_' || md5(lower(h."city")), trim(both '-' from regexp_replace(lower(h."city"), '[^a-z0-9]+', '-', 'g')),
       h."city", '', '', '', '', 0, 0, ARRAY[]::TEXT[], ARRAY[]::TEXT[]
FROM (SELECT DISTINCT "city" FROM "Hotel") h
ON CONFLICT DO NOTHING;
UPDATE "Hotel" SET "destinationId" = 'dst_legacy_' || md5(lower("city")) WHERE "destinationId" IS NULL;
ALTER TABLE "Hotel" ALTER COLUMN "destinationId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Destination_slug_key" ON "Destination"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_key_key" ON "MediaAsset"("key");

-- CreateIndex
CREATE INDEX "MediaAsset_category_idx" ON "MediaAsset"("category");

-- CreateIndex
CREATE INDEX "HotelPhoto_hotelId_sortOrder_idx" ON "HotelPhoto"("hotelId", "sortOrder");

-- CreateIndex
CREATE INDEX "RoomPhoto_roomId_sortOrder_idx" ON "RoomPhoto"("roomId", "sortOrder");

-- CreateIndex
CREATE INDEX "RoomPhoto_hotelId_idx" ON "RoomPhoto"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Booking_groupCode_idx" ON "Booking"("groupCode");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_holdGroupId_roomId_key" ON "Booking"("holdGroupId", "roomId");

-- CreateIndex
CREATE INDEX "Hotel_destinationId_idx" ON "Hotel"("destinationId");

-- CreateIndex
CREATE INDEX "Review_hotelId_idx" ON "Review"("hotelId");

-- CreateIndex
CREATE INDEX "Room_hotelId_status_idx" ON "Room"("hotelId", "status");

-- CreateIndex
CREATE INDEX "RoomHold_groupId_idx" ON "RoomHold"("groupId");

-- AddForeignKey
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_heroAssetId_fkey" FOREIGN KEY ("heroAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hotel" ADD CONSTRAINT "Hotel_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelPhoto" ADD CONSTRAINT "HotelPhoto_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelPhoto" ADD CONSTRAINT "HotelPhoto_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomPhoto" ADD CONSTRAINT "RoomPhoto_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomPhoto" ADD CONSTRAINT "RoomPhoto_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomPhoto" ADD CONSTRAINT "RoomPhoto_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

