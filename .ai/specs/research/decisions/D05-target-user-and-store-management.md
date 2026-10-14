# D05 — Primary user: owner of a small online store; store management is part of the value

- Date, owner: 2026-10-14, product owner (project author), in the `om-discover` session.
- Context and the options weighed: the agent proposed narrowing the primary user to "a small-store owner who has analytics data but does not know which changes to make", with the storefront and admin treated as the data source for the demo. The alternative was the broader spec wording ("manage products and orders and understand store performance").
- Decision and why: the primary user is the owner of a **small** online store; owners of **medium and large** stores are a later target. The owner did not accept treating store management as plumbing: store management must be done well too, so that the owner understands what is responsible for what and what consequences a change has. The owner also named AI-drafted product descriptions as something that would make sense. That item is already P1 in the MVP spec, so its priority is unchanged.
- Consequences, and what would make us revisit it: Scope stays as in D01 and the MVP spec, and the admin's clarity about cause and effect is a quality goal rather than an add-on. Medium and large stores are not designed for now. Revisit when the project moves beyond the portfolio path (D04).
- Status: active
