// =====================================================================
// asyncHandler — wrapper pentru funcții async în Express
// Prinde orice throw / reject și îl trimite către errorHandler global
// =====================================================================

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};