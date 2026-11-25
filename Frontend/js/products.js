
const API_URL = 'https://projectfeedback.onrender.com/api';

async function loadProducts() {
    const productList = document.getElementById('productList');

    try {
        const response = await fetch(
            `${API_URL}/public/sanpham/`
        );

        if (!response.ok) {
            throw new Error('Không thể tải sản phẩm');
        }

        const products = await response.json();

        productList.innerHTML = '';

        if (products.length === 0) {
            productList.innerHTML =
                '<p>Hiện chưa có sản phẩm nào.</p>';
            return;
        }

        products.forEach(product => {
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
        });

    } catch (error) {
        console.error(error);

        productList.innerHTML =
            '<p>Không thể tải danh sách sản phẩm. Vui lòng thử lại.</p>';
    }
}

loadProducts();
