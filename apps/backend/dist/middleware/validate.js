export const validateBody = (schema) => (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        next(parsed.error);
        return;
    }
    req.body = parsed.data;
    next();
};
export const validateQuery = (schema) => (req, _res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
        next(parsed.error);
        return;
    }
    // Express 4 typings: req.query is read/write — assign back.
    req.query = parsed.data;
    next();
};
//# sourceMappingURL=validate.js.map