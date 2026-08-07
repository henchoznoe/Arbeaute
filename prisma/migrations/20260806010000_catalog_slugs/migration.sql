-- AlterTable
ALTER TABLE "service_category" ADD COLUMN "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "service" ADD COLUMN "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "service_category_slug_key" ON "service_category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "service_slug_key" ON "service"("slug");
