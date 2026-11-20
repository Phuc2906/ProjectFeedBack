/* =========================================================
   ROADMAP
   Lấy dữ liệu thực từ API /roadmap/
========================================================= */

async function roadmap() {
    await loadRoadmaps();

    const st = isStaff();

    let mode = st && ls('rm') === 'pri'
        ? 'pri'
        : 'pub';

    const draw = () => {
        const data = S.roadmaps.filter(x =>
            mode === 'pri' || x.cong_khai === true
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
                    ? 'Bản nội bộ: gồm cả công việc chưa công khai'
                    : 'Bản công khai: những gì khách hàng được xem'
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
