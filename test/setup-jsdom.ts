import "@testing-library/jest-dom";

// jsdom doesn't implement URL.createObjectURL — provide a stub for component tests
if (typeof URL.createObjectURL === "undefined") {
  URL.createObjectURL = () => "blob:mock-url";
}
if (typeof URL.revokeObjectURL === "undefined") {
  URL.revokeObjectURL = () => {};
}
