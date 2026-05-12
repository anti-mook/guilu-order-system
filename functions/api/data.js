// Cloudflare Pages Function - 数据同步API
// 通过GitHub API读写data.json，实现跨设备数据共享

const REPO = 'anti-mook/guilu-order-system';
const FILE_PATH = 'data.json';

function getHeaders(token) {
    return {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'guilu-order-system'
    };
}

// 编码中文安全的base64
function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

// 解码中文安全的base64
function fromBase64(b64) {
    return decodeURIComponent(escape(atob(b64)));
}

// 默认数据
function getDefaultData() {
    return {
        products: [],
        salesStaff: [],
        orders: [],
        admins: [{ id: 'A001', username: 'admin', password: 'admin123', name: '管理员' }]
    };
}

// GET /api/data - 读取数据
export async function onRequestGet(context) {
    const token = context.env.GITHUB_TOKEN;
    
    if (!token) {
        return new Response(JSON.stringify({ error: 'GITHUB_TOKEN not configured' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    try {
        const response = await fetch(
            `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
            { headers: getHeaders(token) }
        );

        if (response.status === 404) {
            return new Response(JSON.stringify(getDefaultData()), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        if (!response.ok) {
            const error = await response.json();
            return new Response(JSON.stringify({ error: error.message }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const fileData = await response.json();
        const content = JSON.parse(fromBase64(fileData.content));
        // 附带SHA用于后续更新
        content._sha = fileData.sha;
        
        return new Response(JSON.stringify(content), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}

// POST /api/data - 保存数据
export async function onRequestPost(context) {
    const token = context.env.GITHUB_TOKEN;
    
    if (!token) {
        return new Response(JSON.stringify({ error: 'GITHUB_TOKEN not configured' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    try {
        const newData = await context.request.json();
        const clientSha = newData._sha;
        delete newData._sha;

        // 获取当前文件SHA（乐观锁）
        let currentSha = '';
        const getResponse = await fetch(
            `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
            { headers: getHeaders(token) }
        );
        
        if (getResponse.status === 200) {
            const currentData = await getResponse.json();
            currentSha = currentData.sha;
        }

        // 更新文件
        const updateBody = {
            message: `数据更新 ${new Date().toISOString()}`,
            content: toBase64(JSON.stringify(newData, null, 2))
        };
        
        // 如果文件已存在，必须提供SHA
        if (currentSha) {
            updateBody.sha = currentSha;
        }

        const updateResponse = await fetch(
            `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
            {
                method: 'PUT',
                headers: { ...getHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify(updateBody)
            }
        );

        if (updateResponse.ok) {
            const result = await updateResponse.json();
            return new Response(JSON.stringify({ success: true, sha: result.content.sha }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        } else {
            const error = await updateResponse.json();
            return new Response(JSON.stringify({ success: false, error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
    } catch (err) {
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
