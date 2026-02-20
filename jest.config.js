import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/", "<rootDir>/e2e/"],
  collectCoverageFrom: [
    "lib/**/*.{js,ts}",
    "components/**/*.{js,ts,tsx}",
    "app/**/*.{js,ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/coverage/**",
    "!**/playwright-report/**",
  ],
  coverageDirectory: "coverage/jest",
  coverageReporters: [
    "text",
    "text-summary",
    "html",
    "lcov",
    "json-summary",
    "cobertura",
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
    "/e2e/",
    "/coverage/",
    "/playwright-report/",
    "\\.d\\.ts$",
    "\\.config\\.(js|ts)$",
    "/migrations/",
  ],
};

export default createJestConfig(config);
