/* =========================================================
   INSIGHT AI
   Backend hiện chưa có API /ai/insights/
   Tạm giữ thuật toán phân tích cục bộ để giao diện vẫn dùng được.
========================================================= */

function localAI() {
    const stop = new Set(
        'của và các cho với một những được này khi trong không có để là the and for'.split(' ')
    );

    const tok = x => new Set(
        ((x.title + ' ' + x.desc).toLowerCase().match(/[\p{L}\d]+/gu) || [])
            .filter(w => w.length > 2 && !stop.has(w))
    );

    const f = S.fbs;
    const T = f.map(tok);
    const p = f.map((_, i) => i);

    const find = i => p[i] === i ? i : p[i] = find(p[i]);

    for (let i = 0; i < f.length; i++) {
        for (let j = i + 1; j < f.length; j++) {

            if (f[i].productId !== f[j].productId) continue;
            
            const sh = [...T[i]].filter(w => T[j].has(w)).length;
            const m = Math.min(T[i].size, T[j].size) || 1;

            if (
                sh / m >= 0.5 ||
                f[i].tags.some(t => f[j].tags.includes(t))
            ) {
                p[find(j)] = find(i);
            }
        }
    }

    const g = {};

    f.forEach((x, i) => {
        (g[find(i)] ??= []).push(x.id);
    });

    return Object.values(g).map(ids => {
        const m = ids.map(id => f.find(x => x.id === id));
        const tc = {};

        m.forEach(x => {
            x.tags.forEach(t => {
                tc[t] = (tc[t] || 0) + 1;
            });
        });

        const top = Object.entries(tc).sort((a, b) => b[1] - a[1])[0];

        return {
            title: top ? top[0] : m[0].title,
            summary: `${m.length} góp ý tương tự, tổng ${m.reduce((a, x) => a + x.votes, 0)} lượt vote. Ví dụ: “${m[0].title}”.`,
            ids
        };
    });
}

async function loadPromotedFeedbackIds() {
    try {
        const [roadmaps, details] = await Promise.all([
            api(CFG.EP.roadmap),
            api(CFG.EP.groupDetails)
        ]);

        // Lấy ID các nhóm AI đã có Roadmap
        const promotedGroupIds = new Set(
            arr(roadmaps).map(r => Number(r.ma_nhom))
        );

        // Lấy ID Feedback thuộc các nhóm đó
        return new Set(
            arr(details)
                .filter(d =>
                    promotedGroupIds.has(Number(d.ma_nhom))
                )
                .map(d => Number(d.ma_phan_hoi))
        );

    } catch (e) {
        console.error('Không tải được dữ liệu Roadmap:', e);
        throw e;
    }
}

async function ai() {
    await loadFb();

    $('#main').innerHTML = `
        <div class="top">
            <div>
                <h1>Insight bằng AI</h1>
                <p class="sub">
                    Gom feedback trùng lặp, tóm tắt insight và đề xuất mức ưu tiên
                </p>
            </div>

            <button class="btn" id="run">
                Phân tích ${S.fbs.length} feedback
            </button>
        </div>

        <div id="out"></div>
    `;

    $('#run').onclick = async () => {
        const b = $('#run');

        b.disabled = true;
        b.textContent = 'Đang phân tích…';

        // Hiện tại chưa có API AI trong Backend.
        // Dùng localAI để giữ chức năng phân tích trên giao diện.
        let cl;

try {
    cl = localAI();

    const promotedFeedbackIds = await loadPromotedFeedbackIds();

    cl.forEach(c => {
        c.promotedCount = c.ids.filter(id =>
            promotedFeedbackIds.has(Number(id))
        ).length;

        c.promoted = c.promotedCount > 0;
    });

} catch (e) {
    toast('Không tải được trạng thái Roadmap: ' + e.message, true);
    b.disabled = false;
    b.textContent = 'Phân tích lại';
    return;
}

        cl.forEach(c => {
            const m = c.ids
                .map(id => S.fbs.find(x => x.id === id))
                .filter(Boolean);

            c.items = m;
            c.votes = m.reduce((a, x) => a + x.votes, 0);
            c.score = c.votes + 2 * m.length;
        });

        const mx = Math.max(1, ...cl.map(c => c.score));

        cl.sort((a, b) => b.score - a.score);

        cl.forEach(c => {
            c.priority = c.score >= 0.66 * mx
                ? 'high'
                : c.score >= 0.33 * mx
                    ? 'medium'
                    : 'low';
        });

        const P = {
            high: ['Ưu tiên cao', '#d6455d', '#fdebee'],
            medium: ['Ưu tiên vừa', '#b7791f', '#fff4dc'],
            low: ['Ưu tiên thấp', '#64708a', '#eef1f6']
        };

        window.CL = cl;

        $('#out').innerHTML = `
            <p class="sub">
                Đang sử dụng phân tích cục bộ theo từ khóa và tag.
                Chưa kết nối AI Backend.
            </p>

            <div class="grid">
                ${cl.map((c, i) => {
                    const p = P[c.priority] || P.low;

                    return `
                        <div class="card">
                            <div class="top">
                                <h3>${esc(c.title)}</h3>

                                <span class="chip"
                                    style="color:${p[1]};background:${p[2]}">
                                    ${p[0]}
                                </span>
                            </div>

                            <p>${esc(c.summary)}</p>

                            <p class="sub" style="margin:8px 0">
                                ${c.items.length} feedback · ${c.votes} lượt vote
                            </p>

                            ${c.items.map(x => `
                                <a class="mini" href="#/detail/${x.id}">
                                    <b>▲ ${x.votes}</b>
                                    <span>${esc(x.title)}</span>
                                </a>
                            `).join('')}

                            ${getRole() === 'Product' ? `
    <button class="btn" style="margin-top:12px"
        id="promote-${i}"
        onclick="promoteAIGroup(${i})"
        ${c.promoted ? 'disabled' : ''}>
        ${c.promoted
            ? (c.promotedCount === c.ids.length
                ? 'Đã đưa vào Roadmap'
                : 'Có Feedback đã vào Roadmap')
            : 'Đưa vào Roadmap'}
    </button>
` : ''}

<button class="btn ghost" style="margin-top:12px"
    onclick="draft(${i})">
    Tạo nháp phản hồi khách hàng
</button>
                        </div>
                    `;
                }).join('') || '<p class="empty">Chưa có feedback để phân tích.</p>'}
            </div>
        `;

        b.disabled = false;
        b.textContent = 'Phân tích lại';
    };
}


/* =========================================================
   ĐƯA NHÓM AI VÀO ROADMAP
========================================================= */

async function promoteAIGroup(i) {
    const c = window.CL?.[i];

    if (!c || !c.items?.length) {
        toast('Không tìm thấy nhóm feedback.', true);
        return;
    }

    if (getRole() !== 'Product') {
        toast('Chỉ Product mới được đưa vào Roadmap.', true);
        return;
    }

    if (c.promoted) {
        toast('Nhóm này đã được đưa vào Roadmap rồi.', true);
        return;
    }

    const ok = confirm(
        `Đưa nhóm "${c.title}" gồm ${c.items.length} feedback vào Roadmap?`
    );

    if (!ok) return;

    const b = document.getElementById(`promote-${i}`);
    if (b) {
        b.disabled = true;
        b.textContent = 'Đang xử lý...';
    }

    try {
        await api(CFG.EP.promoteAI, {
            method: 'POST',
            body: {
                ma_san_pham: c.items[0].productId,
                ma_phan_hoi: c.ids,
                ten_nhom: c.title,
                mo_ta: c.summary,
                ten_cong_viec: `Cải thiện: ${c.title}`,
                do_uu_tien: c.priority === 'high' ? 3
                    : c.priority === 'medium' ? 2 : 1,
                cong_khai: false
            }
        });

        c.promoted = true;
        c.promotedCount = c.ids.length;

        if (b) {
            b.textContent = 'Đã đưa vào Roadmap';
            b.disabled = true;
        }

        toast('Đã đưa nhóm feedback vào Roadmap!');

    } catch (e) {
        if (b) {
            b.disabled = false;
            b.textContent = 'Đưa vào Roadmap';
        }

        toast(e.message, true);
    }
}


/* =========================================================
   TẠO NHÁP PHẢN HỒI KHÁCH HÀNG
========================================================= */

function draft(i) {
    const c = CL[i];

    const t = `Chào bạn,

Cảm ơn bạn đã góp ý về "${c.title}". Chúng mình đã ghi nhận ý kiến của bạn cùng ${Math.max(0, c.items.length - 1)} góp ý tương tự và đang xem xét để đưa vào kế hoạch phát triển.

Chúng mình sẽ cập nhật tiến độ trên roadmap và thông báo ngay khi có thay đổi.

Trân trọng,
Đội sản phẩm`;

    modal(`
        <h3>Nháp phản hồi</h3>

        <textarea id="dt" rows="10">${esc(t)}</textarea>

        <div style="display:flex;gap:8px;margin-top:16px">
            <button class="btn" onclick="copyDraft()">Sao chép</button>
            <button class="btn ghost" onclick="closeM()">Đóng</button>
        </div>
    `);
}


function copyDraft() {
    const text = $('#dt').value;

    navigator.clipboard.writeText(text)
        .then(() => toast('Đã sao chép'))
        .catch(() => toast('Không thể sao chép nội dung', true));
}
