
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.generics import RetrieveUpdateAPIView

from .models import (
    PhanHoi, SanPham, BinhChon,
    NhomAI, ChiTietNhomAI, Roadmap, TaiKhoan, Tag
)

from .serializers import (
    PhanHoiSerializer, SanPhamSerializer,
    BinhChonSerializer, NhomAISerializer,
    ChiTietNhomAISerializer, RoadmapSerializer,
    RegisterSerializer, TaiKhoanSerializer, TagSerializer
)

from .permissions import (
    IsProductOrReadOnly, IsCSFeedback,
    IsReadOnlyForAll, IsDevRoadmap,
    IsProductTagManagement
)

from .services import send_feedback_status_email


# 1. QUẢN LÝ PHẢN HỒI
class PhanHoiViewSet(viewsets.ModelViewSet):
    serializer_class = PhanHoiSerializer
    permission_classes = [IsCSFeedback]

    def get_queryset(self):
        user = self.request.user

    # Tất cả tài khoản nội bộ đều xem được toàn bộ feedback
        if user.is_authenticated:
            return PhanHoi.objects.all().order_by('-ngay_tao')

    # Khách bên ngoài không được xem danh sách feedback
        return PhanHoi.objects.none()

    # Gửi email khi trạng thái phản hồi thay đổi
    def perform_update(self, serializer):
        old_status = serializer.instance.trang_thai

        feedback = serializer.save()

        if old_status != feedback.trang_thai:
            send_feedback_status_email(feedback)


# DANH SÁCH SẢN PHẨM CÔNG KHAI
class PublicSanPhamListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        san_pham = SanPham.objects.all().order_by('ten_san_pham')

        data = san_pham.values(
            'ma_san_pham',
            'ten_san_pham',
            'mo_ta',
        )

        return Response(data)


# 2. QUẢN LÝ SẢN PHẨM
class SanPhamViewSet(viewsets.ModelViewSet):
    serializer_class = SanPhamSerializer
    permission_classes = [IsAuthenticated, IsProductOrReadOnly]

    def get_queryset(self):
        return SanPham.objects.all().order_by('ten_san_pham')
    


class TagViewSet(viewsets.ModelViewSet):
    serializer_class = TagSerializer
    permission_classes = [
        IsAuthenticated,
        IsProductTagManagement
    ]

    def get_queryset(self):
        user = self.request.user
        role = user.tai_khoan.vai_tro

        # Product chỉ quản lý Tag thuộc sản phẩm của mình
        if role == 'Product':
            return Tag.objects.filter(
                ma_san_pham__ma_tai_khoan=user.tai_khoan
            )

        # CS và Dev chỉ được xem Tag toàn hệ thống
        return Tag.objects.all()


# 3. QUẢN LÝ BÌNH CHỌN
class BinhChonViewSet(viewsets.ModelViewSet):
    queryset = BinhChon.objects.all()
    serializer_class = BinhChonSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForAll]


# 4. QUẢN LÝ NHÓM AI

class NhomAIViewSet(viewsets.ModelViewSet):
    serializer_class = NhomAISerializer
    permission_classes = [IsAuthenticated, IsProductOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        role = user.tai_khoan.vai_tro

        if role == 'Product':
            return NhomAI.objects.filter(
                ma_san_pham__ma_tai_khoan=user.tai_khoan
            )

        return NhomAI.objects.all()



# 5. QUẢN LÝ CHI TIẾT NHÓM AI
class ChiTietNhomAIViewSet(viewsets.ModelViewSet):
    serializer_class = ChiTietNhomAISerializer
    permission_classes = [IsAuthenticated, IsProductOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        role = user.tai_khoan.vai_tro

        if role == 'Product':
            return ChiTietNhomAI.objects.filter(
                ma_nhom__ma_san_pham__ma_tai_khoan=user.tai_khoan
            )

        return ChiTietNhomAI.objects.all()



# 6. QUẢN LÝ ROADMAP
class RoadmapViewSet(viewsets.ModelViewSet):
    serializer_class = RoadmapSerializer
    permission_classes = [IsDevRoadmap]

    def get_queryset(self):
        user = self.request.user

        # Khách bên ngoài chỉ xem Roadmap công khai
        if not user.is_authenticated:
            return Roadmap.objects.filter(
                cong_khai=True
            )

        role = user.tai_khoan.vai_tro

        # Product chỉ xem Roadmap thuộc sản phẩm của mình
        if role == 'Product':
            return Roadmap.objects.filter(
                ma_san_pham__ma_tai_khoan=user.tai_khoan
            )

        # CS và Dev xem toàn bộ Roadmap
        return Roadmap.objects.all()



# 7. ĐĂNG KÝ TÀI KHOẢN
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()

            return Response(
                {'message': 'Đăng ký tài khoản thành công!'},
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


# 8. XEM VÀ CẬP NHẬT TÀI KHOẢN CỦA MÌNH
class TaiKhoanView(RetrieveUpdateAPIView):
    serializer_class = TaiKhoanSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return TaiKhoan.objects.get(user=self.request.user)
