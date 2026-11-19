
from rest_framework import serializers
from .models import (
    PhanHoi, SanPham, BinhChon,
    NhomAI, ChiTietNhomAI, Roadmap, TaiKhoan
)

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import (
    validate_password as django_validate_password
)


# Kiểm tra sản phẩm có thuộc Product đang đăng nhập không
def is_product_owner(request, san_pham):
    if not request or not request.user.is_authenticated:
        return False

    try:
        tai_khoan = request.user.tai_khoan
        return san_pham.ma_tai_khoan_id == tai_khoan.pk
    except TaiKhoan.DoesNotExist:
        return False


# 1. PHẢN HỒI
class PhanHoiSerializer(serializers.ModelSerializer):
    class Meta:
        model = PhanHoi
        fields = '__all__'


# 2. SẢN PHẨM
class SanPhamSerializer(serializers.ModelSerializer):
    class Meta:
        model = SanPham
        fields = '__all__'

    def validate_ma_tai_khoan(self, value):
        request = self.context.get('request')

        if request and request.user.tai_khoan != value:
            raise serializers.ValidationError(
                "Bạn chỉ được tạo sản phẩm cho tài khoản của mình."
            )

        return value


# 3. BÌNH CHỌN
class BinhChonSerializer(serializers.ModelSerializer):
    class Meta:
        model = BinhChon
        fields = '__all__'


# 4. NHÓM AI
class NhomAISerializer(serializers.ModelSerializer):
    class Meta:
        model = NhomAI
        fields = '__all__'

    def validate_ma_san_pham(self, value):
        request = self.context.get('request')

        if not is_product_owner(request, value):
            raise serializers.ValidationError(
                "Bạn không có quyền sử dụng sản phẩm này."
            )

        return value


# 5. CHI TIẾT NHÓM AI
class ChiTietNhomAISerializer(serializers.ModelSerializer):
    class Meta:
        model = ChiTietNhomAI
        fields = '__all__'

    def validate(self, attrs):
        request = self.context.get('request')

        nhom = attrs.get(
            'ma_nhom',
            getattr(self.instance, 'ma_nhom', None)
        )

        phan_hoi = attrs.get(
            'ma_phan_hoi',
            getattr(self.instance, 'ma_phan_hoi', None)
        )

        if nhom and not is_product_owner(
            request, nhom.ma_san_pham
        ):
            raise serializers.ValidationError(
                "Bạn không có quyền sử dụng nhóm AI này."
            )

        if nhom and phan_hoi:
            if nhom.ma_san_pham_id != phan_hoi.ma_san_pham_id:
                raise serializers.ValidationError(
                    "Nhóm AI và phản hồi phải thuộc cùng một sản phẩm."
                )

        return attrs


# 6. ROADMAP
class RoadmapSerializer(serializers.ModelSerializer):
    class Meta:
        model = Roadmap
        fields = '__all__'

    def validate(self, attrs):
        request = self.context.get('request')

        # Lấy vai trò tài khoản
        try:
            role = request.user.tai_khoan.vai_tro
        except (AttributeError, TaiKhoan.DoesNotExist):
            role = None

        # Dev chỉ được cập nhật trạng thái
        if role == 'Dev':
            if (
                self.instance
                and set(attrs.keys()) <= {'trang_thai'}
            ):
                return attrs

            raise serializers.ValidationError(
                "Dev chỉ được phép cập nhật trạng thái công việc."
            )

        # Product phải sở hữu sản phẩm
        san_pham = attrs.get(
            'ma_san_pham',
            getattr(self.instance, 'ma_san_pham', None)
        )

        nhom = attrs.get(
            'ma_nhom',
            getattr(self.instance, 'ma_nhom', None)
        )

        if san_pham and not is_product_owner(request, san_pham):
            raise serializers.ValidationError(
                "Bạn không có quyền sử dụng sản phẩm này."
            )

        if nhom and not is_product_owner(request, nhom.ma_san_pham):
            raise serializers.ValidationError(
                "Bạn không có quyền sử dụng nhóm AI này."
            )

        if san_pham and nhom:
            if san_pham.pk != nhom.ma_san_pham_id:
                raise serializers.ValidationError(
                    "Nhóm AI phải thuộc sản phẩm được chọn."
                )

        return attrs


# 7. ĐĂNG KÝ TÀI KHOẢN
class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
    ho_ten = serializers.CharField(max_length=100)
    email = serializers.EmailField()

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(
                "Tên đăng nhập đã tồn tại."
            )
        return value

    def validate_email(self, value):
        if TaiKhoan.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "Email đã được sử dụng."
            )
        return value

    def validate_password(self, value):
        django_validate_password(value)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data['email']
        )

        TaiKhoan.objects.create(
            user=user,
            ho_ten=validated_data['ho_ten'],
            email=validated_data['email']
        )

        return user


# 8. TÀI KHOẢN
class TaiKhoanSerializer(serializers.ModelSerializer):

    class Meta:
        model = TaiKhoan
        fields = ['ma_tai_khoan', 'ho_ten', 'email']
        read_only_fields = ['ma_tai_khoan']

    def update(self, instance, validated_data):
        instance.ho_ten = validated_data.get(
            'ho_ten', instance.ho_ten
        )
        instance.email = validated_data.get(
            'email', instance.email
        )

        instance.save()

        instance.user.email = instance.email
        instance.user.save()

        return instance
