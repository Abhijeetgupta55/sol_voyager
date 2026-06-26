const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: ["src/lib/**/*.js"],
};

module.exports = createJestConfig(config);
