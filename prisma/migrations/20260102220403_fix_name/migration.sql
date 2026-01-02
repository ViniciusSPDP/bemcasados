/*
  Warnings:

  - You are about to drop the column `amountOrginal` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `amountOriginal` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "amountOrginal",
ADD COLUMN     "amountOriginal" DECIMAL(10,2) NOT NULL;
