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
    // match[1] is the text after @, e.g., 'variableName' from '@variableName'
    result.push(match[1]);
  }
  return result;
}

/**
 * Replaces all occurrences of @name in the given string
 * using the values from variables[name].
 */
export function replaceVariablesInString(str: string, variables: Record<string, string>): string {
  let newStr = str;
  for (const [varName, value] of Object.entries(variables)) {
    // Create a RegExp to find all occurrences of @varName (globally 'g').
    const pattern = new RegExp(`@${varName}`, 'g');
    newStr = newStr.replace(pattern, value);
  }
  return newStr;
}

/**
 * Recursively injects variable values into all text fields (input, conditions, criteria, etc.)
 * within the given flowDef structure.
 *
 * @param flowDef    The flow definition object (from convertToFlowDefinition or similar)
 * @param variables  A record of variableName->replacementValue
 * @returns          The same flowDef, with replaced string values
 */
export function injectVariables(flowDef: any, variables: Record<string, string>): any {
  // 1) If the current node has a string input, replace the variables
  if (typeof flowDef.input === 'string') {
    flowDef.input = replaceVariablesInString(flowDef.input, variables);
  }

  // 2) If there's a conditions array (e.g. oneOfAgent), replace variables in each condition (if string)
  if (Array.isArray(flowDef.conditions)) {
    flowDef.conditions = flowDef.conditions.map((condition: any) => {
      return typeof condition === 'string'
        ? replaceVariablesInString(condition, variables)
        : condition;
    });
  }

  // 3) If there's a criteria field (e.g. bestOfAllAgent, optimizeAgent) and it's a string, replace vars
  if (typeof flowDef.criteria === 'string') {
    flowDef.criteria = replaceVariablesInString(flowDef.criteria, variables);
  }

  // 4) Recurse into child flows depending on the agent type
  switch (flowDef.agent) {
    case 'sequenceAgent':
    case 'parallelAgent':
    case 'bestOfAllAgent': {
      // input is an array of subflow definitions
      if (Array.isArray(flowDef.input)) {
        flowDef.input.forEach((child: any) => injectVariables(child, variables));
      }
      break;
    }

    case 'oneOfAgent': {
      // input is an array of subflow definitions
      if (Array.isArray(flowDef.input)) {
        flowDef.input.forEach((child: any) => injectVariables(child, variables));
      }
      break;
    }

    case 'forEachAgent':
    case 'optimizeAgent': {
      // input is a single subflow
      if (flowDef.input && typeof flowDef.input === 'object') {
        injectVariables(flowDef.input, variables);
      }
      break;
    }

    default: {
      // e.g. "step" or other agent with no nested flows
      break;
    }
  }

  // Return the updated flowDef (mutated in place)
  return flowDef;
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
          /^data:[a-zA-Z0-9]+\/[a-zA-Z0-9.-]+;base64,[A-Za-z0-9+/]+={0,2}$/,
          "Wrong base64 format"
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
