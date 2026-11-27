/* =========================================================
   TỔNG QUAN
========================================================= */

async function dashboard() {
    await loadFb();

    const f = S.fbs;
    const countStatus = s => f.filter(x => x.status === s).length;

    const tags = {};

    f.forEach(x => {
        x.tags.forEach(t => {
            tags[t] = (tags[t] || 0) + 1;
        });
    });

    const top = [...f]
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 5);

    const max = Math.max(1, ...Object.keys(ST).map(s => countStatus(s)));

    $('#main').innerHTML = `
        <h1>Tổng quan</h1>
        <p class="sub">Tình hình feedback của sản phẩm</p>

        <div class="grid g4">
            ${[
                ['Tổng feedback', f.length],
                ['Chờ xử lý', countStatus('Pending')],
                ['Đang xử lý', countStatus('In Progress')],
                ['Đã hoàn thành', countStatus('Done')],
                ['Tổng lượt vote', f.reduce((a, x) => a + x.votes, 0)]
            ].map(([l, n]) => `
                <div class="card stat">
                    <b>${n}</b>
                    <span>${l}</span>
                </div>
            `).join('')}
        </div>

        <div class="grid g2" style="margin-top:14px">
            <div class="card">
                <h3>Theo trạng thái</h3>

                ${Object.keys(ST).map(s => `
                    <div class="hb">
                        <span>${stl(s)[0]}</span>
                        <i style="width:${countStatus(s) / max * 100}%;background:${stl(s)[1]}"></i>
                        <em>${countStatus(s)}</em>
                    </div>
                `).join('')}
            </div>

            <div class="card">
                <h3>Được vote nhiều nhất</h3>

                ${top.map(x => `
                    <a class="mini" href="#/detail/${x.id}">
                        <b>${x.votes}</b>
                        <span>${esc(x.title)}</span>
                    </a>
                `).join('') || '<p class="empty">Chưa có feedback nào.</p>'}
            </div>
        </div>

        <div class="card" style="margin-top:14px">
            <h3>Tag phổ biến</h3>

            ${Object.entries(tags)
                .sort((a, b) => b[1] - a[1])
                .map(([t, n]) => `
                    <span class="tag">${esc(t)} · ${n}</span>
                `).join('') || '<span class="sub">Chưa có tag.</span>'}
        </div>
    `;
}


/* =========================================================
   HỘP THƯ FEEDBACK
========================================================= */

async function inbox() {
    await loadFb();

    const tags = [...new Set(S.fbs.flatMap(x => x.tags))];

    $('#main').innerHTML = `
        <div class="top">
            <div>
                <h1>Hộp thư feedback</h1>
                <p class="sub">Góp ý từ form, email, chat và cộng đồng</p>
            </div>

            <button class="btn" onclick="edit()">Thêm feedback</button>
        </div>

        <div class="bar">
            <input id="q" placeholder="Tìm theo tiêu đề hoặc nội dung…">

            <select id="fs">
                <option value="">Mọi trạng thái</option>
                ${Object.keys(ST).map(s => `
                    <option value="${s}">${stl(s)[0]}</option>
                `).join('')}
            </select>

            <select id="ft">
                <option value="">Mọi tag</option>
                ${tags.map(t => `
                    <option>${esc(t)}</option>
                `).join('')}
            </select>

            <select id="fo">
                <option value="v">Nhiều vote nhất</option>
                <option value="n">Mới nhất</option>
            </select>
        </div>

        <div class="card" style="padding:0" id="list"></div>
    `;

    redraw = () => {
        const q = $('#q').value.toLowerCase();
        const s = $('#fs').value;
        const t = $('#ft').value;

        const l = S.fbs
            .filter(x =>
                (!q || (x.title + x.desc).toLowerCase().includes(q)) &&
                (!s || x.status === s) &&
                (!t || x.tags.includes(t))
            )
            .sort((a, b) =>
                $('#fo').value === 'v'
                    ? b.votes - a.votes
                    : new Date(b.at) - new Date(a.at)
            );

        $('#list').innerHTML = l.map(x => `
            <div class="row" onclick="location.hash='#/detail/${x.id}'">

                <button class="vote" onclick="vote(event,${x.id})">
                    ▲ ${x.votes}
                    <small>vote</small>
                </button>

                <div class="t">
                    <b>${esc(x.title)}</b>

                    <span>
                        ${esc(x.by)}
                        ${x.at ? ' · ' + fdate(x.at) : ''}
                        ${x.src ? ' · ' + esc(x.src) : ''}
                    </span>

                    <div>
                        ${x.tags.map(t => `
                            <span class="tag">${esc(t)}</span>
                        `).join('')}
                    </div>
                </div>

                ${chip(x.status)}
            </div>
        `).join('') || `
            <p class="empty">
                Không có feedback phù hợp. Thử đổi bộ lọc hoặc thêm feedback mới.
            </p>
        `;
    };

    ['q', 'fs', 'ft', 'fo'].forEach(i => {
        $('#' + i).oninput = redraw;
    });

    redraw();
}


/* =========================================================
   BÌNH CHỌN
   Backend sử dụng API /binhchon/
========================================================= */

 
const vote = safe(async (e, id) => {
    e.stopPropagation();

    const role = getRole();

    if (!['CS', 'Product'].includes(role)) {
        toast('Bạn không có quyền Vote.', true);
        return;
    }

    // Kiểm tra tài khoản đã Vote feedback này chưa
    const myVote = S.votes.find(v =>
        Number(v.ma_phan_hoi) === Number(id) &&
        Number(v.ma_tai_khoan) === Number(S.user.ma_tai_khoan)
    );

    if (myVote) {
        // Đã Vote thì xóa Vote
        await api(CFG.EP.vote + myVote.ma_binh_chon + '/', {
            method: 'DELETE'
        });
    } else {
        // Chưa Vote thì tạo Vote
        await api(CFG.EP.vote, {
            method: 'POST',
            body: {
                ma_phan_hoi: id
            }
        });
    }

    await loadVotes();
    await loadFb();

    if (CUR?.id === id) {
        CUR = S.fbs.find(x => Number(x.id) === Number(id));
    }

    if (redraw) {
        redraw();
    } else {
        route();
    }

    toast(myVote ? 'Đã gỡ Vote.' : 'Đã ghi nhận Vote.');
});



/* =========================================================
   CHI TIẾT FEEDBACK
========================================================= */

async function detail(id) {
    await loadTags();
    await loadVotes();

    const data = await api(CFG.EP.fb + id + '/');

    CUR = nf(data);

    const st = isStaff();

    const canAssign = canAssignTags();

const availableTags = S.tags.filter(t =>
    Number(t.ma_san_pham) === Number(CUR.productId)
);

    $('#main').innerHTML = `
        <a class="back" href="#/inbox">← Về hộp thư</a>

        <div class="split">
            <div class="card">
                <h1>${esc(CUR.title)}</h1>

                <p class="sub">
                    ${esc(CUR.by)}
                    ${CUR.at ? ' · ' + fdate(CUR.at) : ''}
                    ${CUR.src ? ' · ' + esc(CUR.src) : ''}
                </p>

                <p class="body">
                    ${esc(CUR.desc) || 'Chưa có mô tả.'}
                </p>

                <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <button class="btn ghost" onclick="edit(true)">
                        Chỉnh sửa
                    </button>

                    <button class="btn bad" onclick="del()">
                        Xóa
                    </button>
                </div>
            </div>

            <div class="card">
                <label style="margin-top:0">Trạng thái</label>

                ${st ? `
                    <select onchange="patch({trang_thai:this.value})">
                        ${Object.keys(ST).map(s => `
                            <option value="${s}" ${s === CUR.status ? 'selected' : ''}>
                                ${stl(s)[0]}
                            </option>
                        `).join('')}
                    </select>
                ` : chip(CUR.status)}

                <label>Tag</label>

<div>
    ${CUR.tagIds.map(id => {
        const tag = S.tags.find(
            x => Number(x.ma_tag) === Number(id)
        );

        if (!tag) return '';

        return `
            <span class="tag">
                ${esc(tag.ten_tag)}

                ${canAssign ? `
                    <u onclick="rmTag(${Number(id)})">×</u>
                ` : ''}
            </span>
        `;
    }).join('') || '<span class="sub">Chưa có tag</span>'}
</div>

${canAssign ? `
    <select id="tagSelect" style="margin-top:8px">
        <option value="">-- Chọn Tag để gắn --</option>

        ${availableTags
            .filter(t =>
    !CUR.tagIds.some(id => Number(id) === Number(t.ma_tag))
)
            .map(t => `
                <option value="${t.ma_tag}">
                    ${esc(t.ten_tag)}
                </option>
            `).join('')}
    </select>

    <button class="btn" onclick="addTag()"
        style="margin-top:6px">
        Thêm Tag
    </button>
` : ''}

                <label>Lượt vote</label>

                <button class="vote" style="width:100%"
                    onclick="vote(event,${CUR.id})">
                    ▲ ${CUR.votes} · Vote cho feedback này
                </button>
            </div>
        </div>
    `;
}


/* =========================================================
   CẬP NHẬT FEEDBACK
========================================================= */

const patch = safe(async b => {
    await api(CFG.EP.fb + CUR.id + '/', {
        method: 'PATCH',
        body: b
    });

    toast('Đã cập nhật');
    route();
});


/* =========================================================
   QUẢN LÝ TAG
   Tag là bảng riêng, feedback lưu danh sách ma_tag
========================================================= */

const addTag = safe(async () => {
    if (!canAssignTags()) {
        toast('Bạn không có quyền gắn Tag.', true);
        return;
    }

    const select = document.querySelector('#tagSelect');
    const tagId = Number(select?.value);

    if (!tagId) {
        toast('Vui lòng chọn Tag.', true);
        return;
    }

    if (CUR.tagIds.some(id => Number(id) === tagId)) {
        toast('Feedback đã có Tag này.', true);
        return;
    }

    const ids = [...CUR.tagIds, tagId];

    await api(CFG.EP.fb + CUR.id + '/', {
        method: 'PATCH',
        body: { tags: ids }
    });

    toast('Đã gắn Tag');
    await detail(CUR.id);
});


const rmTag = safe(async tagId => {
    if (!canAssignTags()) {
        toast('Bạn không có quyền gỡ Tag.', true);
        return;
    }

    const ids = CUR.tagIds.filter(id =>
        Number(id) !== Number(tagId)
    );

    if (ids.length === CUR.tagIds.length) return;

    await api(CFG.EP.fb + CUR.id + '/', {
        method: 'PATCH',
        body: {
            tags: ids
        }
    });

    toast('Đã gỡ Tag khỏi feedback');
    await detail(CUR.id);
});


/* =========================================================
   XÓA FEEDBACK
========================================================= */

const del = safe(async () => {
    if (!confirm('Xóa feedback này?')) return;

    await api(CFG.EP.fb + CUR.id + '/', {
        method: 'DELETE'
    });

    toast('Đã xóa');
    location.hash = '#/inbox';
});


/* =========================================================
   THÊM / CHỈNH SỬA FEEDBACK
========================================================= */

async function edit(isEdit) {
    const x = isEdit
        ? CUR
        : {
            title: '',
            desc: '',
            tags: [],
            status: 'Pending',
            productId: S.products[0]?.ma_san_pham
        };

    if (!isEdit) {
        try {
            await loadProducts();
        } catch (e) {}
    }

    modal(`
        <h3>${isEdit ? 'Chỉnh sửa feedback' : 'Thêm feedback'}</h3>

        <form onsubmit="save(event,${!!isEdit})">

            <label style="margin-top:0">Tiêu đề</label>
            <input name="title" required value="${esc(x.title)}">

            <label>Nội dung</label>
            <textarea name="description" rows="5">${esc(x.desc)}</textarea>

            <label>Người gửi</label>
            <input name="sender" value="${esc(x.by || '')}"
                placeholder="Tên người gửi">

            <label>Email người gửi</label>
            <input name="email" type="email" value="${esc(x.email || '')}"
                placeholder="Email người gửi">

            <label>Nguồn tiếp nhận</label>
            <select name="source">
                ${['Form', 'Email', 'Chat', 'Community'].map(s => `
                    <option value="${s}" ${s === x.src ? 'selected' : ''}>
                        ${s}
                    </option>
                `).join('')}
            </select>

            ${!isEdit ? `
                <label>Sản phẩm</label>
                <select name="productId" required>
                    ${S.products.map(p => `
                        <option value="${p.ma_san_pham}"
                            ${Number(p.ma_san_pham) === Number(x.productId) ? 'selected' : ''}>
                            ${esc(p.ten_san_pham)}
                        </option>
                    `).join('')}
                </select>
            ` : ''}


            ${isStaff() ? `
                <label>Trạng thái</label>
                <select name="status">
                    ${Object.keys(ST).map(s => `
                        <option value="${s}" ${s === x.status ? 'selected' : ''}>
                            ${stl(s)[0]}
                        </option>
                    `).join('')}
                </select>
            ` : ''}

            <div style="display:flex;gap:8px;margin-top:18px">
                <button class="btn">Lưu</button>
                <button type="button" class="btn ghost" onclick="closeM()">Hủy</button>
            </div>
        </form>
    `);
}


const save = safe(async (e, isEdit) => {
    e.preventDefault();

    const f = Object.fromEntries(new FormData(e.target));

    const productId = isEdit
        ? CUR.productId
        : Number(f.productId);

    const body = {
        tieu_de: f.title,
        noi_dung: f.description,
        ten_nguoi_gui: f.sender,
        email_nguoi_gui: f.email,
        nguon_tiep_nhan: f.source
    };

    if (!isEdit) {
        body.ma_san_pham = productId;
    }

    if (f.status) {
        body.trang_thai = f.status;
    }



    await api(
        CFG.EP.fb + (isEdit ? CUR.id + '/' : ''),
        {
            method: isEdit ? 'PATCH' : 'POST',
            body
        }
    );

    closeM();
    toast('Đã lưu feedback');
    route();
});