import { z } from "zod";
import { FlowInputVariable } from "./models";

export function createDynamicZodSchemaForInputs({
  availableInputs,
}: {
  availableInputs: FlowInputVariable[];
}) {
  // jeśli brak definicji inputów – przyjmuj dowolną wartość
  if (!availableInputs || availableInputs.length === 0) {
    return z.any();
  }

  const shape = availableInputs.reduce<z.ZodRawShape>((acc, input) => {
    let zodType: z.ZodTypeAny;

    switch (input.type) {
      case "shortText":
      case "longText":
        zodType = z.string();
        break;
      case "url":
        zodType = z.string().url();
        break;
      case "number":
        zodType = z.number();
        break;
      case "json":
        zodType = z.any();
        break;
      case "fileBase64":
        zodType = z.string().regex(
          /^[A-Za-z0-9+/]+={0,2}$/,
          "Niepoprawny format Base64"
        );
        break;
      default:
        zodType = z.any();
        break;
    }

    // jeżeli nie jest wymagane – dopuszczamy brak wartości
    if (!input.required) {
      zodType = zodType.optional();
    }

    // jeżeli jest description, uzupełniamy nim definicję
    if (input.description) {
      zodType = zodType.describe(input.description);
    }

    acc[input.name] = zodType;
    return acc;
  }, {});

  return z.object(shape);
}
