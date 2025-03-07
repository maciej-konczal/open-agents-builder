import { z } from "zod";
import { FlowInputVariable } from "./models";


/**
 * Helper function to extract variable names in the format @variable
 * Returns an array of names (without '@').
 */
export function extractVariableNames(str: string): string[] {
  const regex = /@(\w+)/g;
  const result: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(str)) !== null) {
    // match[1] is the text after @, e.g., 'variableName' when matching '@variableName'
    result.push(match[1]);
  }
  return result;
}

/**
 * Replaces all occurrences of @name in the given string
 * with the values from the replacements[name] object.
 */
export function replaceVariablesInString(str: string, replacements: Record<string, string>): string {
  let newStr = str;
  for (const [varName, value] of Object.entries(replacements)) {
    // Create a regular expression to find all occurrences of @varName (globally 'g').
    const pattern = new RegExp(`@${varName}`, 'g');
    newStr = newStr.replace(pattern, value);
  }
  return newStr;
}


/**
 * Recursively processes FlowDefinition, calling the transformInputFn function on each node,
 * which returns a new value for `flowDef.input`.
 *
 * @param flowDef - object returned by convertToFlowDefinition
 * @param transformInputFn - function transforming the `input` field in each node.
 *    It receives the current node (flowDef) as a parameter; it should return a new value for flowDef.input.
 */
export function applyInputTransformation(
  flowDef: any,
  transformInputFn: (currentNode: any) => any
): void {
  // 1) First, update the "input" based on the external function
  flowDef.input = transformInputFn(flowDef);

  // 2) Recursion depending on the type of agent
  switch (flowDef.agent) {
    case 'sequenceAgent':
    case 'parallelAgent':
    case 'bestOfAllAgent': {
      // In these agents, the "input" field is an array of FlowDefinition
      if (Array.isArray(flowDef.input)) {
        flowDef.input.forEach((child: any) => applyInputTransformation(child, transformInputFn));
      }
      break;
    }

    case 'oneOfAgent': {
      // In "oneOfAgent" the "input" is also an array of FlowDefinition
      if (Array.isArray(flowDef.input)) {
        flowDef.input.forEach((child: any) => applyInputTransformation(child, transformInputFn));
      }
      break;
    }

    case 'forEachAgent':
    case 'optimizeAgent': {
      // "input" is a single FlowDefinition
      if (flowDef.input && typeof flowDef.input === 'object') {
        applyInputTransformation(flowDef.input, transformInputFn);
      }
      break;
    }

    default: {
      // "step" (e.g., agent is 'translationAgent') or other custom agents,
      // does not contain nested structures, so no recursion is needed.
      break;
    }
  }
}

export function createDynamicZodSchemaForInputs({
  availableInputs,
}: {
  availableInputs: FlowInputVariable[];
}) {
  // if there are no input definitions – accept any value
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
