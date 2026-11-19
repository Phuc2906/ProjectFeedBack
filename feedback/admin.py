from django.contrib import admin
from .models import (
    TaiKhoan,
    SanPham,
    PhanHoi,
    BinhChon,
    NhomAI,
    ChiTietNhomAI,
    Roadmap
)

@admin.register(TaiKhoan)
class TaiKhoanAdmin(admin.ModelAdmin):
    list_display = ('ma_tai_khoan', 'ho_ten', 'email', 'vai_tro')
    list_filter = ('vai_tro',)
    search_fields = ('ho_ten', 'email')
admin.site.register(SanPham)
admin.site.register(PhanHoi)
admin.site.register(BinhChon)
admin.site.register(NhomAI)
admin.site.register(ChiTietNhomAI)
admin.site.register(Roadmap)