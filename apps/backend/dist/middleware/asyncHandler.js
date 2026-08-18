/** Wrap an async handler so thrown errors flow to the express error handler. */
export const asyncHandler = (fn) => (req, res, next) => { fn(req, res, next).catch(next); };
//# sourceMappingURL=asyncHandler.js.map