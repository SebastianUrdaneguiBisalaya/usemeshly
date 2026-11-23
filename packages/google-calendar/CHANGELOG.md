# @usemeshly/google-calendar

## 0.3.0

### Minor Changes

- Read the remaining guest fields. Attendees now include `resource` (true for rooms and other resources), and `GoogleEvent` includes `guestsCanModify`, `guestsCanInviteOthers` and `guestsCanSeeOtherGuests`, left `undefined` when Google omits them (Google then assumes `false`, `true` and `true`). `GoogleEventInput` accepts the three `guestsCan*` flags on `insert` and `patch`.

## 0.2.0

### Minor Changes

- Support Google Meet conferences on events. `GoogleEvent` now includes `conferenceData` (conference id, solution, entry points, create request status and notes). `GoogleEventInput.conferenceData` takes `{ createRequest }` to create a Meet on `insert` or `patch`, or `null` to remove the conference on `patch`. `insert` and `patch` send `conferenceDataVersion=1` whenever the input has `conferenceData`, and accept an explicit `conferenceDataVersion` in the new `EventWriteOptions`. New exported types: `EventWriteOptions` and `GoogleConferenceData`.
