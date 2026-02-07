# Best practices for project

- Package management should use `pnpm`
- All code should be written in TypeScript
- Code exection should be supported by the `tsx` package
- Work is not done until all tests pass

## Documentation

- All exported code should be documented with jsdoc-style comments.
- Public and protected methods should be document with jsdoc-style comments.

## Running the code

- Use `pnpm start` in order to start the application

## Testing

- Use `pnpm test` in order to run tests
- Use `vitest` as the test runner and testing API
- Place tests in the same  as the code they are testing
- Tests should be identified by having `.test.` in their name
