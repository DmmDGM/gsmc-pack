// Defines dependencies
export interface Dependencies {
    required: Record<string, boolean>;
    conflict: Record<string, boolean>;
    optional: Record<string, boolean>;
}

// Exports
export default Dependencies;
