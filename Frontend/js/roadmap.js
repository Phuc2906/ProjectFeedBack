
/* =========================================================
   ROADMAP
   Lấy dữ liệu thực từ API /roadmap/
========================================================= */

async function roadmap() {
    await loadRoadmaps();

    const st = isStaff();
    const isDev = getRole() === 'Dev';
    const isProduct = getRole() === 'Product';

    let mode = st && ls('rm') === 'pri'
        ? 'pri'
        : 'pub';

    const draw = () => {
        const data = S.roadmaps.filter(x =>
    mode === 'pri'
        ? x.cong_khai === false
        : x.cong_khai === true
);

        const cols = [
            ['Pending', 'Chờ xử lý'],
            ['In Progress', 'Đang thực hiện'],
            ['Done', 'Hoàn thành']
        ];

        $('#main').innerHTML = `
            <h1>Roadmap</h1>

            <p class="sub">
                ${mode === 'pri'
                    ? 'Bản nội bộ: chỉ gồm công việc Private'
                    : 'Bản công khai: chỉ gồm công việc Public'
                }
            </p>

            ${st ? `
                <div class="seg">
                    <button class="${mode === 'pub' ? 'on' : ''}"
                        onclick="rm('pub')">Public</button>

                    <button class="${mode === 'pri' ? 'on' : ''}"
                        onclick="rm('pri')">Private</button>
                </div>
            ` : ''}

            <div class="kan">
                ${cols.map(([status, label]) => {
                    const list = data.filter(x => x.trang_thai === status);

                    return `
                        <div class="col">
                            <h3>
                                ${chip(status)}
                                <span>${list.length}</span>
                            </h3>

                            ${list.map(x => `
                                <div class="kc">
                                    <b>${esc(x.ten_cong_viec)}</b>
                                    <br>
                                    <small>
    Ưu tiên: ${x.do_uu_tien}
    · ${x.cong_khai ? 'Public' : 'Private'}
</small>

${isProduct ? `
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button
            type="button"
            onclick="toggleRoadmapVisibility(${x.ma_roadmap}, this)"
            style="
                padding:9px 18px;
                border:none;
                border-radius:12px;
                background:#eeebff;
                color:#4058e8;
                font-size:14px;
                font-weight:600;
                cursor:pointer;
            "
            onmouseover="this.style.background='#e2ddff'"
            onmouseout="this.style.background='#eeebff'">
            Chuyển sang ${x.cong_khai ? 'Private' : 'Public'}
        </button>

        <button
            type="button"
            onclick="deleteRoadmap(${x.ma_roadmap}, this)"
            style="
                padding:9px 18px;
                border:none;
                border-radius:12px;
                background:#fee2e2;
                color:#b91c1c;
                font-size:14px;
                font-weight:600;
                cursor:pointer;
            "
            onmouseover="this.style.background='#fecaca'"
            onmouseout="this.style.background='#fee2e2'">
            Xóa
        </button>
    </div>
` : ''}

                                    ${isDev ? `
                                        <div style="margin-top:12px">
                                            <label>Trạng thái công việc</label>
                                            <select
                                                style="width:100%;margin-top:5px"
                                                value="${esc(x.trang_thai)}"
                                                onchange="updateRoadmapStatus(${x.ma_roadmap}, this)">
                                                <option value="Pending"
                                                    ${x.trang_thai === 'Pending' ? 'selected' : ''}>
                                                    Chờ xử lý
                                                </option>
                                                <option value="In Progress"
                                                    ${x.trang_thai === 'In Progress' ? 'selected' : ''}>
                                                    Đang thực hiện
                                                </option>
                                                <option value="Done"
                                                    ${x.trang_thai === 'Done' ? 'selected' : ''}>
                                                    Hoàn thành
                                                </option>
                                            </select>
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('') || '<p class="empty">Trống</p>'}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    };

    window.rm = m => {
        mode = m;
        ls('rm', m);
        draw();
    };

    draw();
}


/* =========================================================
   DEV CẬP NHẬT TRẠNG THÁI ROADMAP
========================================================= */

async function updateRoadmapStatus(id, select) {
    if (getRole() !== 'Dev') {
        toast('Chỉ Dev mới được cập nhật trạng thái.', true);
        return;
    }

    const item = S.roadmaps.find(x =>
        Number(x.ma_roadmap) === Number(id)
    );

    if (!item) {
        toast('Không tìm thấy công việc Roadmap.', true);
        return;
    }

    const oldStatus = item.trang_thai;
    const newStatus = select.value;

    const allowed = ['Pending', 'In Progress', 'Done'];

    if (!allowed.includes(newStatus)) {
        toast('Trạng thái không hợp lệ.', true);
        select.value = oldStatus;
        return;
    }

    if (newStatus === oldStatus) return;

    select.disabled = true;

    try {
        await api(CFG.EP.roadmap + id + '/', {
            method: 'PATCH',
            body: {
                trang_thai: newStatus
            }
        });

        item.trang_thai = newStatus;

        toast('Cập nhật trạng thái thành công!');

        // Tải lại Roadmap để công việc chuyển sang cột mới
        await roadmap();

    } catch (e) {
        toast(e.message, true);
        select.value = oldStatus;
        select.disabled = false;
    }
}

/* =========================================================
   PRODUCT CHUYỂN PUBLIC / PRIVATE
========================================================= */

async function toggleRoadmapVisibility(id, button) {
    if (getRole() !== 'Product') {
        toast('Chỉ Product mới được đổi chế độ hiển thị.', true);
        return;
    }

    const item = S.roadmaps.find(x =>
        Number(x.ma_roadmap) === Number(id)
    );

    if (!item) {
        toast('Không tìm thấy công việc Roadmap.', true);
        return;
    }

    const newVisibility = !item.cong_khai;

    button.disabled = true;

    try {
        await api(CFG.EP.roadmap + id + '/', {
            method: 'PATCH',
            body: {
                cong_khai: newVisibility
            }
        });

        item.cong_khai = newVisibility;

        toast(
            newVisibility
                ? 'Đã chuyển Roadmap sang Public!'
                : 'Đã chuyển Roadmap sang Private!'
        );

        await roadmap();

    } catch (e) {
        toast(e.message || 'Không thể đổi chế độ hiển thị.', true);
        button.disabled = false;
    }
}

/* =========================================================
   PRODUCT XÓA ROADMAP
========================================================= */

async function deleteRoadmap(id, button) {
    if (getRole() !== 'Product') {
        toast('Chỉ Product mới được xóa Roadmap.', true);
        return;
    }

    const item = S.roadmaps.find(x =>
        Number(x.ma_roadmap) === Number(id)
    );

    if (!item) {
        toast('Không tìm thấy công việc Roadmap.', true);
        return;
    }

    const confirmed = confirm(
        `Bạn có chắc muốn xóa công việc "${item.ten_cong_viec}" khỏi Roadmap không?\n\n` +
        `Lưu ý: Chỉ xóa công việc Roadmap. Nhóm AI và các Feedback liên quan vẫn được giữ nguyên.`
    );

    if (!confirmed) return;

    button.disabled = true;

    try {
        await api(CFG.EP.roadmap + id + '/', {
            method: 'DELETE'
        });

        toast('Đã xóa công việc khỏi Roadmap!');

        await roadmap();

    } catch (e) {
        toast(e.message || 'Không thể xóa công việc Roadmap.', true);
        button.disabled = false;
    }
}
