import type { BackofficeResource } from "./backoffice-resources.js";
import {
  BackofficeFault,
  type BackofficeValues,
} from "../persistence/backoffice-management-repository.js";
/** Internal writers must enforce the same descriptor rules as HTTP schemas. */
export function validateBackofficeValues(
  resource: BackofficeResource,
  values: BackofficeValues,
) {
  if (
    Object.keys(values).some(
      (key) => !resource.fields.some((field) => field.key === key),
    )
  )
    throw new BackofficeFault(400, "unknown_field");
  for (const field of resource.fields) {
    const value = values[field.key];
    if (value === null || value === undefined) {
      if (field.required)
        throw new BackofficeFault(400, "required_field_missing");
      continue;
    }
    const invalid = () => {
      throw new BackofficeFault(400, "invalid_field_value");
    };
    if (field.multiple || field.kind === "tags") {
      if (
        !Array.isArray(value) ||
        value.length > 100 ||
        new Set(value).size !== value.length ||
        value.some(
          (v) =>
            typeof v !== "string" ||
            !v.length ||
            v.length > 128 ||
            (field.options &&
              !field.options.some((option) => option.value === v)),
        )
      )
        invalid();
      continue;
    }
    if (field.kind === "boolean") {
      if (typeof value !== "boolean") invalid();
      continue;
    }
    if (field.kind === "number") {
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        (field.minimum !== undefined && Number(value) < field.minimum) ||
        (field.maximum !== undefined && Number(value) > field.maximum)
      )
        invalid();
      continue;
    }
    if (
      typeof value !== "string" ||
      value.length > (field.kind === "textarea" ? 5000 : 500) ||
      (field.required && !value.trim()) ||
      (field.options && !field.options.some((option) => option.value === value))
    )
      invalid();
    if (
      field.kind === "date" &&
      (typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value)
    )
      invalid();
    if (
      field.kind === "datetime" &&
      (typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T/.test(value) ||
        !Number.isFinite(Date.parse(value)))
    )
      invalid();
  }
}
