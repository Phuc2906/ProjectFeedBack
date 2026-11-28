/* =========================================================
   ROUTER
========================================================= */

const V = {
    dashboard,
    inbox,
    detail,
    chat,
    roadmap,
    ai,
    users,
    products,
    tags
};

const NAV = [
    ['dashboard', 'Tổng quan'],
    ['inbox', 'Hộp thư'],
    ['chat', 'Hộp thư Chat'],
    ['products', 'Sản phẩm'],
    ['tags', 'Quản lý Tag'],
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

    if (cur === 'chat' && getRole() !== ROLES.CS) {
    location.hash = '#/dashboard';
    return;
}

    $('#meName').textContent =
        S.user?.ho_ten || S.user?.username || 'Tài khoản';

    $('#meRole').textContent =
        ROLES[getRole()] || 'Tài khoản nội bộ';

    
$('#nav').innerHTML = NAV
    .filter(n => {
    if (n[0] === 'users') return canAdmin();
    if (n[0] === 'tags') return canManageTags();
    if (n[0] === 'chat') return getRole() === ROLES.CS;
    return true;
})
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

                    ${isProduct ? `
                        <div style="display:flex;gap:10px;margin-top:16px">
                            <button class="btn ghost"
                                onclick="editProduct(${p.ma_san_pham})">
                                Sửa
                            </button>

                            <button class="btn bad"
                                onclick="deleteProduct(${p.ma_san_pham})">
                                Xóa
                            </button>
                        </div>
                    ` : ''}
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
   SỬA SẢN PHẨM
========================================================= */

function editProduct(productId) {
    if (getRole() !== 'Product') {
        toast('Bạn không có quyền sửa sản phẩm.', true);
        return;
    }

    const product = S.products.find(p =>
        Number(p.ma_san_pham) === Number(productId)
    );

    if (!product) {
        toast('Không tìm thấy sản phẩm.', true);
        return;
    }

    modal(`
        <h3>Sửa sản phẩm</h3>

        <form onsubmit="updateProduct(event, ${product.ma_san_pham})">
            <label>Tên sản phẩm</label>

            <input
                name="ten_san_pham"
                value="${esc(product.ten_san_pham)}"
                maxlength="200"
                required
            >

            <label>Mô tả sản phẩm</label>

            <textarea
                name="mo_ta"
                rows="4"
            >${esc(product.mo_ta || '')}</textarea>

            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px">
                <button type="button" class="btn ghost" onclick="closeM()">
                    Hủy
                </button>

                <button type="submit" class="btn">
                    Lưu thay đổi
                </button>
            </div>
        </form>
    `);
}

/* =========================================================
   CẬP NHẬT SẢN PHẨM
========================================================= */

async function updateProduct(event, productId) {
    event.preventDefault();

    if (getRole() !== 'Product') {
        toast('Bạn không có quyền sửa sản phẩm.', true);
        return;
    }

    const form = event.target;
    const btn = form.querySelector('button[type="submit"]');

    const ten = form.elements['ten_san_pham'].value.trim();
    const moTa = form.elements['mo_ta'].value.trim();

    if (!ten) {
        toast('Vui lòng nhập tên sản phẩm.', true);
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Đang lưu...';

    try {
        await api(CFG.EP.products + productId + '/', {
            method: 'PATCH',
            body: {
                ten_san_pham: ten,
                mo_ta: moTa
            }
        });

        closeM();
        toast('Cập nhật sản phẩm thành công!');

        await products();

    } catch (e) {
        toast(e.message, true);

        btn.disabled = false;
        btn.textContent = 'Lưu thay đổi';
    }
}

/* =========================================================
   XÓA SẢN PHẨM
========================================================= */

async function deleteProduct(productId) {
    if (getRole() !== 'Product') {
        toast('Bạn không có quyền xóa sản phẩm.', true);
        return;
    }

    const product = S.products.find(p =>
        Number(p.ma_san_pham) === Number(productId)
    );

    if (!product) {
        toast('Không tìm thấy sản phẩm.', true);
        return;
    }

    if (!confirm(
        `Bạn có chắc muốn xóa sản phẩm "${product.ten_san_pham}"?`
        + '\n\nLưu ý: Chỉ xóa được sản phẩm chưa có dữ liệu liên quan.'
    )) {
        return;
    }

    try {
        await api(CFG.EP.products + productId + '/', {
            method: 'DELETE'
        });

        toast('Đã xóa sản phẩm!');

        await products();

    } catch (e) {
        toast(e.message, true);
    }
}

/* =========================================================
   QUẢN LÝ TAG
========================================================= */

async function tags() {
    if (!canManageTags()) {
        toast('Bạn không có quyền quản lý Tag.', true);
        location.hash = '#/dashboard';
        return;
    }

    await loadProducts();
    await loadTags();

    $('#main').innerHTML = `
        <div class="top">
            <div>
                <h1>Quản lý Tag</h1>
                <p class="sub">
                    Quản lý nhãn phân loại feedback theo sản phẩm
                </p>
            </div>

            <button class="btn" onclick="addTagManager()">
                + Thêm Tag
            </button>
        </div>

        <div class="card">
            <label>Chọn sản phẩm</label>

            <select id="tagProduct" onchange="renderTagList()">
                ${S.products.map(p => `
                    <option value="${p.ma_san_pham}">
                        ${esc(p.ten_san_pham)}
                    </option>
                `).join('')}
            </select>
        </div>

        <div class="card" id="tagList"></div>
    `;

    renderTagList();
}

function renderTagList() {
    const productId = Number($('#tagProduct')?.value);

    const list = S.tags.filter(t =>
        Number(t.ma_san_pham) === productId
    );

    $('#tagList').innerHTML = `
        <h3>Danh sách Tag</h3>

        ${list.length ? list.map(t => `
            <div class="row">
                <div class="t">
                    <b>${esc(t.ten_tag)}</b>
                </div>

                <button class="btn ghost"
                    onclick="editTag(${t.ma_tag})">
                    Sửa
                </button>

                <button class="btn bad"
                    onclick="deleteTag(${t.ma_tag})">
                    Xóa
                </button>
            </div>
        `).join('') : `
            <p class="empty">
                Sản phẩm này chưa có Tag nào.
            </p>
        `}
    `;
}

/* =========================================================
   THÊM TAG
========================================================= */

function addTagManager() {
    if (!canManageTags()) {
        toast('Bạn không có quyền thêm Tag.', true);
        return;
    }

    const currentProduct = $('#tagProduct')?.value;

    modal(`
        <h3>Thêm Tag mới</h3>

        <form onsubmit="saveTag(event)">
            <label>Sản phẩm</label>

            <select name="ma_san_pham" required>
                ${S.products.map(p => `
                    <option
                        value="${p.ma_san_pham}"
                        ${String(p.ma_san_pham) === String(currentProduct) ? 'selected' : ''}
                    >
                        ${esc(p.ten_san_pham)}
                    </option>
                `).join('')}
            </select>

            <label>Tên Tag</label>

            <input
                name="ten_tag"
                placeholder="Ví dụ: Bug, UI/UX..."
                maxlength="100"
                required
            >

            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px">
                <button type="button" class="btn ghost" onclick="closeM()">
                    Hủy
                </button>

                <button type="submit" class="btn">
                    Thêm Tag
                </button>
            </div>
        </form>
    `);
}

/* =========================================================
   LƯU TAG
========================================================= */

async function saveTag(event) {
    event.preventDefault();

    if (!canManageTags()) {
        toast('Bạn không có quyền thêm Tag.', true);
        return;
    }

    const form = event.target;
    const btn = form.querySelector('button[type="submit"]');

    const productId = Number(form.elements['ma_san_pham'].value);
    const tenTag = form.elements['ten_tag'].value.trim();

    if (!productId || !tenTag) {
        toast('Vui lòng nhập đầy đủ thông tin.', true);
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Đang lưu...';

    try {
        await api(CFG.EP.tags, {
            method: 'POST',
            body: {
                ma_san_pham: productId,
                ten_tag: tenTag
            }
        });

        closeM();
        toast('Thêm Tag thành công!');

        await loadTags();
        renderTagList();

    } catch (e) {
        toast(e.message, true);

        btn.disabled = false;
        btn.textContent = 'Thêm Tag';
    }
}


/* =========================================================
   SỬA TAG
========================================================= */

function editTag(tagId) {
    if (!canManageTags()) {
        toast('Bạn không có quyền sửa Tag.', true);
        return;
    }

    const tag = S.tags.find(t =>
        Number(t.ma_tag) === Number(tagId)
    );

    if (!tag) {
        toast('Không tìm thấy Tag.', true);
        return;
    }

    modal(`
        <h3>Sửa Tag</h3>

        <form onsubmit="updateTag(event, ${tag.ma_tag})">
            <label>Tên Tag</label>

            <input
                name="ten_tag"
                value="${esc(tag.ten_tag)}"
                maxlength="100"
                required
            >

            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px">
                <button type="button" class="btn ghost" onclick="closeM()">
                    Hủy
                </button>

                <button type="submit" class="btn">
                    Lưu thay đổi
                </button>
            </div>
        </form>
    `);
}

async function updateTag(event, tagId) {
    event.preventDefault();

    if (!canManageTags()) return;

    const tenTag = event.target.elements['ten_tag'].value.trim();

    if (!tenTag) {
        toast('Vui lòng nhập tên Tag.', true);
        return;
    }

    try {
        await api(CFG.EP.tags + tagId + '/', {
            method: 'PATCH',
            body: {
                ten_tag: tenTag
            }
        });

        closeM();
        toast('Cập nhật Tag thành công!');

        await loadTags();
        renderTagList();

    } catch (e) {
        toast(e.message, true);
    }
}

/* =========================================================
   XÓA TAG
========================================================= */

async function deleteTag(tagId) {
    if (!canManageTags()) {
        toast('Bạn không có quyền xóa Tag.', true);
        return;
    }

    const tag = S.tags.find(t =>
        Number(t.ma_tag) === Number(tagId)
    );

    if (!tag) {
        toast('Không tìm thấy Tag.', true);
        return;
    }

    if (!confirm(`Bạn có chắc muốn xóa Tag "${tag.ten_tag}"?`)) {
        return;
    }

    try {
        await api(CFG.EP.tags + tagId + '/', {
            method: 'DELETE'
        });

        toast('Đã xóa Tag!');

        await loadTags();
        renderTagList();

    } catch (e) {
        toast(e.message, true);
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
