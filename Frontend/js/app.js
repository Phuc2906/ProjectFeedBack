/* =========================================================
   ROUTER
========================================================= */

const V = {
    dashboard,
    inbox,
    detail,
    roadmap,
    ai,
    users,
    products
};

const NAV = [
    ['dashboard', 'Tổng quan'],
    ['inbox', 'Hộp thư'],
    ['products', 'Sản phẩm'],
    ['roadmap', 'Roadmap'],
    ['ai', 'Insight AI'],
    ['users', 'Người dùng']
];

async function route() {
    if (!S.token) {
        showAuth();
        return;
    }

    $('#auth').hidden = true;
    $('#app').hidden = false;

    const [p, id] = location.hash.slice(2).split('/');
    const cur = V[p] ? p : 'dashboard';

    $('#meName').textContent =
        S.user?.ho_ten || S.user?.username || 'Tài khoản';

    $('#meRole').textContent =
        ROLES[getRole()] || 'Tài khoản nội bộ';

    
$('#nav').innerHTML = NAV
    .filter(n => n[0] !== 'users' || canAdmin())
    .map(n => `
        <a href="#/${n[0]}"
            class="${(cur === n[0] || (cur === 'detail' && n[0] === 'inbox')) ? 'on' : ''}">
            ${n[1]}
        </a>
    `).join('');


    $('#main').innerHTML = '<p class="sub">Đang tải…</p>';
    redraw = null;

    try {
        await V[cur](id);
    } catch (e) {
        $('#main').innerHTML = `
            <div class="card">
                <h3>Không tải được dữ liệu</h3>
                <p class="sub">${esc(e.message)}</p>
                <button class="btn" onclick="route()">Thử lại</button>
            </div>
        `;
    }
}

addEventListener('hashchange', route);

/* =========================================================
   QUẢN LÝ SẢN PHẨM
========================================================= */

async function products() {
    await loadProducts();

    const isProduct = getRole() === 'Product';

    $('#main').innerHTML = `
        <div class="top">
            <div>
                <h1>Quản lý sản phẩm</h1>
                <p class="sub">
                    Danh sách sản phẩm trong hệ thống
                </p>
            </div>

            ${isProduct ? `
                <button class="btn" onclick="addProduct()">
                    + Thêm sản phẩm
                </button>
            ` : ''}
        </div>

        <div class="grid g2">
            ${S.products.length ? S.products.map(p => `
                <div class="card">
                    <h3>${esc(p.ten_san_pham)}</h3>

                    <p class="sub">
                        ${esc(p.mo_ta || 'Chưa có mô tả sản phẩm.')}
                    </p>

                    <small class="sub">
                        Mã sản phẩm: ${esc(p.ma_san_pham)}
                    </small>
                </div>
            `).join('') : `
                <div class="card empty">
                    Chưa có sản phẩm nào.
                </div>
            `}
        </div>
    `;
}


/* =========================================================
   THÊM SẢN PHẨM
========================================================= */

function addProduct() {
    if (getRole() !== 'Product') {
        toast('Bạn không có quyền thêm sản phẩm.', true);
        return;
    }

    modal(`
        <h3>Thêm sản phẩm mới</h3>

        <form onsubmit="saveProduct(event)">
            <label>Tên sản phẩm</label>
            <input
                name="ten_san_pham"
                placeholder="Nhập tên sản phẩm..."
                maxlength="200"
                required
            >

            <label>Mô tả sản phẩm</label>
            <textarea
                name="mo_ta"
                placeholder="Nhập mô tả sản phẩm..."
                rows="4"
            ></textarea>

            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px">
                <button type="button" class="btn ghost" onclick="closeM()">
                    Hủy
                </button>

                <button type="submit" class="btn">
                    Thêm sản phẩm
                </button>
            </div>
        </form>
    `);
}


/* =========================================================
   LƯU SẢN PHẨM
========================================================= */

async function saveProduct(event) {
    event.preventDefault();

    const form = event.target;
    const btn = form.querySelector('button[type="submit"]');

    const ten = form.elements['ten_san_pham'].value.trim();
    const moTa = form.elements['mo_ta'].value.trim();

    if (!ten) {
        toast('Vui lòng nhập tên sản phẩm.', true);
        return;
    }

    if (!S.user?.ma_tai_khoan) {
        toast('Không tìm thấy thông tin tài khoản.', true);
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Đang lưu...';

    try {
        await api(CFG.EP.products, {
            method: 'POST',
            body: {
                ma_tai_khoan: S.user.ma_tai_khoan,
                ten_san_pham: ten,
                mo_ta: moTa
            }
        });

        closeM();
        toast('Thêm sản phẩm thành công!');

        await products();

    } catch (e) {
        toast(e.message, true);
        btn.disabled = false;
        btn.textContent = 'Thêm sản phẩm';
    }
}


/* =========================================================
   QUẢN LÝ NGƯỜI DÙNG
   Backend hiện chưa có API /users/
========================================================= */

async function users() {
    $('#main').innerHTML = `
        <h1>Người dùng</h1>

        <p class="sub">Phân quyền và quản lý tài khoản</p>

        <div class="card">
            <h3>Chức năng chưa được kết nối</h3>

            <p class="sub">
                Backend hiện tại chưa có API danh sách và cập nhật người dùng.
                Chức năng này cần bổ sung endpoint quản lý tài khoản trước khi sử dụng.
            </p>
        </div>
    `;
}

/* =========================================================
   KHỞI CHẠY
========================================================= */

async function init() {
    if (!S.token) {
        showAuth();
        return;
    }

    try {
        // Kiểm tra token và lấy thông tin tài khoản
        S.user = await api(CFG.EP.me);
        ls('us', JSON.stringify(S.user));

        route();

    } catch (e) {
        logout();
    }
}

init();
