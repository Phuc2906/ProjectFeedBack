
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.generics import RetrieveUpdateAPIView

from .models import (
    PhanHoi, SanPham, BinhChon,
    NhomAI, ChiTietNhomAI, Roadmap, TaiKhoan
)

from .serializers import (
    PhanHoiSerializer, SanPhamSerializer,
    BinhChonSerializer, NhomAISerializer,
    ChiTietNhomAISerializer, RoadmapSerializer,
    RegisterSerializer, TaiKhoanSerializer
)

from .permissions import (
    IsProductOrReadOnly, IsCSFeedback,
    IsReadOnlyForAll, IsDevRoadmap
)


# 1. QUẢN LÝ PHẢN HỒI
class PhanHoiViewSet(viewsets.ModelViewSet):
    serializer_class = PhanHoiSerializer
    permission_classes = [IsAuthenticated, IsCSFeedback]

    def get_queryset(self):
        user = self.request.user
        role = user.tai_khoan.vai_tro

        if role == 'Product':
            return PhanHoi.objects.filter(
                ma_san_pham__ma_tai_khoan=user.tai_khoan
            ).order_by('-ngay_tao')

        return PhanHoi.objects.all().order_by('-ngay_tao')



# 2. QUẢN LÝ SẢN PHẨM
class SanPhamViewSet(viewsets.ModelViewSet):
    serializer_class = SanPhamSerializer
    permission_classes = [IsAuthenticated, IsProductOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        role = user.tai_khoan.vai_tro

        if role == 'Product':
            return SanPham.objects.filter(
                ma_tai_khoan=user.tai_khoan
            )

        return SanPham.objects.all()



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
    permission_classes = [IsAuthenticated, IsDevRoadmap]

    def get_queryset(self):
        user = self.request.user
        role = user.tai_khoan.vai_tro

        if role == 'Product':
            return Roadmap.objects.filter(
                ma_san_pham__ma_tai_khoan=user.tai_khoan
            )

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
