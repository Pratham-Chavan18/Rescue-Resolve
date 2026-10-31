export type Paise = number & {
    readonly _brand: 'Paise';
};
/** Type-safe helper — use sparingly; prefer receiving paise from API directly */
export declare function toPaise(rupees: number): Paise;
export type UserRole = 'customer' | 'restaurant' | 'rider' | 'agent';
export type OrderStatus = 'placed' | 'accepted' | 'packed' | 'rider_assigned' | 'picked_up' | 'near_you' | 'delivered' | 'cancelled' | 'failed';
export type HealthState = 'on_track' | 'at_risk' | 'failing' | 'recovered' | 'failed';
export type HealthSignalKind = 'rider_stationary' | 'pickup_delay' | 'eta_slip' | 'pack_delay' | 'delivered_unconfirmed';
export type RescueTrigger = 'RIDER_STUCK' | 'PICKUP_DELAY' | 'ETA_SLIP' | 'ETA_CRITICAL' | 'PACK_DELAY' | 'UNCONFIRMED';
export type RescueStatus = 'offered' | 'accepted' | 'expired' | 'cancelled';
export type RescueChoice = 'wait' | 'replace' | 'cancel';
export interface RescueOption {
    kind: RescueChoice;
    label: string;
    /** Credit amount in paise (for 'wait') */
    creditAmount?: Paise;
    /** Replacement restaurant id (for 'replace') */
    replacementRestaurantId?: string;
    /** Price difference in paise (negative = cheaper; for 'replace') */
    priceDiffPaise?: Paise;
    /** New ETA ISO string */
    newEta?: string;
    /** Refund amount in paise (for 'cancel') */
    refundAmount?: Paise;
}
export type IssueKind = 'wrong_item' | 'missing_item' | 'quality' | 'late_delivery';
export type ResolveStatus = 'draft' | 'checking' | 'offered' | 'accepted' | 'escalated' | 'resolved' | 'rejected';
export type Confidence = 'high' | 'medium' | 'low';
export type EntitlementDestination = 'source' | 'wallet';
export type EntitlementOutcome = 'full_item_refund' | 'item_refund' | 'proportional_fee_credit' | 'item_value_credit' | 'late_credit' | 'human_review';
export interface EntitlementLineItem {
    label: string;
    amount: Paise;
    destination: EntitlementDestination;
}
export interface FairnessDecision {
    confidence: Confidence;
    outcome: EntitlementOutcome;
    lineItems: EntitlementLineItem[];
    total: Paise;
    destination: EntitlementDestination;
    reason: string;
    ruleTrace: RuleTrace[];
}
export interface RuleTrace {
    ruleId: string;
    ruleName: string;
    fired: boolean;
    reason: string;
}
export type EvidenceKind = 'photo' | 'timestamp' | 'line_item';
export type EvidenceVerdict = 'mismatch_verified' | 'quality_verified' | 'ambiguous' | 'pending';
export type LedgerCause = 'restaurant' | 'logistics' | 'customer_address' | 'platform';
export type LedgerKind = 'credit' | 'refund' | 'partial_refund' | 'note';
export type AgentAction = 'approve' | 'custom_refund' | 'reject';
export interface AgentActionPayload {
    action: AgentAction;
    /** Custom amount in paise (for 'custom_refund') */
    amount?: Paise;
    /** Required for 'reject' and 'custom_refund' */
    reasonCode: string;
    note?: string;
}
export type PartnerActionKind = 'confirm_packing' | 'decline_item';
export type SimFault = 'rider_stuck' | 'restaurant_slow' | 'eta_slip' | 'delivered_unconfirmed' | 'wrong_item';
export type ServerEvent = {
    t: 'health.changed';
    orderId: string;
    state: HealthState;
    etaAt: string;
    triggers: RescueTrigger[];
} | {
    t: 'rescue.offered';
    orderId: string;
    caseId: string;
    options: RescueOption[];
} | {
    t: 'rescue.updated';
    caseId: string;
    status: RescueStatus;
    choice?: RescueChoice;
    slaAt?: string;
} | {
    t: 'partner.risk';
    restaurantId: string;
    orderId: string;
    reason: string;
    triggers: RescueTrigger[];
} | {
    t: 'rider.reassigned';
    riderId: string;
    orderId: string;
    reason: string;
    /** Protected payout for completed leg, in paise */
    protectedPayoutPaise: number;
} | {
    t: 'agent.case.new';
    caseId: string;
    issueKind: IssueKind;
    confidence: Confidence;
    totalPaise: number;
} | {
    t: 'case.updated';
    caseId: string;
    status: ResolveStatus;
    /** Agent note visible to customer on rejection */
    agentNote?: string;
};
export interface JwtPayload {
    sub: string;
    role: UserRole;
    phone: string;
    /** Restaurant ID (for restaurant role) */
    restaurantId?: string;
    /** Rider ID (for rider role) */
    riderId?: string;
}
export interface ApiError {
    statusCode: number;
    message: string;
    error?: string;
}
//# sourceMappingURL=index.d.ts.map