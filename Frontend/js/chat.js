
/* =========================================================
   HỘP THƯ CHAT - CS
========================================================= */

let chatPolling = null;
let selectedChatId = null;
let chatListData = [];
let chatMessageData = [];


/* =========================================================
   1. GIAO DIỆN HỘP THƯ CHAT
========================================================= */

async function chat() {

    // Dừng polling cũ nếu chuyển trang
    if (chatPolling) {
        clearInterval(chatPolling);
        chatPolling = null;
    }

    selectedChatId = null;
    chatListData = [];
    chatMessageData = [];

    $('#main').innerHTML = `
        <div class="top">
            <div>
                <h1>Hộp thư Chat</h1>
                <p class="sub">
                    Trao đổi trực tiếp với khách hàng
                </p>
            </div>
        </div>

        <div class="chat-admin">
            <div class="card chat-list">
                <div class="chat-panel-title">
                    <h3>Cuộc trò chuyện</h3>
                    <span id="chatCount">0</span>
                </div>

                <div id="chatList">
                    <p class="empty">Đang tải cuộc trò chuyện...</p>
                </div>
            </div>

            <div class="card chat-detail">
                <div id="chatDetail">
                    <p class="empty">
                        Chọn một cuộc trò chuyện để xem tin nhắn.
                    </p>
                </div>
            </div>
        </div>
    `;

    await loadChatList();

    // Cập nhật dữ liệu mỗi 3 giây
    chatPolling = setInterval(async () => {

    // Đã đăng xuất thì dừng polling
    if (!S.token) {
        clearInterval(chatPolling);
        chatPolling = null;
        return;
    }

    await loadChatList();

    if (selectedChatId) {
        await loadChatMessages(selectedChatId);
    }

}, 3000);

    // Chọn cuộc trò chuyện
    
$('#main').onclick = async e => {

    const item = e.target.closest('[data-chat-id]');

    if (!item) return;

    const id = Number(item.dataset.chatId);

    // Click lại cuộc trò chuyện đang mở thì đóng khung
    if (selectedChatId === id) {
        selectedChatId = null;

        $('#chatDetail').innerHTML = `
            <p class="empty">
                Chọn một cuộc trò chuyện để xem tin nhắn.
            </p>
        `;

        await loadChatList();
        return;
    }

    // Click cuộc trò chuyện khác thì mở
    selectedChatId = id;

    await loadChatList();
    await loadChatMessages(id);
};


    // Gửi tin nhắn
    $('#main').onsubmit = async e => {

        if (e.target.id !== 'chatReplyForm') return;

        e.preventDefault();

        if (!selectedChatId) return;

        const input = $('#chatReplyInput');
        const noiDung = input.value.trim();

        if (!noiDung) return;

        const button = e.target.querySelector('button');
        button.disabled = true;

        try {

            await api(`/chat/cs/${selectedChatId}/`, {
                method: 'POST',
                body: {
                    noi_dung: noiDung
                }
            });

            input.value = '';

            await loadChatList();
            await loadChatMessages(selectedChatId);

        } catch (error) {

            toast(error.message, true);

        } finally {

            button.disabled = false;
        }
    };
}


/* =========================================================
   2. TẢI DANH SÁCH CUỘC TRÒ CHUYỆN
========================================================= */

async function loadChatList() {

    try {

        chatListData = await api('/chat/cs/');

        const list = $('#chatList');
        const count = $('#chatCount');

        if (!list) return;

        count.textContent = chatListData.length;

        if (!chatListData.length) {

            list.innerHTML = `
                <p class="empty">
                    Chưa có cuộc trò chuyện nào.
                </p>
            `;

            return;
        }

        list.innerHTML = chatListData.map(item => `

            <div class="chat-item
                ${selectedChatId === item.ma_cuoc_tro_chuyen ? 'active' : ''}"
                data-chat-id="${item.ma_cuoc_tro_chuyen}">

                <div class="chat-item-top">
                    <b>${esc(item.ten_khach_hang)}</b>

                    <span class="chat-status
                        ${item.trang_thai === 'Open' ? 'open' : 'closed'}">
                        ${item.trang_thai === 'Open' ? 'Đang mở' : 'Đã đóng'}
                    </span>
                </div>

                <p>${esc(item.ten_san_pham)}</p>

                <small>${esc(item.email)}</small>

                <small>
                    ${new Date(item.ngay_cap_nhat).toLocaleString('vi-VN')}
                </small>

            </div>

        `).join('');

    } catch (error) {

        console.error('Lỗi tải danh sách chat:', error);

        const list = $('#chatList');

        if (list) {
            list.innerHTML = `
                <p class="empty">
                    Không thể tải danh sách trò chuyện.
                </p>
            `;
        }
    }
}


/* =========================================================
   3. TẢI TIN NHẮN
========================================================= */

async function loadChatMessages(id) {

    try {

        const data = await api(`/chat/cs/${id}/`);

        // Không cập nhật nếu người dùng đã chọn cuộc trò chuyện khác
        if (selectedChatId !== id) return;

        chatMessageData = data.tin_nhan;

        renderChatMessages(data);

    } catch (error) {

        console.error('Lỗi tải tin nhắn:', error);

        const detail = $('#chatDetail');

        if (detail) {
            detail.innerHTML = `
                <p class="empty">
                    Không thể tải tin nhắn.
                </p>
            `;
        }
    }
}


/* =========================================================
   4. HIỂN THỊ CHI TIẾT CUỘC TRÒ CHUYỆN
========================================================= */


function renderChatMessages(data) {

    const detail = $('#chatDetail');

    if (!detail) return;

    const conversation = chatListData.find(
        item => item.ma_cuoc_tro_chuyen === selectedChatId
    );

    if (!conversation) return;

    const oldMessages = $('#chatMessageArea');

    const shouldScroll = !oldMessages ||
        oldMessages.scrollHeight - oldMessages.scrollTop -
        oldMessages.clientHeight < 80;

    // Chỉ tạo giao diện lần đầu hoặc khi thông tin thay đổi
    if (!oldMessages) {

        detail.innerHTML = `

            <div class="chat-detail-header">
                <div>
                    <h3>${esc(conversation.ten_khach_hang)}</h3>
                    <p>${esc(conversation.email)}</p>
                    <small>Sản phẩm: ${esc(conversation.ten_san_pham)}</small>
                </div>

                <span class="chat-status
                    ${data.trang_thai === 'Open' ? 'open' : 'closed'}">
                    ${data.trang_thai === 'Open' ? 'Đang mở' : 'Đã đóng'}
                </span>
            </div>

            <div id="chatMessageArea" class="chat-message-area"></div>

            <form id="chatReplyForm" class="chat-reply-form">
                <input
                    type="text"
                    id="chatReplyInput"
                    placeholder="Nhập tin nhắn..."
                    autocomplete="off"
                    required
                >
                <button type="submit" class="btn">Gửi</button>
            </form>

        `;
    }

    // Cập nhật trạng thái
    const status = detail.querySelector('.chat-status');

    if (status) {
        status.className = `chat-status ${
            data.trang_thai === 'Open' ? 'open' : 'closed'
        }`;

        status.textContent =
            data.trang_thai === 'Open' ? 'Đang mở' : 'Đã đóng';
    }

    // Cập nhật nội dung tin nhắn
    const messageArea = $('#chatMessageArea');

    messageArea.innerHTML = data.tin_nhan.length
        ? data.tin_nhan.map(message => `

            <div class="chat-message
                ${message.nguoi_gui === 'CS' ? 'cs' : 'customer'}">

                <div class="chat-bubble">
                    <small>
                        ${message.nguoi_gui === 'CS' ? 'CS' : 'Khách hàng'}
                    </small>

                    <p>${esc(message.noi_dung)}</p>

                    <time>
                        ${new Date(message.ngay_gui).toLocaleString('vi-VN')}
                    </time>
                </div>

            </div>

        `).join('')
        : '<p class="empty">Chưa có tin nhắn.</p>';

    // Đóng cuộc trò chuyện thì ẩn ô nhập
    const form = $('#chatReplyForm');

    if (data.trang_thai === 'Closed') {
        form?.remove();
    }

    if (messageArea && shouldScroll) {
        messageArea.scrollTop = messageArea.scrollHeight;
    }
}
