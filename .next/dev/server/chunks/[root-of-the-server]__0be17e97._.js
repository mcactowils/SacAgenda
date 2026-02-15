module.exports = [
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/Projects/SacAgenda/lib/db.js [api] (ecmascript)", ((__turbopack_context__, module, exports) => {

const { Pool } = __turbopack_context__.r("[externals]/pg [external] (pg, cjs, [project]/Projects/SacAgenda/node_modules/pg)");
let pool;
function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : false
        });
    }
    return pool;
}
async function query(text, params) {
    const pool = getPool();
    const result = await pool.query(text, params);
    return result;
}
module.exports = {
    getPool,
    query
};
}),
"[project]/Projects/SacAgenda/lib/auth.js [api] (ecmascript)", ((__turbopack_context__, module, exports) => {

const jwt = __turbopack_context__.r("[externals]/jsonwebtoken [external] (jsonwebtoken, cjs, [project]/Projects/SacAgenda/node_modules/jsonwebtoken)");
const bcrypt = __turbopack_context__.r("[externals]/bcrypt [external] (bcrypt, cjs, [project]/Projects/SacAgenda/node_modules/bcrypt)");
const { query } = __turbopack_context__.r("[project]/Projects/SacAgenda/lib/db.js [api] (ecmascript)");
async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}
async function verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}
function generateToken(userId) {
    return jwt.sign({
        userId
    }, process.env.JWT_SECRET, {
        expiresIn: '24h'
    });
}
function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
}
async function authenticateRequest(req) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return {
            error: 'Access token required',
            status: 401
        };
    }
    const decoded = verifyToken(token);
    if (!decoded) {
        return {
            error: 'Invalid token',
            status: 403
        };
    }
    // Verify user still exists and is approved
    const userResult = await query('SELECT id, username, email, full_name, role, approved FROM users WHERE id = $1 AND approved = true', [
        decoded.userId
    ]);
    if (userResult.rows.length === 0) {
        return {
            error: 'User not found or not approved',
            status: 403
        };
    }
    return {
        user: userResult.rows[0]
    };
}
function requireRole(roles) {
    return (user)=>{
        if (!roles.includes(user.role)) {
            return {
                error: 'Insufficient permissions',
                status: 403
            };
        }
        return null;
    };
}
module.exports = {
    hashPassword,
    verifyPassword,
    generateToken,
    verifyToken,
    authenticateRequest,
    requireRole
};
}),
"[project]/Projects/SacAgenda/pages/api/auth/me.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>handler
]);
const { authenticateRequest } = __turbopack_context__.r("[project]/Projects/SacAgenda/lib/auth.js [api] (ecmascript)");
async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({
            error: 'Method not allowed'
        });
    }
    try {
        const authResult = await authenticateRequest(req);
        if (authResult.error) {
            return res.status(authResult.status).json({
                error: authResult.error
            });
        }
        res.json({
            user: authResult.user
        });
    } catch (error) {
        console.error('Auth me error:', error);
        res.status(500).json({
            error: 'Authentication failed'
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0be17e97._.js.map