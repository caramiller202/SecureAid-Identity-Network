# 🔐 SecureAid Identity Network

Welcome to a secure, blockchain-powered solution for verifying identities and eligibility in humanitarian aid programs! This project uses the Stacks blockchain and Clarity smart contracts to protect vulnerable populations—such as refugees, disaster victims, or low-income communities—from identity theft, fraud, and exploitation. By decentralizing identity management, it ensures transparent, tamper-proof verification without relying on centralized authorities that can be prone to corruption or data breaches.

## ✨ Features

🔑 Secure identity registration with cryptographic proofs  
✅ Multi-step verification using attestations from trusted entities  
📋 Dynamic eligibility checks based on predefined criteria  
💰 Safe aid claim and distribution mechanisms  
🛡️ Protection against duplicate claims and identity theft  
📜 Immutable audit trails for transparency and accountability  
🤝 Governance for updating rules and adding verifiers  
🚫 Dispute resolution to handle verification challenges  

## 🛠 How It Works

This project involves 8 smart contracts written in Clarity, each handling a specific aspect of the system for modularity, security, and scalability. Here's a high-level overview:

### Smart Contracts Overview

1. **IdentityRegistry.clar**: Manages user identity registration, storing hashed personal data (e.g., biometrics or documents) linked to a principal. Prevents duplicates by checking unique hashes.

2. **AttestationVerifier.clar**: Handles attestations from trusted verifiers (e.g., NGOs or governments) via oracle-like submissions. Verifies signatures and stores approval status.

3. **EligibilityCriteria.clar**: Defines and enforces rules for aid eligibility (e.g., income thresholds, location, or status). Allows governance-approved updates to criteria.

4. **AidToken.clar**: A fungible token contract (using SIP-010 standard) for representing aid entitlements, such as digital vouchers or crypto allocations.

5. **ClaimManager.clar**: Enables eligible users to submit claims for aid, cross-checking against identity and eligibility contracts. Enforces one-time claims per cycle.

6. **DistributionHub.clar**: Coordinates aid distribution by minting or transferring tokens upon successful claims. Integrates with external wallets or off-chain disbursements.

7. **AuditLogger.clar**: Logs all key actions (registrations, verifications, claims) immutably for auditing. Anyone can query logs for transparency.

8. **GovernanceCouncil.clar**: Manages decentralized governance, allowing token holders or verified admins to propose and vote on updates (e.g., adding new verifiers or criteria).

### For Aid Recipients (Vulnerable Users)

- **Register your identity**: Submit a cryptographic hash of your personal data (e.g., biometrics or ID documents) to the `IdentityRegistry` contract. This ensures your identity is unique and protected.
- **Get verified**: Trusted entities (e.g., NGOs or local authorities) submit attestations to the `AttestationVerifier` contract to confirm your identity.
- **Check eligibility**: The `EligibilityCriteria` contract verifies if you meet the aid program’s requirements (e.g., income level or refugee status).
- **Claim aid**: Use the `ClaimManager` contract to submit a claim, which checks your verified identity and eligibility before issuing tokens via the `AidToken` contract.
- **Receive aid**: The `DistributionHub` contract facilitates the transfer of aid (e.g., digital vouchers or funds) to your wallet or an off-chain distribution point.

### For Verifiers (NGOs, Governments, or Trusted Entities)

- **Submit attestations**: Use the `AttestationVerifier` contract to submit signed attestations confirming a user’s identity or status.
- **Monitor claims**: Query the `AuditLogger` contract to track registrations, claims, and distributions for transparency.
- **Propose updates**: Participate in the `GovernanceCouncil` to propose new eligibility rules or add trusted verifiers.

### For Auditors or Public

- **Verify transparency**: Query the `AuditLogger` contract to access immutable records of all actions.
- **Check ownership or eligibility**: Use `IdentityRegistry` and `EligibilityCriteria` to confirm a user’s status or claim validity.

## 🚀 Getting Started

1. **Set up a Stacks wallet**: Use a compatible wallet (e.g., Hiro Wallet) to interact with the Stacks blockchain.
2. **Deploy contracts**: Deploy the 8 Clarity smart contracts to the Stacks blockchain using the Clarity development environment.
3. **Register identities**: Aid recipients can register their hashed identity data via the `IdentityRegistry` contract.
4. **Configure verifiers**: Initialize trusted verifiers in the `AttestationVerifier` contract through the `GovernanceCouncil`.
5. **Set eligibility rules**: Define initial criteria in the `EligibilityCriteria` contract (e.g., income < $500/month or refugee status).
6. **Distribute aid**: Fund the `DistributionHub` with tokens or link it to off-chain resources for aid distribution.

## 🛡️ Security Considerations

- **Hash-based privacy**: Personal data is hashed (e.g., SHA-256) before storage to protect user privacy.
- **Duplicate prevention**: `IdentityRegistry` ensures no duplicate identities via unique hashes.
- **Governance safeguards**: `GovernanceCouncil` requires multi-signature or token-weighted voting for updates.
- **Immutable logs**: `AuditLogger` ensures all actions are traceable, preventing fraud or tampering.
- **Rate limiting**: `ClaimManager` enforces one claim per user per aid cycle to prevent abuse.

## 📚 Example Workflow

1. A refugee hashes their biometric data and registers it with `IdentityRegistry`.
2. An NGO verifies their identity via `AttestationVerifier` by submitting a signed attestation.
3. The system checks eligibility (e.g., confirmed refugee status) using `EligibilityCriteria`.
4. The refugee submits a claim via `ClaimManager`, which issues `AidToken` upon verification.
5. The `DistributionHub` transfers tokens to the refugee’s wallet or coordinates off-chain delivery.
6. Auditors query `AuditLogger` to confirm the process was transparent and fair.

## 🌍 Why It Matters

This system addresses real-world challenges in humanitarian aid:
- **Identity theft**: Vulnerable populations often face exploitation when centralized systems leak data.
- **Fraud prevention**: Decentralized verification ensures only eligible individuals receive aid.
- **Transparency**: Immutable logs build trust among donors, recipients, and organizations.
- **Accessibility**: Blockchain removes reliance on corruptible intermediaries, empowering communities.

## 🛠 Tools and Dependencies

- **Stacks Blockchain**: Layer-1 blockchain for secure smart contracts.
- **Clarity**: Smart contract language for predictable, secure execution.
- **SIP-010**: Standard for fungible tokens used in `AidToken`.
- **Hiro Wallet**: For user interaction with the contracts.
- **Clarity CLI**: For deploying and testing contracts locally.