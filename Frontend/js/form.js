const API_URL = 'http://127.0.0.1:8000/api';

async function loadProducts() {
    const productSelect = document.getElementById('productSelect');

    try {
        const response = await fetch(`${API_URL}/public/sanpham/`);

        if (!response.ok) {
            throw new Error('Không thể tải danh sách sản phẩm');
        }

        const products = await response.json();

        productSelect.innerHTML = '<option value="">-- Chọn sản phẩm --</option>';

        products.forEach(product => {
            const option = document.createElement('option');

            option.value = product.ma_san_pham;
            option.textContent = product.ten_san_pham;

            productSelect.appendChild(option);
        });

    } catch (error) {
        console.error(error);
        productSelect.innerHTML = '<option value="">Không tải được sản phẩm</option>';
    }
}

loadProducts();

const feedbackForm = document.getElementById('feedbackForm');

feedbackForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const formData = new FormData(feedbackForm);

    const feedbackData = {
        ten_nguoi_gui: formData.get('ten_nguoi_gui'),
        email_nguoi_gui: formData.get('email_nguoi_gui'),
        ma_san_pham: Number(formData.get('ma_san_pham')),
        tieu_de: formData.get('tieu_de'),
        noi_dung: formData.get('noi_dung'),
        nguon_tiep_nhan: 'Form'
    };

    try {
        const response = await fetch(`${API_URL}/phanhoi/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(feedbackData)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error(result);
            alert('Gửi phản hồi thất bại!');
            return;
        }

        alert('Gửi phản hồi thành công!');
        feedbackForm.reset();
        loadProducts();

    } catch (error) {
        console.error(error);
        alert('Không thể kết nối đến máy chủ!');
    }
});