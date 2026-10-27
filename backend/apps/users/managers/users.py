from django.contrib.auth.models import BaseUserManager
from apps.shared.choices import UserRole


class CustomUserManager(BaseUserManager):

    def create_user(self, username, phone, password=None, **extra_fields):

        if not username:
            
            raise ValueError('The phone_number field is required to create a user')

        user = self.model(username=username, phone=phone, **extra_fields)
        user.set_password(password)
        user.save()

        return user

    def create_superuser(self, username, phone, password, **extra_fields):

        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', UserRole.SUPERADMIN)

        if extra_fields.get('is_active') is not True:
            raise ValueError('Super user uchun is_active True bo\'lishi kerak')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Super user uchun is_staff True bo\'lishi kerak')

        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Super user uchun is_superuser True bo\'lishi kerak')


        super_user = self.create_user(
            username=username,
            phone=phone,
            password=password,
            **extra_fields
        )

        return super_user