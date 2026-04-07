# Capital Markets Lab Final Deliverable

This repository contains the final submission under [cml_project](cml_project).

## Individual Contribution Dossier

Author: Aarav Ashutosh Joshi  
Primary Module: G1-M4 (Order Persistence and Database Integration)  
Additional Role: Group 1 coordination lead and stress-suite stabilization support

## Repository Layout

1. Core project root: [cml_project](cml_project)
2. Exchange backend (primary contribution area): [cml_project/exchange-back-end](cml_project/exchange-back-end)
3. External regression suite: [cml_project/external-scenarios](cml_project/external-scenarios)
4. Database schema: [cml_project/database](cml_project/database)
5. Team documentation: [cml_project/README.md](cml_project/README.md)

## Executive Contribution Summary

My work focused on ensuring the exchange order lifecycle is durable, mathematically consistent, and operationally testable from ingestion to terminal state. The core implementation outcome is a persistence-first lifecycle model in which accepted intent, matching outcomes, and cancel/replace transitions are all durably represented and queryable.

This contribution spans:

1. Intake deduplication and early persistence
2. Orchestrated pre-match and post-match writes
3. Lifecycle-safe status transitions for cancel/replace
4. Schema and indexing strategy for operational query patterns
5. DAO abstraction with batch and bulk write support
6. Stress scenario stabilization and full-suite regression discipline

## Architecture Context for My Module

In Group 1, the lifecycle path was split into protocol intake, orchestration, matching, persistence, and external controls. My module sat at the persistence boundary, but in practice it influenced all layers because every lifecycle guarantee had to be validated against durable state.

Primary integration points:

1. FIX entry: [cml_project/exchange-back-end/src/main/java/com/helesto/core/ExchangeApplication.java](cml_project/exchange-back-end/src/main/java/com/helesto/core/ExchangeApplication.java)
2. Intake engine: [cml_project/exchange-back-end/src/main/java/com/helesto/service/QuickFixJOrderIntakeEngine.java](cml_project/exchange-back-end/src/main/java/com/helesto/service/QuickFixJOrderIntakeEngine.java)
3. Orchestrator: [cml_project/exchange-back-end/src/main/java/com/helesto/service/OrderFlowOrchestrator.java](cml_project/exchange-back-end/src/main/java/com/helesto/service/OrderFlowOrchestrator.java)
4. Lifecycle engine: [cml_project/exchange-back-end/src/main/java/com/helesto/service/FixOrderManagementEngine.java](cml_project/exchange-back-end/src/main/java/com/helesto/service/FixOrderManagementEngine.java)
5. DAO boundary: [cml_project/exchange-back-end/src/main/java/com/helesto/dao/OrderDao.java](cml_project/exchange-back-end/src/main/java/com/helesto/dao/OrderDao.java)

## Detailed Technical Contribution

### 1. Intake Deduplication and Durable Acceptance Record

Primary file: [cml_project/exchange-back-end/src/main/java/com/helesto/service/QuickFixJOrderIntakeEngine.java](cml_project/exchange-back-end/src/main/java/com/helesto/service/QuickFixJOrderIntakeEngine.java)

What was implemented:

1. Duplicate detection by Client Order ID before deeper processing
2. Validation and enrichment before acceptance
3. Immediate baseline persistence of NEW orders

Why it is critical:

1. Prevents duplicate active orders from replay and client retries
2. Ensures accepted orders have durable records before matching
3. Eliminates acceptance-without-persistence failure mode

### 2. Two-Step Persistence Sequencing Through Orchestration

Primary file: [cml_project/exchange-back-end/src/main/java/com/helesto/service/OrderFlowOrchestrator.java](cml_project/exchange-back-end/src/main/java/com/helesto/service/OrderFlowOrchestrator.java)

What was implemented:

1. Pre-match write with NEW state and baseline quantity fields
2. Post-match update with fills, leaves, avg price, and status
3. Explicit cancel-state write path

Why it is critical:

1. Preserves accepted intent and execution outcome as separate lifecycle facts
2. Improves crash recoverability and replay confidence
3. Makes lifecycle transitions traceable in storage

### 3. Matching Consistency and Guarded State Transition Logic

Primary file: [cml_project/exchange-back-end/src/main/java/com/helesto/service/FixOrderManagementEngine.java](cml_project/exchange-back-end/src/main/java/com/helesto/service/FixOrderManagementEngine.java)

What was implemented:

1. Fill and leaves updates tied directly to matching results
2. Avg price updates from actual fill value accumulation
3. Status transitions to FILLED or PARTIALLY_FILLED based on remaining quantity
4. Guarded cancel/replace semantics to block invalid terminal-state mutation

Why it is critical:

1. Maintains quantity and status coherence under partial and multi-fill conditions
2. Reduces race-sensitive lifecycle corruption under load
3. Enforces state-machine behavior over permissive CRUD edits

### 4. Entity and Schema Model for Lifecycle Truth

Primary files:

1. [cml_project/exchange-back-end/src/main/java/com/helesto/model/OrderEntity.java](cml_project/exchange-back-end/src/main/java/com/helesto/model/OrderEntity.java)
2. [cml_project/database/schema.sql](cml_project/database/schema.sql)

Key lifecycle fields carried as first-class data:

1. status
2. filled_qty
3. leaves_qty
4. avg_price
5. cl_ord_id and order_ref_number for identity traceability

Index strategy implemented:

1. symbol
2. status
3. client_id
4. created_at

Why it is critical:

1. Supports operational filters used by APIs and validation scripts
2. Improves read responsiveness in active-state and audit scenarios
3. Makes durable state independently interpretable

### 5. DAO as Exclusive Persistence Boundary and Throughput Layer

Primary file: [cml_project/exchange-back-end/src/main/java/com/helesto/dao/OrderDao.java](cml_project/exchange-back-end/src/main/java/com/helesto/dao/OrderDao.java)

What was implemented:

1. Core insert/update/find access methods
2. Batch persist with configurable chunking and default behavior
3. Batch update and bulk status mutation helpers
4. Retention-oriented bulk delete helper

Why it is critical:

1. Keeps domain logic separated from persistence mechanics
2. Supports high-volume write behavior in stress runs
3. Centralizes transactional write semantics in one layer

### 6. REST Path Cohesion with Lifecycle Core

Primary file: [cml_project/exchange-back-end/src/main/java/com/helesto/rest/OrderManagementRest.java](cml_project/exchange-back-end/src/main/java/com/helesto/rest/OrderManagementRest.java)

What was implemented or aligned:

1. Orchestrated order submit path
2. Batch submit path with throughput and latency reporting
3. Amend and bulk cancel lifecycle operations

Why it is critical:

1. REST behavior reuses lifecycle-safe core services
2. Provides external control and observability for validation runs

## Validation and Reliability Contribution

### Unit Validation Coverage

Primary file: [cml_project/exchange-back-end/src/test/java/com/helesto/service/FixOrderManagementEngineTest.java](cml_project/exchange-back-end/src/test/java/com/helesto/service/FixOrderManagementEngineTest.java)

Validated behaviors:

1. Cancel path updates active order state correctly
2. Replace path preserves identity semantics with amended values
3. Terminal-state cancel request is correctly rejected

### Integration and Stress Validation

Primary files:

1. [cml_project/external-scenarios/run_all.ps1](cml_project/external-scenarios/run_all.ps1)
2. [cml_project/external-scenarios/README.md](cml_project/external-scenarios/README.md)
3. [cml_project/external-scenarios/06_stress_test/T33_cancel_storm.txt](cml_project/external-scenarios/06_stress_test/T33_cancel_storm.txt)
4. [cml_project/external-scenarios/results/T33_result.txt](cml_project/external-scenarios/results/T33_result.txt)

Stabilization work included:

1. Reinforcing lifecycle behavior under submit/cancel bursts
2. Validating stress outcomes against durable state expectations
3. Repeating full-suite runs before closure to reduce one-off pass risk

## Leadership and Cross-Team Delivery Contribution

In addition to module implementation, I contributed as Group 1 coordination lead with focus on integration correctness.

Leadership contributions:

1. Interface alignment across FIX ingestion, orchestration, engine, DAO, and REST paths
2. Regression gate discipline requiring stable full-suite behavior before sign-off
3. End-to-end ownership of lifecycle quality, not only component-level completion

## Evidence Matrix

| Contribution Area | Main Evidence Files |
|---|---|
| Deduplication and acceptance persistence | [QuickFixJOrderIntakeEngine.java](cml_project/exchange-back-end/src/main/java/com/helesto/service/QuickFixJOrderIntakeEngine.java) |
| Pre-match and post-match write sequencing | [OrderFlowOrchestrator.java](cml_project/exchange-back-end/src/main/java/com/helesto/service/OrderFlowOrchestrator.java) |
| Fill consistency and state guards | [FixOrderManagementEngine.java](cml_project/exchange-back-end/src/main/java/com/helesto/service/FixOrderManagementEngine.java) |
| Entity and schema lifecycle model | [OrderEntity.java](cml_project/exchange-back-end/src/main/java/com/helesto/model/OrderEntity.java), [schema.sql](cml_project/database/schema.sql) |
| DAO and batch throughput behavior | [OrderDao.java](cml_project/exchange-back-end/src/main/java/com/helesto/dao/OrderDao.java) |
| REST operational lifecycle controls | [OrderManagementRest.java](cml_project/exchange-back-end/src/main/java/com/helesto/rest/OrderManagementRest.java) |
| Unit validation | [FixOrderManagementEngineTest.java](cml_project/exchange-back-end/src/test/java/com/helesto/service/FixOrderManagementEngineTest.java) |
| Stress and suite validation | [run_all.ps1](cml_project/external-scenarios/run_all.ps1), [T33_cancel_storm.txt](cml_project/external-scenarios/06_stress_test/T33_cancel_storm.txt), [T33_result.txt](cml_project/external-scenarios/results/T33_result.txt) |

## Reproducibility Notes

To inspect contribution evidence quickly:

1. Start with the code map sections above
2. Open the Evidence Matrix links by area
3. Verify stress result markers in T33 result file
4. Verify runner summary logic in run_all script

## Final Statement

My G1-M4 contribution delivered a persistence-safe lifecycle backbone that improved correctness, traceability, and recovery behavior of the exchange order path. Combined with scenario-first validation and integration governance, this work helped move the project from feature-complete to reliably stable under repeated stress and regression runs.
