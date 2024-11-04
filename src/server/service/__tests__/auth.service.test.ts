import { expect, test, describe } from "vitest";
import { generateSalt, hashPassword, verifyPassword } from "../auth.service";

describe("password hashing", () => {
  test("should hash a password", async () => {
    const password = "password";

    const salt = generateSalt();

    const hashedPassword = await hashPassword(password, salt);

    expect(hashedPassword).toHaveLength(96);

    const isValid = await verifyPassword(password, hashedPassword);

    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword(`${password}1`, hashedPassword);

    expect(isInvalid).toBe(false);
  });
});
