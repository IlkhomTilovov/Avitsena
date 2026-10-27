from rest_framework.views import APIView
from rest_framework import status, serializers
from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
    inline_serializer
)
from drf_spectacular.types import OpenApiTypes
from apps.shared.response import CustomResponse
from apps.shared.pagination import CustomPagination
from apps.users.models import CustomUser
from apps.api.v1.serializers import (
    LoginSerializer,
    UserCreatSerializer,
    UserListSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    UserDetailSerializer,
    UserUpdateSerializer,
    UserPasswordSetSerializer,
    UserPasswordChangeSerializer
)
from django.db.models import Prefetch, Q
from apps.users.choices import UserStatus
from apps.shared.permissions import IsAdmin, IsRegistratorOrAdmin
from rest_framework.exceptions import NotFound
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from apps.services.models import Service


class LoginView(APIView):

    authentication_classes = ()
    permission_classes = ()
    serializer_class = LoginSerializer

    @extend_schema(
        tags=['auth'],
        responses={
            status.HTTP_200_OK: UserProfileSerializer
        }
    )
    def post(self, request):

        serializer = self.serializer_class(data=request.data)

        if serializer.is_valid():

            login = serializer.validated_data['login']

            password = serializer.validated_data['password']

            user = CustomUser.objects \
                .filter(
                    Q(phone=login) 
                    | 
                    Q(username=login), 
                    status=UserStatus.ACTIVE
                ) \
                .select_related('doctor') \
                .prefetch_related(
                    Prefetch(
                        'doctor__services',
                        queryset=Service.objects.select_related('category')
                    )
                ) \
                .first()

            if user and user.check_password(password):
                    
                data = UserProfileSerializer(user).data

                return CustomResponse(
                    message='Login successfully',
                    data=data
                )

            else:

                return CustomResponse(
                    success=False,
                    message='Login or password is incorrect',
                    status=status.HTTP_401_UNAUTHORIZED
                )  

        else:

            error_message = str(serializer.errors)

            return CustomResponse(
                success=False,
                message=error_message,
                status=status.HTTP_400_BAD_REQUEST
            )


class CheckUserExistsView(APIView):

    # NOTE: intentionally global (not clinic-scoped) - username/phone taken
    # in a different clinic will also show as "exists" here. Minor UX gap,
    # not a security issue (actual creation is still clinic-scoped).
    authentication_classes = ()
    permission_classes = ()
    
    @extend_schema(
        tags=['users'],
        parameters=[
            OpenApiParameter(
                name='value',
                description='User phone or username',
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.STR,
                required=True
            )
        ]
    )
    def post(self, request):

        value = request.query_params.get('value')

        if value:

            is_exists = CustomUser.objects \
                .filter(
                    Q(username=value) | Q(phone=value)
                ) \
                .exists()
        
            return CustomResponse(
                data={
                    'is_exists': is_exists
                }
            )   
        
        else:

            return CustomResponse(
                success=False,
                message='value query param required',
                status=status.HTTP_400_BAD_REQUEST
            )


class UserProfileView(APIView):

    serializer_class = UserProfileSerializer
        
    @extend_schema(
        tags=['users']
    )
    def get(self, request):

        user = request.user

        serializer = self.serializer_class(user)

        return CustomResponse(data=serializer.data)
    
    @extend_schema(
        tags=['users'],
        request=UserProfileUpdateSerializer
    )
    def patch(self, request):

        user = request.user

        serializer = UserProfileUpdateSerializer(
            user,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():

            user = serializer.save()

            data = self.serializer_class(user).data

            return CustomResponse(data=data)
        
        else:

            error_message = str(serializer.errors)

            return CustomResponse(
                success=False,
                message=error_message,
                status=status.HTTP_400_BAD_REQUEST
            )


class CustomTokenRefreshView(APIView):

    authentication_classes = ()
    permission_classes = ()
    serializer_class = TokenRefreshSerializer

    @extend_schema(tags=['auth'])
    def post(self, request):

        try:

            serializer = self.serializer_class(data=self.request.data)

            if serializer.is_valid():

                refresh_token = serializer.validated_data['refresh']

                token = RefreshToken(refresh_token)

                data = {
                    'access_token': str(token.access_token), 
                    'refresh_token': str(token)
                }

                return CustomResponse(data=data)

            else:

                error_message = (serializer.errors)

                return CustomResponse(
                    success=False,
                    message=error_message,
                    status=status.HTTP_400_BAD_REQUEST
                )

        except TokenError as e:
            
            raise InvalidToken(e.args[0])


class UserListCreateView(APIView):

    permission_classes = (IsRegistratorOrAdmin, )
    pagination_class = CustomPagination

    def get_queryset(self):

        query_params = self.request.query_params

        role = query_params.get('role')

        search = query_params.get('search')

        queryset = CustomUser.objects \
            .filter(clinic=self.request.user.clinic) \
            .order_by('-created_at')

        if role:

            queryset = queryset.filter(role=role)

        if search:

            search_terms = search.split()

            query = Q()

            for search_term in search_terms:

                query &= (
                    Q(id__icontains=search_term) |
                    Q(fio__icontains=search_term) |
                    Q(phone__icontains=search_term) |
                    Q(username__icontains=search_term) 
                )
            
            queryset = queryset.filter(query)

        return queryset

    @extend_schema(
        tags=['users'],
        parameters=[
            OpenApiParameter(
                name='page',
                description='Page number',
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.INT
            ),
            OpenApiParameter(
                name='per_page',
                description='Page item count',
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.INT
            ),
            OpenApiParameter(
                name='role',
                description='User role',
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.STR
            ),
            OpenApiParameter(
                name='search',
                description='Search',
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.STR
            )
        ],
        responses={
            status.HTTP_200_OK: UserListSerializer
        }
    )
    def get(self, request):

        queryset = self.get_queryset()
        
        paginator = self.pagination_class()

        paginated_queryset = paginator.paginate_queryset(
            queryset,
            request
        )

        serializer = UserListSerializer(
            paginated_queryset,
            many=True
        )

        return paginator.get_paginated_response(serializer.data)
    
    @extend_schema(
        tags=['users'],
        request=UserCreatSerializer,
        responses={
            status.HTTP_200_OK: UserProfileSerializer
        }
    )
    def post(self, request):

        serializer = UserCreatSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():

            user = serializer.save()

            data = UserProfileSerializer(user).data

            return CustomResponse(
                data=data,
                status=status.HTTP_201_CREATED
            )
        
        else:

            error_message = str(serializer.errors)

            return CustomResponse(
                success=False,
                message=error_message,
                status=status.HTTP_400_BAD_REQUEST
            )


class UserDetailView(APIView):

    permission_classes = (IsRegistratorOrAdmin, )
    serializer_class = UserDetailSerializer

    def get_queryset(self):

        return CustomUser.objects \
            .filter(
                status=UserStatus.ACTIVE,
                clinic=self.request.user.clinic
            ) \
            .select_related('doctor') \
            .prefetch_related(
                Prefetch(
                    'doctor__services',
                    queryset=Service.objects.select_related('category').order_by('-category__name')
                )
            )

    def get_object(self):

        try:

            id = self.kwargs['id']

            return self.get_queryset().get(id=id)

        except CustomUser.DoesNotExist:

            raise NotFound('User not found')
        
    @extend_schema(
        tags=['users']
    )
    def get(self, request, id):

        user = self.get_object()

        serializer = self.serializer_class(user)

        return CustomResponse(data=serializer.data)
    
    @extend_schema(
        tags=['users'],
        request=UserUpdateSerializer
    )
    def patch(self, request, id):

        user = self.get_object()

        serializer = UserUpdateSerializer(
            user,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():

            serializer.save()

            return CustomResponse(data=serializer.data)
        
        else:

            error_message = str(serializer.errors)

            return CustomResponse(
                success=False,
                message=error_message,
                status=status.HTTP_400_BAD_REQUEST
            )

    @extend_schema(tags=['users'])
    def delete(self, request, id):

        user = self.get_object()

        user.delete()

        return CustomResponse(message='User deleted')


class UserPasswordChangeView(APIView):

    serializer_class = UserPasswordChangeSerializer

    @extend_schema(
        tags=['users'],
        responses={
            status.HTTP_200_OK: inline_serializer(
                name='User change password response',
                fields={
                    'success': serializers.BooleanField(default=True),
                    'message': 'Password changed successfully'
                }
            )
        }
    )
    def post(self, request):

        serializer = self.serializer_class(data=request.data)

        if serializer.is_valid():

            user = request.user
            old_password = serializer.validated_data['old_password']
            new_password = serializer.validated_data['new_password']

            is_correct = user.check_password(old_password)

            if is_correct:

                user.set_password(new_password)

                user.save()

                return CustomResponse(message='Password changed successfully')

            else:

                return CustomResponse(
                    success=False,
                    message='Old password is incorrect',
                    status=status.HTTP_403_FORBIDDEN
                )
        
        else:

            error_message = str(serializer.errors)
            
            return CustomResponse(
                success=False,
                message=error_message,
                status=status.HTTP_400_BAD_REQUEST
            )


class UserPasswordSetView(APIView):

    permission_classes = (IsRegistratorOrAdmin, )
    serializer_class = UserPasswordSetSerializer

    def get_object(self):

        try:

            id = self.kwargs['id']

            return CustomUser.objects \
                .filter(
                    status=UserStatus.ACTIVE,
                    clinic=self.request.user.clinic
                ) \
                .get(id=id)
        
        except CustomUser.DoesNotExist:

            raise NotFound('User not found')

    @extend_schema(
        tags=['users'],
        responses={
            status.HTTP_200_OK: inline_serializer(
                name='User password set response',
                fields={
                    'success': serializers.BooleanField(default=True),
                    'message': 'User password successfully set'
                }
            )
        }
    )
    def post(self, request, id): 

        user = self.get_object()

        serializer = self.serializer_class(data=request.data)

        if serializer.is_valid():

            new_password = serializer.validated_data['new_password']

            user.set_password(new_password)

            user.save()

            return CustomResponse(message='User password successfully set')
        
        else:

            error_message = str(serializer.errors)

            return CustomResponse(
                success=False,
                message=error_message,
                status=status.HTTP_400_BAD_REQUEST
            )
