"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPaise = toPaise;
/** Type-safe helper — use sparingly; prefer receiving paise from API directly */
function toPaise(rupees) {
    return Math.round(rupees * 100);
}
//# sourceMappingURL=index.js.map