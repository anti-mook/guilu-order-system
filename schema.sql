-- 龟鹿药业订单管理系统 D1 数据库初始化脚本

-- 管理员表
CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT DEFAULT ''
);

-- 产品表
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    code TEXT DEFAULT '',
    name TEXT NOT NULL,
    form TEXT DEFAULT '',
    spec TEXT DEFAULT '',
    category TEXT DEFAULT '',
    positioning TEXT DEFAULT '',
    image TEXT DEFAULT '',
    productionMode TEXT DEFAULT '',
    unit TEXT DEFAULT '',
    boxSpec TEXT DEFAULT '',
    costPrice REAL DEFAULT 0,
    marketPrice REAL DEFAULT 0,
    dailyPrice REAL DEFAULT 0,
    minPrice REAL DEFAULT 0,
    internalPrice REAL DEFAULT 0,
    status TEXT DEFAULT '在售',
    createdAt TEXT DEFAULT '',
    updatedAt TEXT DEFAULT ''
);

-- 销售人员表
CREATE TABLE IF NOT EXISTS sales_staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    account TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    orderNumber TEXT DEFAULT '',
    purchaseDate TEXT DEFAULT '',
    orderType TEXT DEFAULT '',
    salesMethod TEXT DEFAULT '线上订单',
    channel TEXT DEFAULT '',
    salesPerson TEXT DEFAULT '',
    totalPrice REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    items TEXT DEFAULT '[]',
    orderStatus TEXT DEFAULT '',
    appealStatus TEXT DEFAULT '',
    appealType TEXT DEFAULT '',
    appealReason TEXT DEFAULT '',
    appealTime TEXT DEFAULT '',
    replyContent TEXT DEFAULT '',
    replyTime TEXT DEFAULT '',
    createdBy TEXT DEFAULT '',
    createdTime TEXT DEFAULT '',
    lastModifiedBy TEXT DEFAULT '',
    lastModifiedTime TEXT DEFAULT '',
    deletedAt TEXT DEFAULT ''
);

-- 插入默认管理员账号
INSERT INTO admins (id, username, password, name) VALUES ('A001', 'admin', 'admin123', '管理员');
