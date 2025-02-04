import * as builtInMatchers from "./matchers.ts";
import {Matcher, Matchers} from './matchers.ts';

import { AssertionError } from "https://deno.land/std/testing/asserts.ts";

interface Expected {
  toBe(candidate: any): void;
  toEqual(candidate: any): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeDefined(): void;
  toBeInstanceOf(clazz: any): void;
  toBeUndefined(): void;
  toBeNull(): void;
  toBeNaN(): void;
  toMatch(pattern: RegExp | string): void;
  toHaveProperty(propName: string): void;
  toHaveLength(length: number): void;
  toContain(item: any): void;
  toThrow(error?: RegExp | string): void;
  toBeGreaterThan(number: number): void;
  toBeGreaterThanOrEqual(number: number): void;
  toBeLessThan(number: number): void;
  toBeLessThanOrEqual(number: number): void;
  toHaveBeenCalled(): void;
  toHaveBeenCalledTimes(number: number): void;
  toHaveBeenCalledWith(...args: any[]): void;
  toHaveBeenLastCalledWith(...args: any[]): void;
  toHaveBeenNthCalledWith(nthCall: number, ...args: any[]): void;
  toHaveReturned(): void;
  toHaveReturnedTimes(number: number): void;
  toHaveReturnedWith(value: any): void;
  toHaveLastReturnedWith(value: any): void;
  toHaveNthReturnedWith(nthCall: number, value: any): void;

  not: Expected;
  resolves: Expected;
  rejects: Expected;
}

const matchers = {...builtInMatchers}

export function expect(value: any): Expected {
  let isNot = false;
  let isPromised = false;
  const self = new Proxy(
    {},
    {
      get(_, name) {
        if (name === "not") {
          isNot = !isNot;
          return self;
        }

        if (name === "resolves") {
          if (!(value instanceof Promise))
            throw new AssertionError("expected value must be a Promise");

          isPromised = true;
          return self;
        }

        if (name === "rejects") {
          if (!(value instanceof Promise))
            throw new AssertionError("expected value must be a Promise");

          value = value.then(
            value => {
              throw new AssertionError(
                `Promise did not reject. resolved to ${value}`
              );
            },
            err => err
          );
          isPromised = true;
          return self;
        }

        const matcher:Matcher = matchers[name];
        if (!matcher)
          throw new TypeError(
            typeof name === "string"
              ? `matcher not found: ${name}`
              : "matcher not found"
          );

        return (...args) => {
          function applyMatcher(value, args) {
            if (isNot) {
              let result = matcher(value, ...args);
              if (result.pass) {
                throw new AssertionError('should not ' + result.message)
              }
            } else {
              let result = matcher(value, ...args);
              if (!result.pass) {
                throw new AssertionError(result.message)
              }
            }
          }

          return isPromised
            ? value.then(value => applyMatcher(value, args))
            : applyMatcher(value, args);
        };
      }
    } 
  );

  return self;
}

export function addMatchers(newMatchers:Matchers) : void {
  for(let [key, matcher] of Object.entries(newMatchers)) {
    matchers[key] = matcher
  }
}
