export function setStackTraceJsonPaths(obj: any, path: string = '$'): any {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        return obj; // Skip non-object values
    }

    // Set the "name" property with the current path
    if (!obj['_name']) obj['_name'] = path;
    obj['name'] = (obj['_name'] ?? '') + path;

    // Recursively process child objects
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];

            if (typeof value === 'object' && value !== null) {
                if (Array.isArray(value)) {
                    // Handle arrays separately by iterating over elements
                    value.forEach((item, index) => {
                        if (typeof item === 'object' && item !== null) {
                            setStackTraceJsonPaths(item, `${path}[${index}]`); // Use bracket notation for arrays
                        }
                    });
                } else {
                    setStackTraceJsonPaths(value, `${path}.${key}`); // Use dot notation for objects
                }
            }
        }
    }

    return obj;
}


export function getObjectByPath(obj: any, path: string): any {
    if (!path.startsWith('$')) {
        throw new Error("Invalid path: Path should start with '$'");
    }

    // Regex to split path correctly while keeping array indices
    const keys = path
        .replace(/\[(\d+)\]/g, '.$1') // Convert array indices to dot notation (e.g., "f[2]" → "f.2")
        .slice(2) // Remove the "$."
        .split('.');

    let current = obj;
    for (const key of keys) {
        if (typeof current !== 'object' || current === null || !current.hasOwnProperty(key)) {
            return undefined; // Return undefined if path is invalid
        }
        current = current[key];
    }

    return current;
}