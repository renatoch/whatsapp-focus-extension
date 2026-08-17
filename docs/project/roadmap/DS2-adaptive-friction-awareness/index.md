[< Roadmap](../index.md)

# DS2 — Adaptive Friction Awareness

**Status:** 🟠 Implementing

---

## Outcome

The extension recognizes when its fixed normal-mode friction may have become an automatic choreography and shifts from gatekeeper to mirror: it records a privacy-preserving behavioral baseline, shows patterns outside the moment of impulse, and invites the user to interpret those patterns before any adaptive intervention is designed.

## Why this matters

The current pause, countdown, and confirmation still add mechanical friction, but repeated use can teach the body to complete the sequence without recovering awareness. Adding more delay or clicks risks producing a longer choreography rather than a conscious choice.

The first delivery therefore observes before intervening. It should help distinguish intentional use from repeated checking, waiting for a reply, anguish/boredom, or automatic behavior without claiming to infer inner state from clicks alone.

Source exploration: [`adaptive-friction-awareness`](../../explorations/adaptive-friction-awareness/index.md)

## Experiment boundary

- Observe for an initial 7-day baseline.
- Keep the existing normal-mode barrier unchanged during baseline collection.
- Store data locally only.
- Do not record message content, conversation names, contact names, phone numbers, search terms, or chat identifiers.
- Present hypotheses as questions for user recognition, not behavioral diagnoses.
- Show reflection outside the immediate opening impulse, through a voluntary view or a low-pressure daily moment.
- Do not implement variable/adaptive friction until baseline evidence and lived interpretation support a specific hypothesis.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS2.TS1 | Define privacy-preserving event model and retention | Technical Story | The prototype has an explicit local schema, retention boundary, and reset path without sensitive WhatsApp content or identities. | Candidate |
| DS2.US1 | Record normal-mode opening choreography | User Story | The extension locally records timing, intervals, countdown versus immediate opening, cancellation, and return-to-focus events. | Candidate |
| DS2.US2 | Show a concise baseline summary | User Story | After enough observation, the user can see counts, short re-opening intervals, and fast repeated sequences without being interrupted on every attempt. | Candidate |
| DS2.US3 | Invite interpretation after the impulse | User Story | The user can recognize whether observed episodes reflected specific intent, waiting for a reply, anguish/boredom, or automatism. | Candidate |
| DS2.TS2 | Add observability safeguards and data controls | Technical Story | Instrumentation can be inspected, cleared, disabled, and verified not to capture conversation-level data. | Candidate |

## Candidate event signals

- timestamp of a normal-mode opening attempt;
- time since previous normal-mode opening;
- elapsed time from opening the mindful pause to the final action;
- automatic countdown completion versus **Abrir agora** / **Abrir mesmo assim**;
- cancellation or continuation in the focused conversation;
- early return to focus versus automatic 5-minute expiry.

These signals describe interaction with the extension. They do not establish motivation by themselves.

## Done Condition

DS2 is done when the extension can run a local 7-day observation experiment, present a concise and non-moralizing summary outside the immediate impulse, let the user interpret the pattern, and prove that no message/contact/conversation data is collected. The Delivery Story does not need to implement adaptive friction; it must produce enough evidence to decide whether and how a later intervention should vary.

## Validation questions

- Do the measurements reveal a recognizable choreography rather than merely produce more numbers?
- Does delayed reflection create more awareness than an in-the-moment prompt?
- Does the summary feel like a mirror, or like surveillance and judgment?
- Which signal, if any, is strong enough to justify a later adaptive intervention?
- Does instrumentation itself alter behavior enough to invalidate the baseline?
