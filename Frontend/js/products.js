const API_URL = 'https://projectfeedback.onrender.com/api';

const CHAT_TOKEN_KEY = 'projectfeedback_chat_token';

let chatToken = localStorage.getItem(CHAT_TOKEN_KEY);
let chatPolling = null;


// =========================================================
// 1. TẢI DANH SÁCH SẢN PHẨM
// =========================================================

async function loadProducts() {
    const productList = document.getElementById('productList');
    const chatProduct = document.getElementById('chatProduct');

    try {
        const response = await fetch(`${API_URL}/public/sanpham/`);

        if (!response.ok) {
            throw new Error('Không thể tải sản phẩm');
        }

        const products = await response.json();

        productList.innerHTML = '';
        chatProduct.innerHTML = '<option value="">Chọn sản phẩm</option>';

        if (products.length === 0) {
            productList.innerHTML =
                '<p>Hiện chưa có sản phẩm nào.</p>';
            return;
        }

        products.forEach(product => {

            // Hiển thị sản phẩm
            const card = document.createElement('div');
            card.className = 'product-card';

            const title = document.createElement('h3');
            title.textContent = product.ten_san_pham;

            const description = document.createElement('p');
            description.textContent =
                product.mo_ta || 'Chưa có mô tả sản phẩm.';

            card.appendChild(title);
            card.appendChild(description);

            productList.appendChild(card);

            // Thêm sản phẩm vào form Chat
            const option = document.createElement('option');

            option.value = product.ma_san_pham;
            option.textContent = product.ten_san_pham;

            chatProduct.appendChild(option);
        });

    } catch (error) {
        console.error(error);

        productList.innerHTML =
            '<p>Không thể tải danh sách sản phẩm. Vui lòng thử lại.</p>';

        chatProduct.innerHTML =
            '<option value="">Không thể tải sản phẩm</option>';
    }
}


// =========================================================
// 2. MỞ / ĐÓNG CHAT
// =========================================================

const chatToggle = document.getElementById('chatToggle');
const chatClose = document.getElementById('chatClose');
const chatBox = document.getElementById('chatBox');

chatToggle.addEventListener('click', () => {
    chatBox.classList.toggle('hidden');
});

chatClose.addEventListener('click', () => {
    chatBox.classList.add('hidden');
});


// =========================================================
// 3. HIỂN THỊ KHUNG CHAT
// =========================================================

function showConversation() {

    document.getElementById('chatStart').classList.add('hidden');

    document.getElementById('chatConversation')
        .classList.remove('hidden');

    loadMessages();

    if (!chatPolling) {
        chatPolling = setInterval(loadMessages, 3000);
    }
}


// =========================================================
// 4. BẮT ĐẦU CUỘC TRÒ CHUYỆN
// =========================================================

document.getElementById('chatStartForm')
    .addEventListener('submit', async function (event) {

        event.preventDefault();

        const errorElement =
            document.getElementById('chatStartError');

        const button =
            document.getElementById('chatStartButton');

        errorElement.textContent = '';
        button.disabled = true;

        const data = {
            ma_san_pham:
                document.getElementById('chatProduct').value,

            ten_khach_hang:
                document.getElementById('chatName').value.trim(),

            email:
                document.getElementById('chatEmail').value.trim(),

            noi_dung:
                document.getElementById('chatFirstMessage').value.trim()
        };

        try {
            const response = await fetch(`${API_URL}/chat/start/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    JSON.stringify(result)
                );
            }

            chatToken = result.token_truy_cap;

            localStorage.setItem(CHAT_TOKEN_KEY, chatToken);

            document.getElementById('chatStartForm').reset();

            showConversation();

        } catch (error) {
            console.error(error);

            errorElement.textContent =
                'Không thể bắt đầu trò chuyện. Vui lòng thử lại.';
        } finally {
            button.disabled = false;
        }
    });


// =========================================================
// 5. TẢI TIN NHẮN
// =========================================================

async function loadMessages() {

    if (!chatToken) return;

    try {
        const response = await fetch(
            `${API_URL}/chat/customer/${chatToken}/`
        );

        // Token không hợp lệ
        if (response.status === 404) {

            localStorage.removeItem(CHAT_TOKEN_KEY);
            chatToken = null;

            clearInterval(chatPolling);
            chatPolling = null;

            document.getElementById('chatConversation')
                .classList.add('hidden');

            document.getElementById('chatStart')
                .classList.remove('hidden');

            return;
        }

        if (!response.ok) {
            throw new Error('Không thể tải tin nhắn');
        }

        const data = await response.json();

        const chatMessages =
            document.getElementById('chatMessages');

        const chatMessageForm =
            document.getElementById('chatMessageForm');

        chatMessages.innerHTML = '';

        data.tin_nhan.forEach(message => {

            const bubble = document.createElement('div');

            bubble.className =
                'chat-message ' +
                (message.nguoi_gui === 'Customer' ? 'customer' : 'cs');

            const content = document.createElement('div');
            content.textContent = message.noi_dung;

            const time = document.createElement('time');
            time.textContent = new Date(message.ngay_gui)
                .toLocaleString('vi-VN');

            bubble.appendChild(content);
            bubble.appendChild(time);

            chatMessages.appendChild(bubble);
        });

        if (data.trang_thai === 'Closed') {

            chatMessageForm.classList.add('hidden');

            document.getElementById('chatMessageError').textContent =
                'Cuộc trò chuyện đã kết thúc.';

        } else {

            chatMessageForm.classList.remove('hidden');

            document.getElementById('chatMessageError').textContent = '';
        }

        chatMessages.scrollTop = chatMessages.scrollHeight;

    } catch (error) {
        console.error(error);
    }
}
// =========================================================
// 6. KHÁCH GỬI TIN NHẮN
// =========================================================

document.getElementById('chatMessageForm')
    .addEventListener('submit', async function (event) {

        event.preventDefault();

        const input =
            document.getElementById('chatMessageInput');

        const errorElement =
            document.getElementById('chatMessageError');

        const noiDung = input.value.trim();

        if (!noiDung || !chatToken) return;

        errorElement.textContent = '';

        try {
            const response = await fetch(
                `${API_URL}/chat/customer/${chatToken}/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        noi_dung: noiDung
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || 'Không thể gửi tin nhắn'
                );
            }

            input.value = '';

            await loadMessages();

        } catch (error) {
            console.error(error);

            errorElement.textContent =
                error.message || 'Gửi tin nhắn thất bại.';
        }
    });


// =========================================================
// 7. KHÔI PHỤC CUỘC TRÒ CHUYỆN CŨ
// =========================================================

if (chatToken) {
    showConversation();
}


/* =========================================================
   8. TẢI ROADMAP CÔNG KHAI
========================================================= */

async function loadPublicRoadmap() {
    const container = document.getElementById('publicRoadmap');

    try {
        const response = await fetch(`${API_URL}/roadmap/`);

        if (!response.ok) {
            throw new Error('Không thể tải Roadmap');
        }

        const result = await response.json();

const roadmaps = Array.isArray(result)
    ? result
    : (result.results || []);

// Chỉ hiển thị công việc Public
const data = roadmaps.filter(x => x.cong_khai === true);

        const cols = [
            ['Pending', 'Chờ xử lý'],
            ['In Progress', 'Đang thực hiện'],
            ['Done', 'Hoàn thành']
        ];

        container.innerHTML = `
            <div class="public-roadmap-grid">
                ${cols.map(([status, label]) => {
                    const list = data.filter(
                        x => x.trang_thai === status
                    );

                    return `
                        <div class="public-roadmap-column">
                            <h3>${label} (${list.length})</h3>

                            ${list.map(x => `
                                <div class="public-roadmap-card">
                                    <b>${escapeHTML(x.ten_cong_viec)}</b>
                                    <p>Ưu tiên: ${x.do_uu_tien}</p>
                                </div>
                            `).join('') || '<p>Chưa có công việc.</p>'}
                        </div>
                    `;
                }).join('')}
            </div>
        `;

    } catch (error) {
        console.error(error);
        container.innerHTML =
            '<p>Không thể tải Roadmap. Vui lòng thử lại.</p>';
    }
}

function escapeHTML(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}



// =========================================================
// 8. KHỞI ĐỘNG
// =========================================================

loadProducts();
loadPublicRoadmap();