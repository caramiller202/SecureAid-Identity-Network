;; Identity Registry Smart Contract
;; This contract manages decentralized identity registration for aid recipients,
;; storing hashed personal data to ensure privacy and uniqueness.

;; Constants
(define-constant ERR-ALREADY-REGISTERED u100)
(define-constant ERR-NOT-OWNER u101)
(define-constant ERR-INVALID-HASH u102)
(define-constant ERR-UNAUTHORIZED u103)
(define-constant ERR-INVALID-METADATA u104)
(define-constant ERR-IDENTITY-NOT-FOUND u105)
(define-constant ERR-INVALID-STATUS u106)
(define-constant ERR-MAX-METADATA-LEN u107)
(define-constant ERR-ALREADY-VERIFIED u108)
(define-constant ERR-NOT-VERIFIED u109)
(define-constant MAX-METADATA-LEN u500)
(define-constant CONTRACT-OWNER tx-sender)

;; Data Maps
(define-map identities
  { identity-hash: (buff 32) }  ;; SHA-256 hash of personal data
  {
    owner: principal,            ;; Principal who registered the identity
    timestamp: uint,             ;; Registration block height
    metadata: (string-utf8 500), ;; Additional description or notes
    status: (string-ascii 20),   ;; Status: "registered", "verified", "suspended"
    verified: bool               ;; Verification flag
  }
)

(define-map identity-owners
  { owner: principal }
  { identity-hash: (buff 32) }   ;; Maps principal to their identity hash (one identity per principal)
)

(define-map identity-history
  { identity-hash: (buff 32), update-id: uint }
  {
    updated-by: principal,
    timestamp: uint,
    changes: (string-utf8 200),  ;; Description of changes
    previous-metadata: (string-utf8 500)
  }
)

(define-map update-counters
  { identity-hash: (buff 32) }
  { count: uint }
)

;; Read-Only Functions
(define-read-only (get-identity-details (identity-hash (buff 32)))
  (map-get? identities { identity-hash: identity-hash })
)

(define-read-only (get-identity-by-owner (owner principal))
  (map-get? identity-owners { owner: owner })
)

(define-read-only (is-identity-registered (identity-hash (buff 32)))
  (is-some (get-identity-details identity-hash))
)

(define-read-only (is-owner (identity-hash (buff 32)) (principal-to-check principal))
  (match (get-identity-details identity-hash)
    details (is-eq (get owner details) principal-to-check)
    false
  )
)

(define-read-only (get-update-history (identity-hash (buff 32)) (update-id uint))
  (map-get? identity-history { identity-hash: identity-hash, update-id: update-id })
)

(define-read-only (get-update-count (identity-hash (buff 32)))
  (default-to u0 (get count (map-get? update-counters { identity-hash: identity-hash })))
)

(define-read-only (is-verified (identity-hash (buff 32)))
  (match (get-identity-details identity-hash)
    details (get verified details)
    false
  )
)

;; Private Functions
(define-private (validate-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
    (ok true)
    (err ERR-INVALID-HASH)
  )
)

(define-private (validate-metadata (metadata (string-utf8 500)))
  (if (<= (len metadata) MAX-METADATA-LEN)
    (ok true)
    (err ERR-INVALID-METADATA)
  )
)

(define-private (log-update (identity-hash (buff 32)) (changes (string-utf8 200)) (previous-metadata (string-utf8 500)))
  (let (
    (current-count (get-update-count identity-hash))
    (new-id (+ current-count u1))
  )
    (map-set identity-history
      { identity-hash: identity-hash, update-id: new-id }
      {
        updated-by: tx-sender,
        timestamp: block-height,
        changes: changes,
        previous-metadata: previous-metadata
      }
    )
    (map-set update-counters
      { identity-hash: identity-hash }
      { count: new-id }
    )
    (ok new-id)
  )
)

;; Public Functions
(define-public (register-identity (identity-hash (buff 32)) (metadata (string-utf8 500)))
  (let (
    (existing-identity (get-identity-details identity-hash))
    (existing-owner-identity (get-identity-by-owner tx-sender))
  )
    (try! (validate-hash identity-hash))
    (try! (validate-metadata metadata))
    (if (or (is-some existing-identity) (is-some existing-owner-identity))
      (err ERR-ALREADY-REGISTERED)
      (begin
        (map-set identities
          { identity-hash: identity-hash }
          {
            owner: tx-sender,
            timestamp: block-height,
            metadata: metadata,
            status: "registered",
            verified: false
          }
        )
        (map-set identity-owners
          { owner: tx-sender }
          { identity-hash: identity-hash }
        )
        (ok true)
      )
    )
  )
)

(define-public (update-metadata (identity-hash (buff 32)) (new-metadata (string-utf8 500)) (changes (string-utf8 200)))
  (let (
    (details (unwrap! (get-identity-details identity-hash) (err ERR-IDENTITY-NOT-FOUND)))
  )
    (try! (validate-metadata new-metadata))
    (if (is-eq (get owner details) tx-sender)
      (begin
        (try! (log-update identity-hash changes (get metadata details)))
        (map-set identities
          { identity-hash: identity-hash }
          (merge details { metadata: new-metadata })
        )
        (ok true)
      )
      (err ERR-NOT-OWNER)
    )
  )
)

(define-public (set-status (identity-hash (buff 32)) (new-status (string-ascii 20)) (changes (string-utf8 200)))
  (let (
    (details (unwrap! (get-identity-details identity-hash) (err ERR-IDENTITY-NOT-FOUND)))
  )
    (if (is-eq (get owner details) tx-sender)
      (begin
        (try! (log-update identity-hash changes (get metadata details)))
        (map-set identities
          { identity-hash: identity-hash }
          (merge details { status: new-status })
        )
        (ok true)
      )
      (err ERR-NOT-OWNER)
    )
  )
)

(define-public (verify-identity (identity-hash (buff 32)))
  (let (
    (details (unwrap! (get-identity-details identity-hash) (err ERR-IDENTITY-NOT-FOUND)))
  )
    ;; For now, assume only contract owner (admin) can verify; in full system, link to AttestationVerifier
    (if (is-eq tx-sender CONTRACT-OWNER)
      (if (get verified details)
        (err ERR-ALREADY-VERIFIED)
        (begin
          (try! (log-update identity-hash "Identity verified" (get metadata details)))
          (map-set identities
            { identity-hash: identity-hash }
            (merge details { verified: true, status: "verified" })
          )
          (ok true)
        )
      )
      (err ERR-UNAUTHORIZED)
    )
  )
)

(define-public (suspend-identity (identity-hash (buff 32)) (reason (string-utf8 200)))
  (let (
    (details (unwrap! (get-identity-details identity-hash) (err ERR-IDENTITY-NOT-FOUND)))
  )
    (if (is-eq tx-sender CONTRACT-OWNER)
      (begin
        (try! (log-update identity-hash reason (get metadata details)))
        (map-set identities
          { identity-hash: identity-hash }
          (merge details { status: "suspended", verified: false })
        )
        (ok true)
      )
      (err ERR-UNAUTHORIZED)
    )
  )
)

(define-public (transfer-ownership (identity-hash (buff 32)) (new-owner principal))
  (let (
    (details (unwrap! (get-identity-details identity-hash) (err ERR-IDENTITY-NOT-FOUND)))
    (existing-new-owner-identity (get-identity-by-owner new-owner))
  )
    (if (is-eq (get owner details) tx-sender)
      (if (is-some existing-new-owner-identity)
        (err ERR-ALREADY-REGISTERED)
        (begin
          (try! (log-update identity-hash "Ownership transferred" (get metadata details)))
          (map-set identities
            { identity-hash: identity-hash }
            (merge details { owner: new-owner })
          )
          (map-delete identity-owners { owner: tx-sender })
          (map-set identity-owners
            { owner: new-owner }
            { identity-hash: identity-hash }
          )
          (ok true)
        )
      )
      (err ERR-NOT-OWNER)
    )
  )
)