// Cloudflare Pages Function - D1数据库版本
// 数据同步API：前端 → Cloudflare Functions → Cloudflare D1数据库

// 默认数据
function getDefaultData() {
    return {
        products: [],
        salesStaff: [],
        orders: [],
        admins: [{ id: 'A001', username: 'admin', password: 'admin123', name: '管理员' }]
    };
}

// 初始化数据库表结构
async function ensureTables(db) {
    await db.batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS admins (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, name TEXT DEFAULT '')`),
        db.prepare(`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, code TEXT DEFAULT '', name TEXT NOT NULL, form TEXT DEFAULT '', spec TEXT DEFAULT '', category TEXT DEFAULT '', positioning TEXT DEFAULT '', image TEXT DEFAULT '', productionMode TEXT DEFAULT '', unit TEXT DEFAULT '', boxSpec TEXT DEFAULT '', costPrice REAL DEFAULT 0, marketPrice REAL DEFAULT 0, dailyPrice REAL DEFAULT 0, minPrice REAL DEFAULT 0, internalPrice REAL DEFAULT 0, status TEXT DEFAULT '在售', createdAt TEXT DEFAULT '', updatedAt TEXT DEFAULT '')`),
        db.prepare(`CREATE TABLE IF NOT EXISTS sales_staff (id TEXT PRIMARY KEY, name TEXT NOT NULL, account TEXT NOT NULL UNIQUE, password TEXT NOT NULL)`),
        db.prepare(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, orderNumber TEXT DEFAULT '', purchaseDate TEXT DEFAULT '', orderType TEXT DEFAULT '', channel TEXT DEFAULT '', salesPerson TEXT DEFAULT '', totalPrice REAL DEFAULT 0, notes TEXT DEFAULT '', items TEXT DEFAULT '[]', orderStatus TEXT DEFAULT '', appealStatus TEXT DEFAULT '', appealType TEXT DEFAULT '', appealReason TEXT DEFAULT '', appealTime TEXT DEFAULT '', replyContent TEXT DEFAULT '', replyTime TEXT DEFAULT '', createdBy TEXT DEFAULT '', createdTime TEXT DEFAULT '', lastModifiedBy TEXT DEFAULT '', lastModifiedTime TEXT DEFAULT '', deletedAt TEXT DEFAULT '')`),
    ]);
}

// GET /api/data - 从D1读取全量数据
export async function onRequestGet(context) {
    const db = context.env.DB;
    
    if (!db) {
        return new Response(JSON.stringify({ error: 'D1 database not bound' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    try {
        // 确保表存在
        await ensureTables(db);
        
        const admins = await db.prepare('SELECT * FROM admins').all();
        const products = await db.prepare('SELECT * FROM products').all();
        const salesStaff = await db.prepare('SELECT * FROM sales_staff').all();
        const orders = await db.prepare('SELECT * FROM orders').all();
        
        return new Response(JSON.stringify({
            admins: admins.results || [],
            products: products.results || [],
            salesStaff: salesStaff.results || [],
            orders: orders.results || []
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    } catch (err) {
        console.error('D1 read error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}

// POST /api/data - 全量覆盖写入D1
export async function onRequestPost(context) {
    const db = context.env.DB;
    
    if (!db) {
        return new Response(JSON.stringify({ error: 'D1 database not bound' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    try {
        const data = await context.request.json();
        // D1版本不再需要SHA乐观锁
        delete data._sha;

        // 确保表存在
        await ensureTables(db);
        
        // 使用事务覆盖写入
        const stmts = [];
        
        // 清空所有表
        stmts.push(db.prepare('DELETE FROM admins'));
        stmts.push(db.prepare('DELETE FROM products'));
        stmts.push(db.prepare('DELETE FROM sales_staff'));
        stmts.push(db.prepare('DELETE FROM orders'));
        
        // 插入admins
        if (data.admins && data.admins.length > 0) {
            data.admins.forEach(a => {
                stmts.push(db.prepare('INSERT INTO admins (id, username, password, name) VALUES (?, ?, ?, ?)')
                    .bind(a.id, a.username, a.password, a.name || ''));
            });
        }
        
        // 插入products
        if (data.products && data.products.length > 0) {
            data.products.forEach(p => {
                stmts.push(db.prepare(`INSERT INTO products (id, code, name, form, spec, category, positioning, image, productionMode, unit, boxSpec, costPrice, marketPrice, dailyPrice, minPrice, internalPrice, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                    .bind(p.id, p.code||'', p.name||'', p.form||'', p.spec||'', p.category||'', p.positioning||'', p.image||'', p.productionMode||'', p.unit||'', p.boxSpec||'', p.costPrice||0, p.marketPrice||0, p.dailyPrice||0, p.minPrice||0, p.internalPrice||0, p.status||'在售', p.createdAt||'', p.updatedAt||''));
            });
        }
        
        // 插入salesStaff
        if (data.salesStaff && data.salesStaff.length > 0) {
            data.salesStaff.forEach(s => {
                stmts.push(db.prepare('INSERT INTO sales_staff (id, name, account, password) VALUES (?, ?, ?, ?)')
                    .bind(s.id, s.name, s.account, s.password));
            });
        }
        
        // 插入orders
        if (data.orders && data.orders.length > 0) {
            data.orders.forEach(o => {
                stmts.push(db.prepare(`INSERT INTO orders (id, orderNumber, purchaseDate, orderType, channel, salesPerson, totalPrice, notes, items, orderStatus, appealStatus, appealType, appealReason, appealTime, replyContent, replyTime, createdBy, createdTime, lastModifiedBy, lastModifiedTime, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                    .bind(o.id, o.orderNumber||'', o.purchaseDate||'', o.orderType||'', o.channel||'', o.salesPerson||'', o.totalPrice||0, o.notes||'', JSON.stringify(o.items||[]), o.orderStatus||'', o.appealStatus||'', o.appealType||'', o.appealReason||'', o.appealTime||'', o.replyContent||'', o.replyTime||'', o.createdBy||'', o.createdTime||'', o.lastModifiedBy||'', o.lastModifiedTime||'', o.deletedAt||''));
            });
        }
        
        await db.batch(stmts);
        
        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    } catch (err) {
        console.error('D1 write error:', err);
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}

// OPTIONS /api/data - CORS预检
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
