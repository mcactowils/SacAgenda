module.exports = [
"[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("react/jsx-dev-runtime", () => require("react/jsx-dev-runtime"));

module.exports = mod;
}),
"[project]/Projects/SacAgenda/lib/api-client.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
// API client for Next.js app
class ApiClient {
    constructor(){
        this.token = null;
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
    }
    // Helper method for making authenticated requests
    async request(endpoint, options = {}) {
        const url = `/api${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...this.token && {
                    'Authorization': `Bearer ${this.token}`
                },
                ...options.headers
            },
            ...options
        };
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }
    // Set auth token
    setToken(token) {
        this.token = token;
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
    }
    // ══════════════════════════════════════════════════════════════════════════
    // AUTHENTICATION METHODS
    // ══════════════════════════════════════════════════════════════════════════
    async register(userData) {
        const result = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        if (result.token) {
            this.setToken(result.token);
        }
        return result;
    }
    async login(username, password) {
        const result = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                username,
                password
            })
        });
        if (result.token) {
            this.setToken(result.token);
        }
        return result;
    }
    async logout() {
        await this.request('/auth/logout', {
            method: 'POST'
        });
        this.setToken(null);
    }
    async getCurrentUser() {
        return await this.request('/auth/me');
    }
    // ══════════════════════════════════════════════════════════════════════════
    // NAME GROUPS METHODS
    // ══════════════════════════════════════════════════════════════════════════
    async getNameGroups() {
        return await this.request('/names');
    }
    async addName(category, name) {
        return await this.request('/names', {
            method: 'POST',
            body: JSON.stringify({
                category,
                name
            })
        });
    }
}
// Create and export a single instance
const api = new ApiClient();
const __TURBOPACK__default__export__ = api;
}),
"[project]/Projects/SacAgenda/pages/index.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Projects$2f$SacAgenda$2f$lib$2f$api$2d$client$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Projects/SacAgenda/lib/api-client.js [ssr] (ecmascript)");
;
;
;
function Home() {
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(true);
    const [loginForm, setLoginForm] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])({
        username: '',
        password: ''
    });
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])('');
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        checkAuth();
    }, []);
    const checkAuth = async ()=>{
        try {
            const result = await __TURBOPACK__imported__module__$5b$project$5d2f$Projects$2f$SacAgenda$2f$lib$2f$api$2d$client$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"].getCurrentUser();
            setUser(result.user);
        } catch (error) {
            console.log('Not authenticated');
        } finally{
            setLoading(false);
        }
    };
    const handleLogin = async (e)=>{
        e.preventDefault();
        try {
            const result = await __TURBOPACK__imported__module__$5b$project$5d2f$Projects$2f$SacAgenda$2f$lib$2f$api$2d$client$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"].login(loginForm.username, loginForm.password);
            setUser(result.user);
            setError('');
        } catch (error) {
            setError(error.message);
        }
    };
    const handleLogout = async ()=>{
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$Projects$2f$SacAgenda$2f$lib$2f$api$2d$client$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"].logout();
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
            style: {
                padding: '20px',
                fontFamily: 'Arial, sans-serif'
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h1", {
                    children: "🕊️ Sacrament Meeting Agenda"
                }, void 0, false, {
                    fileName: "[project]/Projects/SacAgenda/pages/index.js",
                    lineNumber: 48,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                    children: "Loading..."
                }, void 0, false, {
                    fileName: "[project]/Projects/SacAgenda/pages/index.js",
                    lineNumber: 49,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/Projects/SacAgenda/pages/index.js",
            lineNumber: 47,
            columnNumber: 7
        }, this);
    }
    if (!user) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
            style: {
                padding: '20px',
                fontFamily: 'Arial, sans-serif',
                maxWidth: '400px'
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h1", {
                    children: "🕊️ Sacrament Meeting Agenda"
                }, void 0, false, {
                    fileName: "[project]/Projects/SacAgenda/pages/index.js",
                    lineNumber: 57,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h2", {
                    children: "Login"
                }, void 0, false, {
                    fileName: "[project]/Projects/SacAgenda/pages/index.js",
                    lineNumber: 58,
                    columnNumber: 9
                }, this),
                error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    style: {
                        color: 'red',
                        marginBottom: '10px'
                    },
                    children: error
                }, void 0, false, {
                    fileName: "[project]/Projects/SacAgenda/pages/index.js",
                    lineNumber: 60,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("form", {
                    onSubmit: handleLogin,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            style: {
                                marginBottom: '10px'
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                type: "text",
                                placeholder: "Username",
                                value: loginForm.username,
                                onChange: (e)=>setLoginForm({
                                        ...loginForm,
                                        username: e.target.value
                                    }),
                                style: {
                                    width: '100%',
                                    padding: '8px',
                                    marginBottom: '5px'
                                }
                            }, void 0, false, {
                                fileName: "[project]/Projects/SacAgenda/pages/index.js",
                                lineNumber: 66,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Projects/SacAgenda/pages/index.js",
                            lineNumber: 65,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            style: {
                                marginBottom: '10px'
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                type: "password",
                                placeholder: "Password",
                                value: loginForm.password,
                                onChange: (e)=>setLoginForm({
                                        ...loginForm,
                                        password: e.target.value
                                    }),
                                style: {
                                    width: '100%',
                                    padding: '8px'
                                }
                            }, void 0, false, {
                                fileName: "[project]/Projects/SacAgenda/pages/index.js",
                                lineNumber: 75,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Projects/SacAgenda/pages/index.js",
                            lineNumber: 74,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                            type: "submit",
                            style: {
                                background: '#4CAF50',
                                color: 'white',
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            },
                            children: "Login"
                        }, void 0, false, {
                            fileName: "[project]/Projects/SacAgenda/pages/index.js",
                            lineNumber: 83,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Projects/SacAgenda/pages/index.js",
                    lineNumber: 64,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/Projects/SacAgenda/pages/index.js",
            lineNumber: 56,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        style: {
            padding: '20px',
            fontFamily: 'Arial, sans-serif'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                style: {
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h1", {
                        children: "🕊️ Sacrament Meeting Agenda"
                    }, void 0, false, {
                        fileName: "[project]/Projects/SacAgenda/pages/index.js",
                        lineNumber: 104,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        children: [
                            "Welcome, ",
                            user.full_name,
                            "! (",
                            user.role,
                            ")",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                onClick: handleLogout,
                                style: {
                                    marginLeft: '10px',
                                    background: '#f44336',
                                    color: 'white',
                                    padding: '5px 10px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                },
                                children: "Logout"
                            }, void 0, false, {
                                fileName: "[project]/Projects/SacAgenda/pages/index.js",
                                lineNumber: 107,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Projects/SacAgenda/pages/index.js",
                        lineNumber: 105,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Projects/SacAgenda/pages/index.js",
                lineNumber: 103,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                style: {
                    background: '#f5f5f5',
                    padding: '20px',
                    borderRadius: '8px'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h2", {
                        children: "✅ Next.js Conversion Successful!"
                    }, void 0, false, {
                        fileName: "[project]/Projects/SacAgenda/pages/index.js",
                        lineNumber: 125,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                        children: "Your app has been successfully converted to Next.js:"
                    }, void 0, false, {
                        fileName: "[project]/Projects/SacAgenda/pages/index.js",
                        lineNumber: 126,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("ul", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("li", {
                                children: "✅ Authentication working"
                            }, void 0, false, {
                                fileName: "[project]/Projects/SacAgenda/pages/index.js",
                                lineNumber: 128,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("li", {
                                children: "✅ Database connection established"
                            }, void 0, false, {
                                fileName: "[project]/Projects/SacAgenda/pages/index.js",
                                lineNumber: 129,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("li", {
                                children: "✅ API routes converted"
                            }, void 0, false, {
                                fileName: "[project]/Projects/SacAgenda/pages/index.js",
                                lineNumber: 130,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("li", {
                                children: "⚠️ Full agenda interface needs to be ported"
                            }, void 0, false, {
                                fileName: "[project]/Projects/SacAgenda/pages/index.js",
                                lineNumber: 131,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Projects/SacAgenda/pages/index.js",
                        lineNumber: 127,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h3", {
                        children: "Next Steps:"
                    }, void 0, false, {
                        fileName: "[project]/Projects/SacAgenda/pages/index.js",
                        lineNumber: 134,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                        children: "The basic Next.js structure is now in place. The full agenda interface from your original React app needs to be ported over, but the hard part (authentication, database, API routes) is done!"
                    }, void 0, false, {
                        fileName: "[project]/Projects/SacAgenda/pages/index.js",
                        lineNumber: 135,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("strong", {
                            children: "Ready to deploy to Vercel!"
                        }, void 0, false, {
                            fileName: "[project]/Projects/SacAgenda/pages/index.js",
                            lineNumber: 137,
                            columnNumber: 12
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Projects/SacAgenda/pages/index.js",
                        lineNumber: 137,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Projects/SacAgenda/pages/index.js",
                lineNumber: 124,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Projects/SacAgenda/pages/index.js",
        lineNumber: 102,
        columnNumber: 5
    }, this);
}
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__4a21eb55._.js.map