# Work update synchronization

User instruction: push completed updates to GitHub while working, and publish verified updates to the existing Site without asking each time.

This branch preserves the customer Site source at 93333b0214730b41f0c45d8045e7d086cbf40fae (published version 12): auth, profiles, addresses, cart, product UI, search, and favorites. It is a snapshot for integration, not a merge into main. The separate work/customer-topbar-modernization-20260907 branch contains newer topbar work that must be reconciled before integration. Existing repository assets not included in the Site transfer are preserved.

Authoritative checkout SQL remains rollout-gated. Payment and OrderSuccess use the current live flow. Do not enable database rollout as part of UI publishing.
