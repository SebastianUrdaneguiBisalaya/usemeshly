import { z } from "zod";

// Schemas are lenient on purpose: Google adds fields and omits many (a cancelled event in a sync is little more than
// an id). Unknown fields are stripped, so the types only promise what was checked.

export const calendarListEntrySchema = z.object({
  accessRole: z.string(),
  backgroundColor: z.string().optional(),
  colorId: z.string().optional(),
  deleted: z.boolean().optional(),
  description: z.string().optional(),
  etag: z.string().optional(),
  foregroundColor: z.string().optional(),
  hidden: z.boolean().optional(),
  id: z.string().min(1),
  primary: z.boolean().optional(),
  selected: z.boolean().optional(),
  summary: z.string().optional(),
  summaryOverride: z.string().optional(),
  timeZone: z.string().optional(),
});

export const eventTimeSchema = z.object({
  date: z.string().optional(),
  dateTime: z.string().optional(),
  timeZone: z.string().optional(),
});

const personSchema = z.object({
  displayName: z.string().optional(),
  email: z.string().optional(),
  self: z.boolean().optional(),
});

/** An event's conference: a Google Meet or an add-on conference. */
export const conferenceDataSchema = z.object({
  conferenceId: z.string().optional(),
  conferenceSolution: z
    .object({
      iconUri: z.string().optional(),
      key: z.object({
        type: z.string(),
      }),
      name: z.string().optional(),
    })
    .optional(),
  createRequest: z
    .object({
      conferenceSolutionKey: z
        .object({
          type: z.string(),
        })
        .optional(),
      requestId: z.string(),
      status: z
        .object({
          statusCode: z.enum([
            "pending",
            "success",
            "failure",
          ]),
        })
        .optional(),
    })
    .optional(),
  entryPoints: z
    .array(
      z.object({
        /** `video`, `phone`, `sip` or `more`. */
        entryPointType: z.string(),
        label: z.string().optional(),
        meetingCode: z.string().optional(),
        passcode: z.string().optional(),
        pin: z.string().optional(),
        regionCode: z.string().optional(),
        uri: z.string(),
      }),
    )
    .optional(),
  notes: z.string().optional(),
});

export const eventSchema = z.object({
  attendees: z
    .array(
      personSchema.extend({
        optional: z.boolean().optional(),
        organizer: z.boolean().optional(),
        /** True when the attendee is a room or another resource, not a person. */
        resource: z.boolean().optional(),
        responseStatus: z.string().optional(),
      }),
    )
    .optional(),
  colorId: z.string().optional(),
  conferenceData: conferenceDataSchema.optional(),
  created: z.string().optional(),
  creator: personSchema.optional(),
  description: z.string().nullish(),
  end: eventTimeSchema.optional(),
  etag: z.string().optional(),
  eventType: z.string().optional(),
  extendedProperties: z
    .object({
      private: z.record(z.string(), z.string()).optional(),
      shared: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  /** Guests can invite others. Absent means `true` at Google. */
  guestsCanInviteOthers: z.boolean().optional(),
  /** Guests can modify the event. Absent means `false` at Google. */
  guestsCanModify: z.boolean().optional(),
  /** Guests can see the guest list. Absent means `true` at Google. */
  guestsCanSeeOtherGuests: z.boolean().optional(),
  hangoutLink: z.string().optional(),
  htmlLink: z.string().optional(),
  iCalUID: z.string().optional(),
  id: z.string().min(1),
  location: z.string().nullish(),
  organizer: personSchema.optional(),
  originalStartTime: eventTimeSchema.optional(),
  recurrence: z.array(z.string()).optional(),
  recurringEventId: z.string().optional(),
  reminders: z
    .object({
      overrides: z
        .array(
          z.object({
            method: z.string(),
            minutes: z.number(),
          }),
        )
        .optional(),
      useDefault: z.boolean().optional(),
    })
    .optional(),
  sequence: z.number().optional(),
  start: eventTimeSchema.optional(),
  status: z.string().optional(),
  summary: z.string().nullish(),
  transparency: z.string().optional(),
  updated: z.string().optional(),
  visibility: z.string().optional(),
});

/** One page of a list; items that fail `item` are dropped one by one instead of failing the whole page. */
export const pageSchema = <Item extends z.ZodType>(item: Item) =>
  z
    .object({
      items: z.array(z.unknown()).optional(),
      nextPageToken: z.string().min(1).optional(),
      nextSyncToken: z.string().min(1).optional(),
    })
    .transform((page) => ({
      items: (page.items ?? []).flatMap((value) => {
        const parsed = item.safeParse(value);
        return parsed.success
          ? [
              parsed.data as z.output<Item>,
            ]
          : [];
      }),
      nextPageToken: page.nextPageToken,
      nextSyncToken: page.nextSyncToken,
    }));

/** Google's JSON error body. */
export const errorBodySchema = z.object({
  error: z.object({
    errors: z
      .array(
        z.object({
          reason: z.string().optional(),
        }),
      )
      .optional(),
    message: z.string().optional(),
    status: z.string().optional(),
  }),
});
