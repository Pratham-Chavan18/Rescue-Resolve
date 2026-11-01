-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'restaurant', 'rider', 'agent');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('placed', 'accepted', 'packed', 'rider_assigned', 'picked_up', 'near_you', 'delivered', 'cancelled', 'failed');

-- CreateEnum
CREATE TYPE "HealthState" AS ENUM ('on_track', 'at_risk', 'failing', 'recovered', 'failed');

-- CreateEnum
CREATE TYPE "HealthSignalKind" AS ENUM ('rider_stationary', 'pickup_delay', 'eta_slip', 'pack_delay', 'delivered_unconfirmed');

-- CreateEnum
CREATE TYPE "RescueStatus" AS ENUM ('offered', 'accepted', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "RescueChoice" AS ENUM ('wait', 'replace', 'cancel');

-- CreateEnum
CREATE TYPE "IssueKind" AS ENUM ('wrong_item', 'missing_item', 'quality', 'late_delivery');

-- CreateEnum
CREATE TYPE "ResolveStatus" AS ENUM ('draft', 'checking', 'offered', 'accepted', 'escalated', 'resolved', 'rejected');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('photo', 'timestamp', 'line_item');

-- CreateEnum
CREATE TYPE "EvidenceVerdict" AS ENUM ('mismatch_verified', 'quality_verified', 'ambiguous', 'pending');

-- CreateEnum
CREATE TYPE "LedgerCause" AS ENUM ('restaurant', 'logistics', 'customer_address', 'platform');

-- CreateEnum
CREATE TYPE "LedgerKind" AS ENUM ('credit', 'refund', 'partial_refund', 'note');

-- CreateEnum
CREATE TYPE "EntitlementDestination" AS ENUM ('source', 'wallet');

-- CreateEnum
CREATE TYPE "AgentAction" AS ENUM ('approve', 'custom_refund', 'reject');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "name" TEXT NOT NULL,
    "upiMasked" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cuisine" TEXT NOT NULL,
    "vegOnly" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "issueRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "load" TEXT NOT NULL DEFAULT 'low',
    "userId" TEXT,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pricePaise" INTEGER NOT NULL,
    "isVeg" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'online',
    "userId" TEXT,

    CONSTRAINT "riders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "riderId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'placed',
    "totalPaise" INTEGER NOT NULL,
    "deliveryFeePaise" INTEGER NOT NULL DEFAULT 0,
    "promisedAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "address" TEXT NOT NULL,
    "originalOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "isVeg" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_signals" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" "HealthSignalKind" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_health" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "state" "HealthState" NOT NULL DEFAULT 'on_track',
    "etaAt" TIMESTAMP(3) NOT NULL,
    "triggersJson" JSONB NOT NULL DEFAULT '[]',
    "ruleTraceJson" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rescue_cases" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "optionsJson" JSONB NOT NULL,
    "choice" "RescueChoice",
    "slaAt" TIMESTAMP(3),
    "status" "RescueStatus" NOT NULL DEFAULT 'offered',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rescue_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolve_cases" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issue" "IssueKind" NOT NULL,
    "decisionJson" JSONB,
    "confidence" "Confidence",
    "status" "ResolveStatus" NOT NULL DEFAULT 'draft',
    "agentId" TEXT,
    "agentAction" "AgentAction",
    "agentReasonCode" TEXT,
    "agentNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resolve_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "kind" "EvidenceKind" NOT NULL,
    "url" TEXT,
    "payload" JSONB,
    "verdict" "EvidenceVerdict" NOT NULL DEFAULT 'pending',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "cause" "LedgerCause" NOT NULL,
    "actor" TEXT NOT NULL,
    "kind" "LedgerKind" NOT NULL,
    "amountPaise" INTEGER NOT NULL DEFAULT 0,
    "destination" "EntitlementDestination",
    "note" TEXT NOT NULL,
    "evidenceJson" JSONB NOT NULL DEFAULT '[]',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "readAt" TIMESTAMP(3),
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_userId_key" ON "restaurants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "riders_userId_key" ON "riders"("userId");

-- CreateIndex
CREATE INDEX "order_events_orderId_at_idx" ON "order_events"("orderId", "at");

-- CreateIndex
CREATE INDEX "health_signals_orderId_at_idx" ON "health_signals"("orderId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "order_health_orderId_key" ON "order_health"("orderId");

-- CreateIndex
CREATE INDEX "ledger_entries_orderId_at_idx" ON "ledger_entries"("orderId", "at");

-- CreateIndex
CREATE INDEX "notifications_userId_at_idx" ON "notifications"("userId", "at");

-- AddForeignKey
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riders" ADD CONSTRAINT "riders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_signals" ADD CONSTRAINT "health_signals_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_health" ADD CONSTRAINT "order_health_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rescue_cases" ADD CONSTRAINT "rescue_cases_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolve_cases" ADD CONSTRAINT "resolve_cases_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolve_cases" ADD CONSTRAINT "resolve_cases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolve_cases" ADD CONSTRAINT "resolve_cases_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "resolve_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
