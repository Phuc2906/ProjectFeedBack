
from rest_framework import viewsets, status, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.generics import RetrieveUpdateAPIView
from django.db import transaction
from django.shortcuts import get_object_or_404

from .models import (
    PhanHoi, SanPham, BinhChon,
    NhomAI, ChiTietNhomAI, Roadmap, TaiKhoan, Tag,
    CuocTroChuyen, TinNhan
)

from .serializers import (
    PhanHoiSerializer, SanPhamSerializer,
    BinhChonSerializer, NhomAISerializer,
    ChiTietNhomAISerializer, RoadmapSerializer,
    RegisterSerializer, TaiKhoanSerializer, TagSerializer,
    CuocTroChuyenSerializer, TinNhanSerializer
)

from .permissions import (
    IsProductOrReadOnly, IsCSFeedback,
    IsReadOnlyForAll, IsDevRoadmap,
    IsProductTagManagement, IsCSChat
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
        return NhomAI.objects.all()



# 5. QUẢN LÝ CHI TIẾT NHÓM AI
class ChiTietNhomAIViewSet(viewsets.ModelViewSet):
    serializer_class = ChiTietNhomAISerializer
    permission_classes = [IsAuthenticated, IsProductOrReadOnly]

    def get_queryset(self):
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

# 9. KHÁCH HÀNG TẠO CUỘC TRÒ CHUYỆN
class ChatCustomerStartView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):

        try:
            ma_san_pham = serializers.IntegerField().run_validation(
                request.data.get('ma_san_pham')
            )

            ten = serializers.CharField(max_length=100).run_validation(
                request.data.get('ten_khach_hang')
            )

            email = serializers.EmailField().run_validation(
                request.data.get('email')
            )

            noi_dung = serializers.CharField().run_validation(
                request.data.get('noi_dung')
            )

        except serializers.ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)

        san_pham = get_object_or_404(
            SanPham,
            ma_san_pham=ma_san_pham
        )

        with transaction.atomic():

            cuoc_tro_chuyen = CuocTroChuyen.objects.create(
                ma_san_pham=san_pham,
                ten_khach_hang=ten,
                email=email
            )

            tin_nhan = TinNhan.objects.create(
                ma_cuoc_tro_chuyen=cuoc_tro_chuyen,
                nguoi_gui='Customer',
                noi_dung=noi_dung
            )

        return Response({
            'message': 'Tạo cuộc trò chuyện thành công.',
            'token_truy_cap': str(cuoc_tro_chuyen.token_truy_cap),
            'cuoc_tro_chuyen': CuocTroChuyenSerializer(
                cuoc_tro_chuyen
            ).data,
            'tin_nhan': TinNhanSerializer(tin_nhan).data
        }, status=status.HTTP_201_CREATED)


# 10. KHÁCH HÀNG XEM VÀ GỬI TIN NHẮN
class ChatCustomerMessageView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):

        cuoc_tro_chuyen = get_object_or_404(
            CuocTroChuyen,
            token_truy_cap=token
        )

        tin_nhan = cuoc_tro_chuyen.tin_nhan.all()

        return Response(
            TinNhanSerializer(tin_nhan, many=True).data
        )

    def post(self, request, token):

        cuoc_tro_chuyen = get_object_or_404(
            CuocTroChuyen,
            token_truy_cap=token
        )

        if cuoc_tro_chuyen.trang_thai == 'Closed':
            return Response(
                {'message': 'Cuộc trò chuyện đã đóng.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            noi_dung = serializers.CharField().run_validation(
                request.data.get('noi_dung')
            )
        except serializers.ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)

        tin_nhan = TinNhan.objects.create(
            ma_cuoc_tro_chuyen=cuoc_tro_chuyen,
            nguoi_gui='Customer',
            noi_dung=noi_dung
        )

        cuoc_tro_chuyen.save()

        return Response(
            TinNhanSerializer(tin_nhan).data,
            status=status.HTTP_201_CREATED
        )


# 11. CS XEM DANH SÁCH CUỘC TRÒ CHUYỆN
class ChatCSListView(APIView):
    permission_classes = [IsAuthenticated, IsCSChat]

    def get(self, request):

        cuoc_tro_chuyen = CuocTroChuyen.objects.select_related(
            'ma_san_pham'
        ).order_by('-ngay_cap_nhat')

        return Response(
            CuocTroChuyenSerializer(
                cuoc_tro_chuyen,
                many=True
            ).data
        )


# 12. CS XEM VÀ TRẢ LỜI TIN NHẮN
class ChatCSMessageView(APIView):
    permission_classes = [IsAuthenticated, IsCSChat]

    def get(self, request, pk):

        cuoc_tro_chuyen = get_object_or_404(
            CuocTroChuyen,
            ma_cuoc_tro_chuyen=pk
        )

        tin_nhan = cuoc_tro_chuyen.tin_nhan.all()

        return Response(
            {
    'trang_thai': cuoc_tro_chuyen.trang_thai,
    'tin_nhan': TinNhanSerializer(tin_nhan, many=True).data
}
        )

    def post(self, request, pk):

        cuoc_tro_chuyen = get_object_or_404(
            CuocTroChuyen,
            ma_cuoc_tro_chuyen=pk
        )

        if cuoc_tro_chuyen.trang_thai == 'Closed':
            return Response(
                {'message': 'Cuộc trò chuyện đã đóng.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            noi_dung = serializers.CharField().run_validation(
                request.data.get('noi_dung')
            )
        except serializers.ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)

        tai_khoan = request.user.tai_khoan

        tin_nhan = TinNhan.objects.create(
            ma_cuoc_tro_chuyen=cuoc_tro_chuyen,
            nguoi_gui='CS',
            ma_tai_khoan=tai_khoan,
            noi_dung=noi_dung
        )

        cuoc_tro_chuyen.save()

        return Response(
            TinNhanSerializer(tin_nhan).data,
            status=status.HTTP_201_CREATED
        )