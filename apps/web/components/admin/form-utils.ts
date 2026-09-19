import type { RegisterOptions } from "react-hook-form";

/**
 * Register options for optional numeric inputs. `valueAsNumber` turns an
 * empty input into NaN, which fails optional Zod number fields and blocks
 * submission — this maps blank/invalid input to `undefined` instead, so
 * schema defaults (and true optionality) apply.
 */
export const optionalNumberInput = {
  setValueAs: (value: unknown) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
  },
} satisfies Pick<RegisterOptions, "setValueAs">;
