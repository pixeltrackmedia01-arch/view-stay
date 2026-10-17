import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { LoginInput, RegisterInput } from "@/lib/validation";

const SAFE = { id: true, email: true, name: true, phone: true, role: true } as const;

export async function registerUser(input: RegisterInput) {
  const exists = await db.user.findUnique({ where: { email: input.email } });
  if (exists) throw new AppError("CONFLICT", "An account with this email already exists");
  const passwordHash = await bcrypt.hash(input.password, 10);
  return db.user.create({
    data: {
      email: input.email,
      name: input.name,
      phone: input.phone || null,
      passwordHash,
      role: input.accountType === "PARTNER" ? "PARTNER" : "CUSTOMER",
    },
    select: SAFE,
  });
}

export async function authenticate(input: LoginInput) {
  const user = await db.user.findUnique({ where: { email: input.email } });
  // Compare against a dummy hash when the user is missing to keep timing uniform
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? "$2a$10$CwTycUXWue0Thq9StjUM0uJ8DPLKXt1FYlwYpQW4mKMZ1fQ8lH0yC");
  if (!user || !ok) throw new AppError("UNAUTHORIZED", "Incorrect email or password");
  if (!user.isActive) throw new AppError("FORBIDDEN", "This account has been deactivated");
  return { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role };
}
