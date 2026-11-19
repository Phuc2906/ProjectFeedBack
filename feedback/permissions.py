
from rest_framework.permissions import BasePermission, SAFE_METHODS


def get_user_role(user):
    if not user or not user.is_authenticated:
        return None

    try:
        return user.tai_khoan.vai_tro
    except Exception:
        return None


class IsProductOrReadOnly(BasePermission):
    """Product được CRUD, CS và Dev chỉ được xem."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        return get_user_role(request.user) == 'Product'


class IsCSFeedback(BasePermission):
    """CS được CRUD phản hồi, vai trò khác chỉ được xem."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        return get_user_role(request.user) == 'CS'


class IsReadOnlyForAll(BasePermission):
    """Tất cả vai trò chỉ được xem."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS


class IsDevRoadmap(BasePermission):
    """Product CRUD, Dev chỉ cập nhật trạng thái, CS chỉ xem."""

    def has_permission(self, request, view):
        role = get_user_role(request.user)

        if role == 'Product':
            return True

        if role == 'Dev':
            if request.method in SAFE_METHODS:
                return True

            if request.method == 'PATCH':
                return set(request.data.keys()) <= {'trang_thai'}

        return request.method in SAFE_METHODS
