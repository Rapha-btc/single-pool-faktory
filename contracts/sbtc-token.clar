;; Mock sBTC Token for Testing
(impl-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-fungible-token sbtc)

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u401))

(define-public (transfer (amount uint) (from principal) (to principal) (memo (optional (buff 34))))
  (begin
    (asserts! (or (is-eq tx-sender from) (is-eq contract-caller from)) ERR_UNAUTHORIZED)
    (ft-transfer? sbtc amount from to)
  )
)

(define-public (mint (amount uint) (recipient principal))
  (ft-mint? sbtc amount recipient)
)

(define-read-only (get-name) (ok "Synthetic Bitcoin"))
(define-read-only (get-symbol) (ok "sBTC"))
(define-read-only (get-decimals) (ok u8))
(define-read-only (get-balance (who principal)) (ok (ft-get-balance sbtc who)))
(define-read-only (get-total-supply) (ok (ft-get-supply sbtc)))
(define-read-only (get-token-uri) (ok none))