import { z } from "zod";
import { MAX_ADVANCE_DAYS, MAX_STAY_NIGHTS, addDays, nightsBetween, parseDateOnly, todayUtc } from "./dates";

export const dateOnly = z
  .string()
  .refine((v) => parseDateOnly(v) !== null, "Use a valid date (YYYY-MM-DD)");

export const stayInput = z
  .object({
    checkIn: dateOnly,
    checkOut: dateOnly,
    guests: z.coerce.number().int().min(1, "At least 1 guest").max(8, "At most 8 guests"),
  })
  .superRefine((v, ctx) => {
    const ci = parseDateOnly(v.checkIn);
    const co = parseDateOnly(v.checkOut);
    if (!ci || !co) return;
    if (ci < todayUtc()) ctx.addIssue({ code: "custom", path: ["checkIn"], message: "Check-in cannot be in the past" });
    if (ci > addDays(todayUtc(), MAX_ADVANCE_DAYS))
      ctx.addIssue({ code: "custom", path: ["checkIn"], message: "Bookings open up to one year ahead" });
    const n = nightsBetween(ci, co);
    if (n < 1) ctx.addIssue({ code: "custom", path: ["checkOut"], message: "Check-out must be after check-in" });
    if (n > MAX_STAY_NIGHTS)
      ctx.addIssue({ code: "custom", path: ["checkOut"], message: `Maximum stay is ${MAX_STAY_NIGHTS} nights` });
  });
export type StayInput = z.infer<typeof stayInput>;

export const registerInput = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Use at least 8 characters").max(100),
  accountType: z.enum(["CUSTOMER", "PARTNER"]).default("CUSTOMER"),
});
export type RegisterInput = z.infer<typeof registerInput>;

export const loginInput = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginInput>;

export const holdInput = z.object({ roomIds: z.array(z.string().min(1).max(64)).min(1).max(4) }).and(stayInput);
export type HoldInput = z.infer<typeof holdInput>;

export const guestDetails = z.object({
  guestName: z.string().trim().min(2, "Enter the lead guest's full name").max(80),
  guestEmail: z.string().trim().email("Enter a valid email"),
  guestPhone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
  specialRequest: z.string().trim().max(500).optional().or(z.literal("")),
});

export const cardDetails = z.object({
  cardName: z.string().trim().min(2, "Enter the name on card"),
  cardNumber: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => /^\d{13,19}$/.test(v), "Enter a valid card number"),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Use MM/YY"),
  cvc: z.string().regex(/^\d{3,4}$/, "3 or 4 digits"),
});

export const checkoutInput = z.object({
  holdGroupId: z.string().uuid(),
  ratePlan: z.enum(["FLEXIBLE", "NON_REFUNDABLE"]).default("FLEXIBLE"),
  /** Total the customer saw; if the server's price differs the request is rejected with PRICE_CHANGED. */
  expectedTotal: z.number().int().nonnegative(),
  guest: guestDetails,
  card: cardDetails,
});
export type CheckoutInput = z.infer<typeof checkoutInput>;

export const reviewInput = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(10, "Tell us a little more (10+ characters)").max(1000),
});

export const VIEW_TYPES = ["SEA", "LAKE", "RIVER", "MOUNTAIN", "VALLEY", "GARDEN", "CITY", "COURTYARD", "POOL", "NONE"] as const;
export const SIDE_VALUES = ["TOP", "RIGHT", "BOTTOM", "LEFT"] as const;

export const roomUpdateInput = z.object({
  status: z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE"]).optional(),
  priceAdjustment: z.coerce.number().int().min(-10_000_00).max(100_000_00).optional(),
  viewType: z.enum(VIEW_TYPES).optional(),
  viewScore: z.coerce.number().int().min(0).max(100).optional(),
  viewVerified: z.boolean().optional(),
  hasBalcony: z.boolean().optional(),
  isCorner: z.boolean().optional(),
  accessible: z.boolean().optional(),
  windowCount: z.coerce.number().int().min(0).max(10).optional(),
  windowSide: z.enum(SIDE_VALUES).optional(),
  secondaryWindowSide: z.enum(SIDE_VALUES).nullable().optional(),
  balconySide: z.enum(SIDE_VALUES).nullable().optional(),
  bedType: z.enum(["Queen", "Twin", "King", "King + Sofa bed"]).optional(),
  nearElevator: z.boolean().optional(),
  notes: z.string().trim().max(300).optional().nullable(),
});

/** Floor-plan editor payload: the full room layout of one floor. */
export const floorLayoutInput = z.object({
  rooms: z
    .array(
      z.object({
        id: z.string().min(1).max(64).optional(),
        number: z.string().trim().regex(/^[0-9A-Z-]{1,8}$/, "Room numbers use digits, capitals or dashes"),
        roomTypeId: z.string().min(1),
        x: z.number().int().min(0).max(60),
        y: z.number().int().min(0).max(60),
        w: z.number().int().min(2).max(12),
        h: z.number().int().min(2).max(12),
        windowSide: z.enum(SIDE_VALUES),
        secondaryWindowSide: z.enum(SIDE_VALUES).nullable(),
        balconySide: z.enum(SIDE_VALUES).nullable(),
        viewType: z.enum(VIEW_TYPES),
      }),
    )
    .max(80),
});
export type FloorLayoutInput = z.infer<typeof floorLayoutInput>;

export const profileInput = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number").optional().or(z.literal("")),
});

export const changePasswordInput = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "Use at least 8 characters").max(100),
});

export const forgotPasswordInput = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email") });
export const resetPasswordInput = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8, "Use at least 8 characters").max(100),
});

export const hotelProfileInput = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().min(20).max(2000),
  address: z.string().trim().min(5).max(200),
  neighborhood: z.string().trim().max(120),
  amenities: z.array(z.string().trim().min(1).max(40)).max(20),
  highlights: z.array(z.string().trim().min(1).max(120)).max(8),
  houseRules: z.array(z.string().trim().min(1).max(160)).max(12),
  checkInTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM"),
  checkOutTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM"),
  cancellationPolicy: z.enum(["FLEXIBLE", "MODERATE", "STRICT"]),
});

export const roomTypePriceInput = z.object({ basePrice: z.coerce.number().int().min(500_00).max(1_000_000_00) });

export const blockInput = z
  .object({
    startDate: dateOnly,
    endDate: dateOnly,
    reason: z.string().trim().min(2, "Give a reason").max(120),
  })
  .refine((v) => parseDateOnly(v.endDate)! > parseDateOnly(v.startDate)!, {
    path: ["endDate"],
    message: "End date must be after start date",
  });

export const hotelCreateInput = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().min(20, "Describe the property (20+ characters)").max(2000),
  destinationId: z.string().min(1, "Choose a destination"),
  address: z.string().trim().min(5).max(200),
  starRating: z.coerce.number().int().min(1).max(5),
  amenities: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  template: z.enum(["MOUNTAIN_LODGE", "HERITAGE_BOUTIQUE", "CITY_MODERN", "COASTAL_RESORT", "GARDEN_RETREAT"]),
  palette: z.coerce.number().int().min(0).max(2).default(0),
  basePrice: z.coerce.number().int().min(500_00).max(1_000_000_00),
  frontView: z.enum(VIEW_TYPES),
  backView: z.enum(VIEW_TYPES),
});
export type HotelCreateInput = z.infer<typeof hotelCreateInput>;
