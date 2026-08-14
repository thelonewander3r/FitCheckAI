-- CreateTable
CREATE TABLE "InterviewSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateName" TEXT,
    "jobTitle" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "industry" TEXT,
    "jobDescription" TEXT NOT NULL,
    "interviewStage" TEXT NOT NULL,
    "interviewFormat" TEXT NOT NULL,
    "interviewDate" TEXT NOT NULL,
    "budget" REAL NOT NULL,
    "stylePreference" TEXT NOT NULL,
    "selectedOutfitId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'intake',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UploadedImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "tempPath" TEXT,
    "mimeType" TEXT,
    "previewData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "UploadedImage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InterviewContextRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "inferredIndustry" TEXT NOT NULL,
    "dressCode" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "recommendedColors" TEXT NOT NULL,
    "avoidPatterns" TEXT NOT NULL,
    "jacketRecommended" BOOLEAN NOT NULL,
    "rationale" TEXT NOT NULL,
    CONSTRAINT "InterviewContextRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SkinAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "observationsJson" TEXT NOT NULL,
    "preparationSuggestionsJson" TEXT NOT NULL,
    "lightingNotesJson" TEXT NOT NULL,
    "disclaimer" TEXT NOT NULL,
    "isMock" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SkinAnalysis_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Outfit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "garmentsJson" TEXT NOT NULL,
    "estimatedPrice" REAL NOT NULL,
    "formality" INTEGER NOT NULL,
    "colorsJson" TEXT NOT NULL,
    "hasJacket" BOOLEAN NOT NULL,
    "explanation" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    CONSTRAINT "Outfit_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OutfitEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "outfitId" TEXT NOT NULL,
    "roleAppropriateness" REAL NOT NULL,
    "interviewFormatSuitability" REAL NOT NULL,
    "budgetFit" REAL NOT NULL,
    "versatility" REAL NOT NULL,
    "cameraReadiness" REAL NOT NULL,
    "overall" REAL NOT NULL,
    CONSTRAINT "OutfitEvaluation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OutfitEvaluation_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VirtualTryOnResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "outfitId" TEXT NOT NULL,
    "renderedImageUrl" TEXT NOT NULL,
    "isMock" BOOLEAN NOT NULL DEFAULT true,
    "processingTimeMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VirtualTryOnResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VirtualTryOnResult_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PreparationPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "selectedOutfitId" TEXT NOT NULL,
    "whySelected" TEXT NOT NULL,
    "estimatedTotalPrice" REAL NOT NULL,
    "alternativeOutfitId" TEXT NOT NULL,
    "fiveDayChecklistJson" TEXT NOT NULL,
    "nightBeforeChecklistJson" TEXT NOT NULL,
    "oneHourBeforeChecklistJson" TEXT NOT NULL,
    "lightingAndCameraSuggestionsJson" TEXT NOT NULL,
    "summaryText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PreparationPlan_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UploadedImage_sessionId_key" ON "UploadedImage"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewContextRecord_sessionId_key" ON "InterviewContextRecord"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SkinAnalysis_sessionId_key" ON "SkinAnalysis"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Outfit_sessionId_templateId_key" ON "Outfit"("sessionId", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "OutfitEvaluation_outfitId_key" ON "OutfitEvaluation"("outfitId");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualTryOnResult_outfitId_key" ON "VirtualTryOnResult"("outfitId");

-- CreateIndex
CREATE UNIQUE INDEX "PreparationPlan_sessionId_key" ON "PreparationPlan"("sessionId");
