import { describe, expect, it, beforeEach } from "vitest";

// Interfaces for type safety
interface ClarityResponse<T> {
  ok: boolean;
  value: T | number; // number for error codes
}

interface IdentityDetails {
  owner: string;
  timestamp: number;
  metadata: string;
  status: string;
  verified: boolean;
}

interface IdentityHistory {
  updatedBy: string;
  timestamp: number;
  changes: string;
  previousMetadata: string;
}

interface ContractState {
  identities: Map<string, IdentityDetails>; // Key: identity-hash (string for simplicity)
  identityOwners: Map<string, string>; // Key: owner, Value: identity-hash
  identityHistory: Map<string, IdentityHistory>; // Key: `${identity-hash}-${update-id}`
  updateCounters: Map<string, number>; // Key: identity-hash, Value: count
  contractOwner: string;
}

// Mock contract implementation
class IdentityRegistryMock {
  private state: ContractState = {
    identities: new Map(),
    identityOwners: new Map(),
    identityHistory: new Map(),
    updateCounters: new Map(),
    contractOwner: "deployer",
  };

  private ERR_ALREADY_REGISTERED = 100;
  private ERR_NOT_OWNER = 101;
  private ERR_INVALID_HASH = 102;
  private ERR_UNAUTHORIZED = 103;
  private ERR_INVALID_METADATA = 104;
  private ERR_IDENTITY_NOT_FOUND = 105;
  private ERR_INVALID_STATUS = 106;
  private ERR_MAX_METADATA_LEN = 107;
  private ERR_ALREADY_VERIFIED = 108;
  private ERR_NOT_VERIFIED = 109;
  private MAX_METADATA_LEN = 500;

  private blockHeight = 100; // Mock block height

  // Simulate block height increase
  private incrementBlockHeight() {
    this.blockHeight += 1;
  }

  getIdentityDetails(identityHash: string): ClarityResponse<IdentityDetails | null> {
    return { ok: true, value: this.state.identities.get(identityHash) ?? null };
  }

  getIdentityByOwner(owner: string): ClarityResponse<string | null> {
    return { ok: true, value: this.state.identityOwners.get(owner) ?? null };
  }

  isIdentityRegistered(identityHash: string): ClarityResponse<boolean> {
    return { ok: true, value: this.state.identities.has(identityHash) };
  }

  isOwner(identityHash: string, principalToCheck: string): ClarityResponse<boolean> {
    const details = this.state.identities.get(identityHash);
    return { ok: true, value: details ? details.owner === principalToCheck : false };
  }

  getUpdateHistory(identityHash: string, updateId: number): ClarityResponse<IdentityHistory | null> {
    return { ok: true, value: this.state.identityHistory.get(`${identityHash}-${updateId}`) ?? null };
  }

  getUpdateCount(identityHash: string): ClarityResponse<number> {
    return { ok: true, value: this.state.updateCounters.get(identityHash) ?? 0 };
  }

  isVerified(identityHash: string): ClarityResponse<boolean> {
    const details = this.state.identities.get(identityHash);
    return { ok: true, value: details ? details.verified : false };
  }

  registerIdentity(caller: string, identityHash: string, metadata: string): ClarityResponse<boolean> {
    this.incrementBlockHeight();
    if (identityHash.length !== 64) { // Assuming hex string for buff 32
      return { ok: false, value: this.ERR_INVALID_HASH };
    }
    if (metadata.length > this.MAX_METADATA_LEN) {
      return { ok: false, value: this.ERR_INVALID_METADATA };
    }
    if (this.state.identities.has(identityHash) || this.state.identityOwners.has(caller)) {
      return { ok: false, value: this.ERR_ALREADY_REGISTERED };
    }
    this.state.identities.set(identityHash, {
      owner: caller,
      timestamp: this.blockHeight,
      metadata,
      status: "registered",
      verified: false,
    });
    this.state.identityOwners.set(caller, identityHash);
    return { ok: true, value: true };
  }

  updateMetadata(caller: string, identityHash: string, newMetadata: string, changes: string): ClarityResponse<boolean> {
    this.incrementBlockHeight();
    const details = this.state.identities.get(identityHash);
    if (!details) {
      return { ok: false, value: this.ERR_IDENTITY_NOT_FOUND };
    }
    if (details.owner !== caller) {
      return { ok: false, value: this.ERR_NOT_OWNER };
    }
    if (newMetadata.length > this.MAX_METADATA_LEN) {
      return { ok: false, value: this.ERR_INVALID_METADATA };
    }
    const currentCount = this.state.updateCounters.get(identityHash) ?? 0;
    const newId = currentCount + 1;
    this.state.identityHistory.set(`${identityHash}-${newId}`, {
      updatedBy: caller,
      timestamp: this.blockHeight,
      changes,
      previousMetadata: details.metadata,
    });
    this.state.updateCounters.set(identityHash, newId);
    details.metadata = newMetadata;
    this.state.identities.set(identityHash, details);
    return { ok: true, value: true };
  }

  setStatus(caller: string, identityHash: string, newStatus: string, changes: string): ClarityResponse<boolean> {
    this.incrementBlockHeight();
    const details = this.state.identities.get(identityHash);
    if (!details) {
      return { ok: false, value: this.ERR_IDENTITY_NOT_FOUND };
    }
    if (details.owner !== caller) {
      return { ok: false, value: this.ERR_NOT_OWNER };
    }
    const currentCount = this.state.updateCounters.get(identityHash) ?? 0;
    const newId = currentCount + 1;
    this.state.identityHistory.set(`${identityHash}-${newId}`, {
      updatedBy: caller,
      timestamp: this.blockHeight,
      changes,
      previousMetadata: details.metadata,
    });
    this.state.updateCounters.set(identityHash, newId);
    details.status = newStatus;
    this.state.identities.set(identityHash, details);
    return { ok: true, value: true };
  }

  verifyIdentity(caller: string, identityHash: string): ClarityResponse<boolean> {
    this.incrementBlockHeight();
    const details = this.state.identities.get(identityHash);
    if (!details) {
      return { ok: false, value: this.ERR_IDENTITY_NOT_FOUND };
    }
    if (caller !== this.state.contractOwner) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    if (details.verified) {
      return { ok: false, value: this.ERR_ALREADY_VERIFIED };
    }
    const currentCount = this.state.updateCounters.get(identityHash) ?? 0;
    const newId = currentCount + 1;
    this.state.identityHistory.set(`${identityHash}-${newId}`, {
      updatedBy: caller,
      timestamp: this.blockHeight,
      changes: "Identity verified",
      previousMetadata: details.metadata,
    });
    this.state.updateCounters.set(identityHash, newId);
    details.verified = true;
    details.status = "verified";
    this.state.identities.set(identityHash, details);
    return { ok: true, value: true };
  }

  suspendIdentity(caller: string, identityHash: string, reason: string): ClarityResponse<boolean> {
    this.incrementBlockHeight();
    const details = this.state.identities.get(identityHash);
    if (!details) {
      return { ok: false, value: this.ERR_IDENTITY_NOT_FOUND };
    }
    if (caller !== this.state.contractOwner) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    const currentCount = this.state.updateCounters.get(identityHash) ?? 0;
    const newId = currentCount + 1;
    this.state.identityHistory.set(`${identityHash}-${newId}`, {
      updatedBy: caller,
      timestamp: this.blockHeight,
      changes: reason,
      previousMetadata: details.metadata,
    });
    this.state.updateCounters.set(identityHash, newId);
    details.status = "suspended";
    details.verified = false;
    this.state.identities.set(identityHash, details);
    return { ok: true, value: true };
  }

  transferOwnership(caller: string, identityHash: string, newOwner: string): ClarityResponse<boolean> {
    this.incrementBlockHeight();
    const details = this.state.identities.get(identityHash);
    if (!details) {
      return { ok: false, value: this.ERR_IDENTITY_NOT_FOUND };
    }
    if (details.owner !== caller) {
      return { ok: false, value: this.ERR_NOT_OWNER };
    }
    if (this.state.identityOwners.has(newOwner)) {
      return { ok: false, value: this.ERR_ALREADY_REGISTERED };
    }
    const currentCount = this.state.updateCounters.get(identityHash) ?? 0;
    const newId = currentCount + 1;
    this.state.identityHistory.set(`${identityHash}-${newId}`, {
      updatedBy: caller,
      timestamp: this.blockHeight,
      changes: "Ownership transferred",
      previousMetadata: details.metadata,
    });
    this.state.updateCounters.set(identityHash, newId);
    this.state.identityOwners.delete(caller);
    this.state.identityOwners.set(newOwner, identityHash);
    details.owner = newOwner;
    this.state.identities.set(identityHash, details);
    return { ok: true, value: true };
  }
}

// Test setup
const accounts = {
  deployer: "deployer",
  user1: "wallet_1",
  user2: "wallet_2",
  unauthorized: "wallet_3",
};

describe("IdentityRegistry Contract", () => {
  let contract: IdentityRegistryMock;

  beforeEach(() => {
    contract = new IdentityRegistryMock();
  });

  it("should register a new identity successfully", () => {
    const hash = "a".repeat(64); // Mock 32-byte hash in hex
    const result = contract.registerIdentity(accounts.user1, hash, "User metadata");
    expect(result).toEqual({ ok: true, value: true });

    const details = contract.getIdentityDetails(hash);
    expect(details).toEqual({
      ok: true,
      value: expect.objectContaining({
        owner: accounts.user1,
        metadata: "User metadata",
        status: "registered",
        verified: false,
      }),
    });

    const ownerIdentity = contract.getIdentityByOwner(accounts.user1);
    expect(ownerIdentity).toEqual({ ok: true, value: hash });
  });

  it("should prevent duplicate registration by hash", () => {
    const hash = "a".repeat(64);
    contract.registerIdentity(accounts.user1, hash, "Metadata");

    const duplicateResult = contract.registerIdentity(accounts.user2, hash, "New metadata");
    expect(duplicateResult).toEqual({ ok: false, value: 100 });
  });

  it("should prevent multiple identities per owner", () => {
    const hash1 = "a".repeat(64);
    const hash2 = "b".repeat(64);
    contract.registerIdentity(accounts.user1, hash1, "Metadata1");

    const secondResult = contract.registerIdentity(accounts.user1, hash2, "Metadata2");
    expect(secondResult).toEqual({ ok: false, value: 100 });
  });

  it("should allow owner to update metadata", () => {
    const hash = "a".repeat(64);
    contract.registerIdentity(accounts.user1, hash, "Old metadata");

    const updateResult = contract.updateMetadata(accounts.user1, hash, "New metadata", "Updated description");
    expect(updateResult).toEqual({ ok: true, value: true });

    const details = contract.getIdentityDetails(hash);
    expect(details.value?.metadata).toBe("New metadata");

    const history = contract.getUpdateHistory(hash, 1);
    expect(history).toEqual({
      ok: true,
      value: expect.objectContaining({
        changes: "Updated description",
        previousMetadata: "Old metadata",
      }),
    });

    const count = contract.getUpdateCount(hash);
    expect(count).toEqual({ ok: true, value: 1 });
  });

  it("should prevent non-owner from updating metadata", () => {
    const hash = "a".repeat(64);
    contract.registerIdentity(accounts.user1, hash, "Metadata");

    const updateResult = contract.updateMetadata(accounts.user2, hash, "New metadata", "Changes");
    expect(updateResult).toEqual({ ok: false, value: 101 });
  });

  it("should allow admin to verify identity", () => {
    const hash = "a".repeat(64);
    contract.registerIdentity(accounts.user1, hash, "Metadata");

    const verifyResult = contract.verifyIdentity(accounts.deployer, hash);
    expect(verifyResult).toEqual({ ok: true, value: true });

    const isVerified = contract.isVerified(hash);
    expect(isVerified).toEqual({ ok: true, value: true });

    const details = contract.getIdentityDetails(hash);
    expect(details.value?.status).toBe("verified");
  });

  it("should prevent non-admin from verifying identity", () => {
    const hash = "a".repeat(64);
    contract.registerIdentity(accounts.user1, hash, "Metadata");

    const verifyResult = contract.verifyIdentity(accounts.unauthorized, hash);
    expect(verifyResult).toEqual({ ok: false, value: 103 });
  });

  it("should prevent verifying already verified identity", () => {
    const hash = "a".repeat(64);
    contract.registerIdentity(accounts.user1, hash, "Metadata");
    contract.verifyIdentity(accounts.deployer, hash);

    const secondVerify = contract.verifyIdentity(accounts.deployer, hash);
    expect(secondVerify).toEqual({ ok: false, value: 108 });
  });

  it("should allow admin to suspend identity", () => {
    const hash = "a".repeat(64);
    contract.registerIdentity(accounts.user1, hash, "Metadata");

    const suspendResult = contract.suspendIdentity(accounts.deployer, hash, "Suspension reason");
    expect(suspendResult).toEqual({ ok: true, value: true });

    const details = contract.getIdentityDetails(hash);
    expect(details.value?.status).toBe("suspended");
    expect(details.value?.verified).toBe(false);
  });

  it("should allow owner to transfer ownership", () => {
    const hash = "a".repeat(64);
    contract.registerIdentity(accounts.user1, hash, "Metadata");

    const transferResult = contract.transferOwnership(accounts.user1, hash, accounts.user2);
    expect(transferResult).toEqual({ ok: true, value: true });

    const newOwnerIdentity = contract.getIdentityByOwner(accounts.user2);
    expect(newOwnerIdentity).toEqual({ ok: true, value: hash });

    const oldOwnerIdentity = contract.getIdentityByOwner(accounts.user1);
    expect(oldOwnerIdentity).toEqual({ ok: true, value: null });

    const details = contract.getIdentityDetails(hash);
    expect(details.value?.owner).toBe(accounts.user2);
  });

  it("should prevent transfer to existing owner", () => {
    const hash1 = "a".repeat(64);
    const hash2 = "b".repeat(64);
    contract.registerIdentity(accounts.user1, hash1, "Metadata1");
    contract.registerIdentity(accounts.user2, hash2, "Metadata2");

    const transferResult = contract.transferOwnership(accounts.user1, hash1, accounts.user2);
    expect(transferResult).toEqual({ ok: false, value: 100 });
  });

  it("should reject invalid hash length", () => {
    const invalidHash = "short";
    const result = contract.registerIdentity(accounts.user1, invalidHash, "Metadata");
    expect(result).toEqual({ ok: false, value: 102 });
  });

  it("should reject metadata exceeding max length", () => {
    const hash = "a".repeat(64);
    const longMetadata = "a".repeat(501);
    const result = contract.registerIdentity(accounts.user1, hash, longMetadata);
    expect(result).toEqual({ ok: false, value: 104 });
  });
});