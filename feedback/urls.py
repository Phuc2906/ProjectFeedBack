from rest_framework.routers import DefaultRouter
from .views import (
    PhanHoiViewSet, RegisterView,
    SanPhamViewSet, TagViewSet,
    BinhChonViewSet, NhomAIViewSet,
    ChiTietNhomAIViewSet, RoadmapViewSet,
    TaiKhoanView, PublicSanPhamListView
)
from django.urls import path, include

router = DefaultRouter()

router.register(r'phanhoi', PhanHoiViewSet, basename='phanhoi')
router.register(r'sanpham', SanPhamViewSet, basename='sanpham')
router.register(r'binhchon', BinhChonViewSet, basename='binhchon')
router.register(r'nhomai', NhomAIViewSet, basename='nhomai')
router.register(r'chitietnhomai', ChiTietNhomAIViewSet, basename='chitietnhomai')
router.register(r'roadmap', RoadmapViewSet, basename='roadmap')
router.register(r'tag', TagViewSet, basename='tag')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('', include(router.urls)),
    path('taikhoan/me/', TaiKhoanView.as_view(), name='tai-khoan-me'),
    path(
    'public/sanpham/',
    PublicSanPhamListView.as_view(),
    name='public-san-pham'
),
]