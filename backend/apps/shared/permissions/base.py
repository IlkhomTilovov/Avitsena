from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.shared.choices import UserRole


class IsAdmin(BasePermission):

    def has_permission(self, request, view):

        user = request.user

        if not user or not user.is_authenticated:

            return False

        return user.role == UserRole.ADMIN


class IsSuperAdmin(BasePermission):

    def has_permission(self, request, view):

        user = request.user

        if not user or not user.is_authenticated:

            return False

        return user.role == UserRole.SUPERADMIN


class IsRegistratorOrAdmin(BasePermission):

    def has_permission(self, request, view):
        
        user = request.user

        if not user or not user.is_authenticated:

            return False
        
        return user.role in [UserRole.ADMIN, UserRole.REGISTRATOR]