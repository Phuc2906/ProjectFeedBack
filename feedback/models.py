
from django.db import models
from django.contrib.auth.models import User


# 1. TAI KHOAN
class TaiKhoan(models.Model):

    VAI_TRO_CHOICES = [
        ('Product', 'Product'),
        ('CS', 'CS'),
        ('Dev', 'Dev'),
    ]

    ma_tai_khoan = models.AutoField(primary_key=True)

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='tai_khoan'
    )

    ho_ten = models.CharField(max_length=100)
    email = models.EmailField(unique=True)

    vai_tro = models.CharField(
        max_length=20,
        choices=VAI_TRO_CHOICES,
        default='CS'
    )

    def __str__(self):
        return self.ho_ten

    class Meta:
        db_table = 'TaiKhoan'


# 2. SAN PHAM
class SanPham(models.Model):
    ma_san_pham = models.AutoField(primary_key=True)
    ma_tai_khoan = models.ForeignKey(
        TaiKhoan,
        on_delete=models.CASCADE,
        related_name='san_pham'
    )
    ten_san_pham = models.CharField(max_length=200)
    mo_ta = models.TextField(blank=True)

    def __str__(self):
        return self.ten_san_pham

    class Meta:
        db_table = 'SanPham'


# 3. PHAN HOI
class PhanHoi(models.Model):

    NGUON_CHOICES = [
        ('Email', 'Email'),
        ('Form', 'Form'),
        ('Chat', 'Chat'),
        ('Community', 'Community'),
    ]

    ma_phan_hoi = models.AutoField(primary_key=True)

    # Không bắt buộc có tài khoản vì khách hàng có thể gửi từ bên ngoài
    ma_tai_khoan = models.ForeignKey(
        TaiKhoan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='phan_hoi'
    )

    ma_san_pham = models.ForeignKey(
        SanPham,
        on_delete=models.CASCADE,
        related_name='phan_hoi'
    )

    ten_nguoi_gui = models.CharField(max_length=100, blank=True)
    email_nguoi_gui = models.EmailField(blank=True)

    nguon_tiep_nhan = models.CharField(
        max_length=20,
        choices=NGUON_CHOICES,
        default='Form'
    )

    tieu_de = models.CharField(max_length=255)
    noi_dung = models.TextField()
    trang_thai = models.CharField(max_length=50, default='Pending')
    ngay_tao = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.tieu_de

    class Meta:
        db_table = 'PhanHoi'



# 4. BINH CHON
class BinhChon(models.Model):
    ma_binh_chon = models.AutoField(primary_key=True)
    ma_tai_khoan = models.ForeignKey(
        TaiKhoan,
        on_delete=models.CASCADE,
        related_name='binh_chon'
    )
    ma_phan_hoi = models.ForeignKey(
        PhanHoi,
        on_delete=models.CASCADE,
        related_name='binh_chon'
    )

    class Meta:
        db_table = 'BinhChon'
        constraints = [
            models.UniqueConstraint(
                fields=['ma_tai_khoan', 'ma_phan_hoi'],
                name='unique_user_feedback_vote'
            )
        ]

    def __str__(self):
        return f'Vote {self.ma_binh_chon}'


# 5. NHOM AI
class NhomAI(models.Model):
    ma_nhom = models.AutoField(primary_key=True)
    ma_san_pham = models.ForeignKey(
        SanPham,
        on_delete=models.CASCADE,
        related_name='nhom_ai'
    )
    ten_nhom = models.CharField(max_length=200)
    mo_ta = models.TextField(blank=True)

    def __str__(self):
        return self.ten_nhom

    class Meta:
        db_table = 'NhomAI'


# 6. CHI TIET NHOM AI
class ChiTietNhomAI(models.Model):
    ma_nhom = models.ForeignKey(
        NhomAI,
        on_delete=models.CASCADE,
        related_name='chi_tiet'
    )
    ma_phan_hoi = models.ForeignKey(
        PhanHoi,
        on_delete=models.CASCADE,
        related_name='nhom_ai'
    )

    class Meta:
        db_table = 'ChiTietNhomAI'
        constraints = [
            models.UniqueConstraint(
                fields=['ma_nhom', 'ma_phan_hoi'],
                name='unique_ai_group_feedback'
            )
        ]

    def __str__(self):
        return f'{self.ma_nhom} - {self.ma_phan_hoi}'


# 7. ROADMAP
class Roadmap(models.Model):
    ma_roadmap = models.AutoField(primary_key=True)
    ma_san_pham = models.ForeignKey(
        SanPham,
        on_delete=models.CASCADE,
        related_name='roadmap'
    )
    ma_nhom = models.ForeignKey(
        NhomAI,
        on_delete=models.CASCADE,
        related_name='roadmap'
    )
    ten_cong_viec = models.CharField(max_length=255)
    trang_thai = models.CharField(max_length=50, default='Planned')
    do_uu_tien = models.IntegerField(default=0)

    def __str__(self):
        return self.ten_cong_viec

    class Meta:
        db_table = 'Roadmap'
