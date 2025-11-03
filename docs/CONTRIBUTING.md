# Contributing Guidelines

## Test-Driven Development Policy

**Tests are the source of truth.** Do not edit existing tests—fix implementation instead.

### Rules

1. **Never modify existing test files** once they are committed to Git
2. **New tests can be added** freely to expand coverage
3. **If tests fail**, the implementation must be fixed to satisfy the tests
4. **Pre-commit hook** blocks staged changes to `*.test.ts` and `*.test.tsx` files

### Rationale

Tests define the contract and expected behavior. Modifying tests to make failing code pass defeats the purpose of test-driven development and can hide bugs.

### Workflow

1. Write comprehensive tests first
2. Commit tests (they become protected)
3. Implement features to pass tests
4. If tests fail, debug and fix the implementation
5. Only add new tests for new features or edge cases

### Bypassing the Hook

If you absolutely must modify a test (e.g., fixing a test bug or updating requirements):

1. Discuss with the team first
2. Temporarily disable the hook: `git commit --no-verify`
3. Document why the test needed to change in the commit message
