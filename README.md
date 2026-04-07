# Capital Markets Lab Final Deliverable

This repository contains the final project submission under [cml_project](cml_project).

## Individual Contribution Report

Author: Aarav Ashutosh Joshi  
Module: G1-M4 (Order Persistence and Database Integration)  
Additional Role: Group 1 leadership and stress-suite stabilization support

## Scope of My Contribution

My contribution focuses on making order lifecycle state durable, consistent, and testable from ingestion to terminal state. The work includes:

1. Persistence-first lifecycle design
2. Entity and schema modeling for lifecycle-critical fields
3. DAO abstraction and batch operations for throughput
4. Guarded state transitions for cancel and replace
5. Stress-scenario stabilization support (especially T33)

## Code Map of Contribution

### 1) Intake, Deduplication, and Early Persistence

Primary file: [cml_project/exchange-back-end/src/main/java/com/helesto/service/QuickFixJOrderIntakeEngine.java](cml_project/exchange-back-end/src/main/java/com/helesto/service/QuickFixJOrderIntakeEngine.java)

Key behavior implemented and validated:

1. Duplicate Client Order ID rejection before deeper processing
2. Baseline state initialization for accepted orders
3. Early persistence of NEW orders to establish durable lifecycle truth

Representative logic:

	if (orderDao.findByClOrdId(clOrdId) != null) {
		telemetryService.recordFixMessageRejected();
		telemetryService.recordOrderRejected();
		return IntakeResult.rejected(clOrdId, "UNKNOWN", '1', 0, "Duplicate ClOrdID");
	}

	orderValidationService.enrichOrder(order);
	order.setStatus("NEW");
	orderDao.persistOrder(order);

Why this matters:

1. Prevents duplicate active orders from replay or retry
2. Ensures accepted intent is durably recorded before matching

### 2) Lifecycle Orchestration and Persist-Update Sequencing

Primary file: [cml_project/exchange-back-end/src/main/java/com/helesto/service/OrderFlowOrchestrator.java](cml_project/exchange-back-end/src/main/java/com/helesto/service/OrderFlowOrchestrator.java)

Key behavior implemented and validated:

1. Pre-match persistence in NEW state
2. Post-match update with fill and pricing outcomes
3. Cancel-state write path with explicit status transition

Representative flow:

	order.setStatus("NEW");
	order.setFilledQty(0L);
	order.setLeavesQty(order.getQuantity());
	order.setAvgPrice(0.0);
	orderDao.persistOrder(order);

	order.setFilledQty((long) matchResult.filledQty);
	order.setLeavesQty((long) matchResult.leavesQty);
	order.setAvgPrice(matchResult.avgPrice);
	orderDao.updateOrder(order);

Why this matters:

1. Preserves both accepted intent and execution outcome
2. Improves recoverability and lifecycle traceability

### 3) Matching Outcome Consistency and State Guards

Primary file: [cml_project/exchange-back-end/src/main/java/com/helesto/service/FixOrderManagementEngine.java](cml_project/exchange-back-end/src/main/java/com/helesto/service/FixOrderManagementEngine.java)

Key behavior implemented and validated:

1. Fill, leaves, and average price updates tied to matching results
2. Status transitions to FILLED or PARTIALLY_FILLED based on leaves
3. Cancel and replace rejection for terminal states

Representative logic:

	order.setFilledQty((long) result.filledQty);
	order.setLeavesQty((long) result.leavesQty);
	order.setAvgPrice(totalValue / result.filledQty);

	if (result.leavesQty == 0) {
		order.setStatus("FILLED");
	} else {
		order.setStatus("PARTIALLY_FILLED");
	}

	orderDao.updateOrder(order);

Why this matters:

1. Keeps lifecycle fields mathematically coherent
2. Prevents illegal status mutations under race-prone requests

### 4) Persistence Model, Constraints, and Queryability

Primary files:

1. [cml_project/exchange-back-end/src/main/java/com/helesto/model/OrderEntity.java](cml_project/exchange-back-end/src/main/java/com/helesto/model/OrderEntity.java)
2. [cml_project/database/schema.sql](cml_project/database/schema.sql)

Lifecycle-critical fields modeled as first-class persisted state:

1. status
2. filled_qty
3. leaves_qty
4. avg_price

Index strategy implemented:

1. idx_orders_symbol
2. idx_orders_status
3. idx_orders_client_id
4. idx_orders_created_at

Why this matters:

1. Fast operational reads for status/client/symbol/time filters
2. Better consistency between API views and durable state

### 5) DAO Boundary and Batch Throughput Support

Primary file: [cml_project/exchange-back-end/src/main/java/com/helesto/dao/OrderDao.java](cml_project/exchange-back-end/src/main/java/com/helesto/dao/OrderDao.java)

Core methods:

1. persistOrder
2. updateOrder
3. findByClOrdId
4. batchPersistOrders
5. batchUpdateOrders
6. bulkUpdateStatus

Why this matters:

1. Keeps domain services free from direct query logic
2. Supports high-volume writes with chunked batch behavior

### 6) REST Lifecycle and Operational Controls

Primary file: [cml_project/exchange-back-end/src/main/java/com/helesto/rest/OrderManagementRest.java](cml_project/exchange-back-end/src/main/java/com/helesto/rest/OrderManagementRest.java)

Relevant endpoints:

1. Orchestrated batch submit
2. Amend path
3. Bulk cancel path

Why this matters:

1. Ensures HTTP-driven workflow reuses lifecycle-safe core logic
2. Provides operational tools for stress and validation runs

## Test and Validation Contribution

### Unit-level signal

Primary file: [cml_project/exchange-back-end/src/test/java/com/helesto/service/FixOrderManagementEngineTest.java](cml_project/exchange-back-end/src/test/java/com/helesto/service/FixOrderManagementEngineTest.java)

Validated paths include:

1. Cancel on active order
2. Replace semantics with leaves consistency
3. Cancel rejection on filled order

### Scenario-level stabilization

Primary files:

1. [cml_project/external-scenarios/06_stress_test/T33_cancel_storm.txt](cml_project/external-scenarios/06_stress_test/T33_cancel_storm.txt)
2. [cml_project/external-scenarios/results/T33_result.txt](cml_project/external-scenarios/results/T33_result.txt)
3. [cml_project/external-scenarios/run_all.ps1](cml_project/external-scenarios/run_all.ps1)

Contribution highlights:

1. Stabilization support for cancel-storm behavior under rapid submit/cancel cycles
2. Regression discipline with repeated full-suite execution before closure
3. Alignment between scenario assertions and durable lifecycle outcomes

## Leadership Contribution (Group 1)

Beyond module ownership, I contributed as Group 1 lead by:

1. Aligning interface contracts across FIX path, REST path, and persistence path
2. Enforcing full-suite regression gating for integration changes
3. Driving end-to-end closure, not only component-level completion

## Summary

My G1-M4 work delivered a lifecycle-consistent persistence backbone for the exchange order service. The design ensures accepted intent, execution progress, and terminal outcomes remain durable and queryable. Combined with unit and scenario validation, this contribution improved correctness, recoverability, and stability of the final deliverable.
