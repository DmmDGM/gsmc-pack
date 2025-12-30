// Imports
import type Code from "./code";

// Defines success result
export interface ResultSuccess<Data> {
    code: Code;
    okay: true;
    value: Data;
}

// Defines failure result
export interface ResultFailure {
    cause: string;
    code: Code;
    okay: false;
}

// Defines generic result
export type Result<Data> = ResultSuccess<Data> | ResultFailure;

// Exports
export default Result;
