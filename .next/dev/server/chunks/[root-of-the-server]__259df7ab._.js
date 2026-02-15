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
"[project]/Projects/SacAgenda/pages/api/auth/login.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>handler
]);
const { query } = __turbopack_context__.r("[project]/Projects/SacAgenda/lib/db.js [api] (ecmascript)");
const { verifyPassword, generateToken } = __turbopack_context__.r("[project]/Projects/SacAgenda/lib/auth.js [api] (ecmascript)");
async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed'
        });
    }
    try {
        const { username, password } = req.body;
        const result = await query('SELECT id, username, email, password_hash, full_name, role, approved FROM users WHERE username = $1', [
            username
        ]);
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }
        if (!user.approved) {
            return res.status(403).json({
                error: 'Account pending approval'
            });
        }
        const validPassword = await verifyPassword(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }
        const token = generateToken(user.id);
        // Clean up old sessions and save new one
        await query('DELETE FROM user_sessions WHERE user_id = $1', [
            user.id
        ]);
        await query('INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)', [
            user.id,
            token,
            new Date(Date.now() + 24 * 60 * 60 * 1000)
        ]);
        const { password_hash, ...userWithoutPassword } = user;
        res.json({
            success: true,
            user: userWithoutPassword,
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed'
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__259df7ab._.js.map