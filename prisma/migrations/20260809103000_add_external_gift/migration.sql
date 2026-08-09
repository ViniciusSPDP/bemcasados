-- CreateTable
CREATE TABLE "ExternalGift" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "shortUrl" TEXT NOT NULL,
    "externalId" TEXT,
    "reservedAt" TIMESTAMP(3),
    "reservedName" TEXT,
    "reservedPhone" TEXT,
    "reservedMessage" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalGift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalGift_eventId_orderIndex_idx" ON "ExternalGift"("eventId", "orderIndex");

-- CreateIndex
CREATE INDEX "ExternalGift_imageUrl_idx" ON "ExternalGift"("imageUrl");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalGift_eventId_externalId_key" ON "ExternalGift"("eventId", "externalId");

-- AddForeignKey
ALTER TABLE "ExternalGift" ADD CONSTRAINT "ExternalGift_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

