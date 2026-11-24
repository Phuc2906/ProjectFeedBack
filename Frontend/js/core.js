/* =========================================================
   CẤU HÌNH BACKEND DJANGO
========================================================= */

const CFG = {
    API: 'https://projectfeedback.onrender.com/api',

    AUTH: 'Bearer',

    EP: {
        login: '/token/',
        register: '/register/',
        me: '/taikhoan/me/',
        fb: '/phanhoi/',
        products: '/sanpham/',
        tags: '/tag/',
        vote: '/binhchon/',
        roadmap: '/roadmap/',
        groups: '/nhomai/',
        users: '/users/',
        ai: '/ai/insights/'
    }
};


/* =========================================================
   TIỆN ÍCH
========================================================= */

const $ = s => document.querySelector(s);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[c]));

const ls = (k, v) => {
    try {
        if (v === undefined) return localStorage.getItem(k);
        if (v === null) return localStorage.removeItem(k);
        return localStorage.setItem(k, v);
    } catch (e) {}
};

const arr = d => Array.isArray(d) ? d : d?.results || [];

const S = {
    token: ls('tk'),
    user: JSON.parse(ls('us') || 'null'),
    fbs: [],
    users: [],
    tags: [],
    products: [],
    votes: [],
    roadmaps: [],
    groups: []
};

let CUR = null;
let redraw = null;


/* =========================================================
   TRẠNG THÁI THEO BACKEND
   Backend hiện sử dụng:
   Pending / In Progress / Done
========================================================= */

const ST = {
    'Pending': ['Chờ xử lý', '#b7791f', '#fff4dc'],
    'In Progress': ['Đang xử lý', '#e8590c', '#ffeadb'],
    'Done': ['Hoàn thành', '#2f9e6b', '#e0f6ec']
};

const stl = s => ST[s] || [s || 'Chưa xác định', '#64708a', '#eef1f6'];

const chip = s => {
    const [l, c, b] = stl(s);
    return `<span class="chip" style="color:${c};background:${b}">${esc(l)}</span>`;
};


/* =========================================================
   VAI TRÒ
   Backend trả vai_tro: Product / CS / Dev
========================================================= */

const ROLES = {
    Product: 'Product',
    CS: 'CS',
    Dev: 'Dev'
};

const getRole = () => {
    return S.user?.vai_tro || S.user?.role || null;
};

const isStaff = () => !!S.token;

const canAdmin = () => getRole() === 'Product';


const fdate = d => {
    const x = new Date(d);
    return isNaN(x) ? '' : x.toLocaleDateString('vi-VN');
};


/* =========================================================
   CHUYỂN DỮ LIỆU BACKEND SANG GIAO DIỆN
========================================================= */

function getTagNames(tagIds) {
    if (!Array.isArray(tagIds)) return [];

    return tagIds.map(id => {
        const tag = S.tags.find(t => t.ma_tag === id);
        return tag ? tag.ten_tag : null;
    }).filter(Boolean);
}

function nf(o) {
    return {
        id: o.ma_phan_hoi,
        title: o.tieu_de || '(Không có tiêu đề)',
        desc: o.noi_dung || '',
        status: o.trang_thai || 'Pending',
        tagIds: Array.isArray(o.tags) ? o.tags : [],
        tags: getTagNames(o.tags),
        votes: S.votes.filter(v => {
            const feedbackId = v.ma_phan_hoi;
            return Number(feedbackId) === Number(o.ma_phan_hoi);
        }).length,
        by: o.ten_nguoi_gui || 'Ẩn danh',
        email: o.email_nguoi_gui || '',
        at: o.ngay_tao || '',
        src: o.nguon_tiep_nhan || '',
        productId: o.ma_san_pham,
        accountId: o.ma_tai_khoan
    };
}


/* =========================================================
   THÔNG BÁO VÀ XỬ LÝ LỖI
========================================================= */

function toast(m, bad) {
    const t = document.createElement('div');
    t.className = 'toast' + (bad ? ' bad' : '');
    t.textContent = m;
    document.body.append(t);
    setTimeout(() => t.remove(), 3200);
}

const safe = fn => async (...a) => {
    try {
        return await fn(...a);
    } catch (e) {
        toast(e.message, true);
    }
};

const errMsg = d => {
    if (!d) return '';
    if (typeof d === 'string') return d;
    if (d.detail) return d.detail;

    const v = Object.entries(d)[0];

    return v
        ? (Array.isArray(v[1]) ? v[1][0] : v[1])
        : '';
};


/* =========================================================
   HÀM GỌI API
========================================================= */

async function api(path, {method = 'GET', body} = {}) {
    const h = {
        'Content-Type': 'application/json'
    };

    if (S.token) {
        h.Authorization = CFG.AUTH + ' ' + S.token;
    }

    let r;

    try {
        r = await fetch(CFG.API + path, {
            method,
            headers: h,
            body: body !== undefined ? JSON.stringify(body) : undefined
        });
    } catch (e) {
        throw Error(
            'Không kết nối được Backend tại ' + CFG.API +
            '. Hãy bật Django server và kiểm tra CORS.'
        );
    }

    if (r.status === 401 && S.token && !path.includes('/token/')) {
        logout();
        throw Error('Phiên đăng nhập đã hết hạn.');
    }

    const d = r.status === 204
        ? null
        : await r.json().catch(() => null);

    if (!r.ok) {
        throw Error(errMsg(d) || 'Lỗi HTTP ' + r.status);
    }

    return d;
}


/* =========================================================
   MODAL
========================================================= */

function modal(html) {
    const m = $('#modal');
    m.innerHTML = `<div class="card">${html}</div>`;
    m.hidden = false;

    m.onclick = e => {
        if (e.target === m) closeM();
    };
}

function closeM() {
    $('#modal').hidden = true;
}


/* =========================================================
   TẢI DỮ LIỆU TỪ BACKEND
========================================================= */

async function loadTags() {
    S.tags = arr(await api(CFG.EP.tags));
}

async function loadVotes() {
    S.votes = arr(await api(CFG.EP.vote));
}

async function loadFb() {
    await loadTags();
    await loadVotes();

    const data = arr(await api(CFG.EP.fb));
    S.fbs = data.map(nf);
}

async function loadProducts() {
    S.products = arr(await api(CFG.EP.products));
}

async function loadRoadmaps() {
    S.roadmaps = arr(await api(CFG.EP.roadmap));
}


/* =========================================================
   ĐĂNG NHẬP / ĐĂNG KÝ
========================================================= */

function showAuth(mode = 'login') {
    $('#app').hidden = true;

    const a = $('#auth');
    a.hidden = false;

    const reg = mode === 'register';

    a.innerHTML = `
        <section class="hero">
            <div class="logo" style="width:44px;height:44px;font-size:22px">↻</div>
            <h2>Biến feedback của khách hàng thành roadmap</h2>
            <p>Gom góp ý từ nhiều nguồn, để AI nhóm các ý trùng lặp và cho biết nên làm gì trước.</p>
        </section>

        <section class="form">
            <form onsubmit="doAuth(event,${reg})">
                <h1>${reg ? 'Tạo tài khoản' : 'Đăng nhập'}</h1>

                <label>Tên đăng nhập</label>
                <input name="username" required autocomplete="username">

                ${reg ? `
                    <label>Họ tên</label>
                    <input name="ho_ten" required>

                    <label>Email</label>
                    <input name="email" type="email" required>
                ` : ''}

                <label>Mật khẩu</label>
                <input name="password" type="password" required minlength="6"
                    autocomplete="${reg ? 'new' : 'current'}-password">

                <div class="err" id="aerr"></div>

                <button class="btn">
                    ${reg ? 'Đăng ký' : 'Đăng nhập'}
                </button>

                <p>
                    ${reg
                        ? `Đã có tài khoản? <a onclick="showAuth()">Đăng nhập</a>`
                        : `Chưa có tài khoản? <a onclick="showAuth('register')">Đăng ký</a>`
                    }
                </p>

                <p>
                    Backend: <code>${esc(CFG.API)}</code>
                    · <a onclick="setApi()">Đổi địa chỉ</a>
                </p>
            </form>
        </section>
    `;
}


function setApi() {
    const v = prompt(
        'Địa chỉ API Backend (ví dụ: https://ten-app.onrender.com/api)',
        CFG.API
    );

    if (v) {
        ls('api', v.replace(/\/$/, ''));
        location.reload();
    }
}


async function doAuth(e, reg) {
    e.preventDefault();

    const f = Object.fromEntries(new FormData(e.target));
    const b = e.target.querySelector('.btn');

    b.disabled = true;

    try {
        if (reg) {
            await api(CFG.EP.register, {
                method: 'POST',
                body: f
            });
        }

        const d = await api(CFG.EP.login, {
            method: 'POST',
            body: {
                username: f.username,
                password: f.password
            }
        });

        S.token = d.access || d.token || d.key;

        if (!S.token) {
            throw Error('Backend không trả về access token.');
        }

        ls('tk', S.token);

        // Lấy thông tin tài khoản từ API /taikhoan/me/
        S.user = await api(CFG.EP.me);

        ls('us', JSON.stringify(S.user));

        location.hash = '#/dashboard';
        route();

    } catch (x) {
        $('#aerr').textContent = x.message;
        b.disabled = false;
    }
}


function logout() {
    S.token = null;
    S.user = null;

    ls('tk', null);
    ls('us', null);

    location.hash = '';
    showAuth();
}
