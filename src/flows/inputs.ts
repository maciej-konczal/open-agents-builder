import { z } from "zod";
import { FlowInputVariable } from "./models";

/**
 * Helper function to extract variable names in the format @variable
 * Returns an array of names (without '@').
 */
export function extractVariableNames(str: string): string[] {
  const regex = /@([a-zA-Z0-9_]+)/g;
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
 * Recursively processes FlowDefinition, calling the transformInputFn function on each node,
 * which returns a new value for `flowDef.input`.
 *
 * @param flowDef - object returned by convertToFlowDefinition
 * @param transformInputFn - function transforming the `input` field in each node.
 *    Receives the current node (flowDef) as a parameter; should return a new value for flowDef.input.
 */
export async function applyInputTransformation(
  flowDef: any,
  transformInputFn: (currentNode: any) => any
): Promise<void> {
  // 1) First, update "input" based on the external function
  flowDef.input = await transformInputFn(flowDef);
  if(!flowDef.name) flowDef.name = flowDef.agent;

  // 2) Recursion depending on the type of agent
  switch (flowDef.agent) {
    case 'sequenceAgent':
    case 'parallelAgent':
    case 'bestOfAllAgent': {
      // In these agents, the "input" field is an array of FlowDefinition
      if (Array.isArray(flowDef.input)) {
        await Promise.all(flowDef.input.map((child: any) => applyInputTransformation(child, transformInputFn)));
      }
      break;
    }

    case 'oneOfAgent': {
      // In "oneOfAgent", "input" is also an array of FlowDefinition
      if (Array.isArray(flowDef.input)) {
        await Promise.all(flowDef.input.map((child: any) => applyInputTransformation(child, transformInputFn)));
      }
      // NOTE: if you also want to transform `flowDef.conditions`,
      //       additional operations can be done here (if needed).
      break;
    }

    case 'forEachAgent':
    case 'optimizeAgent': {
      // "input" is a single FlowDefinition
      if (flowDef.input && typeof flowDef.input === 'object') {
        await applyInputTransformation(flowDef.input, transformInputFn);
      }
      break;
    }

    default: {
      // "step" (agent is e.g., 'translationAgent') or other custom,
      // does not contain nested structures, so no recursion.
      break;
    }
  }
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
  console.log(availableInputs);
  // if there are no input definitions – accept any value
  if (!availableInputs || availableInputs.length === 0) {
    return z.any().nullable().or(z.string());
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



// A helper to guess MIME type based on file extension if the browser doesn’t supply one.
export function guessType(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "html":
      return "text/html";
    case "csv":
      return "text/csv";
    case "json":
      return "application/json";
    case "zip":
      return "application/zip";
    case "md":
      return "text/markdown";
    case "txt":
      return "text/plain";
    default:
      // Fallback if we don't recognize the extension.
      // Adjust to your preference, e.g. "application/octet-stream"
      return "application/octet-stream";
  }
}
