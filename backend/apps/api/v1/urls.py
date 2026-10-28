from apps.api.v1.views import (

    #clinics
    ClinicListCreateView,
    ClinicDetailView,

    #services, service categories
    ServiceCategoryListCreateView,
    ServiceListCreateView,
    ServiceDetailView,
    ServiceCategoryDetailView,

    #stats
    ClinicStatsView,
    PatientsStatsOfYearlyANDMonthlyView,
    RevenueStatsOfYearlyANDMonthlyView,
    VisitsStatsOfMonthlyView,

    #users
    UserListCreateView,
    LoginView,
    UserDetailView,
    UserProfileView,
    CustomTokenRefreshView,
    UserPasswordSetView,
    CheckUserExistsView,
    UserPasswordChangeView,

    #visits
    PatientListCreateView,
    PatientStatsView,
    PatientDetailView,
    PatientVisitListCreateView,
    PatientVisitDetailView,
    VisitRecipeCreateView,
    VisitRecipeDetailView,
    TodayVisitsView
)
from django.urls import path


urlpatterns = [

    # clinics
    path('clinics', ClinicListCreateView.as_view(), name='clinic_list_create'),
    path('clinics/<uuid:id>', ClinicDetailView.as_view(), name='clinic_detail'),

    # servires, service categories
    path('services', ServiceListCreateView.as_view(), name='service_list_create'),
    path('services/<uuid:id>', ServiceDetailView.as_view(), name='service_detail'),
    path('service-categories', ServiceCategoryListCreateView.as_view(), name='service_category_list_create'),
    path('service-categories/<uuid:id>', ServiceCategoryDetailView.as_view(), name='service_category_detail'),

    # stats
    path('stats/clinc', ClinicStatsView.as_view(), name='clinc_stats'),
    path('stats/patients', PatientsStatsOfYearlyANDMonthlyView.as_view(), name='patients_stats_of_yearly_and_monthly'),
    path('stats/revenue', RevenueStatsOfYearlyANDMonthlyView.as_view(), name='revenue_stats_of_yearly_and_monthly'),
    path('stats/visits/monthly', VisitsStatsOfMonthlyView.as_view(), name='visits_stats_of_monthly'),

    # users
    path('auth/login', LoginView.as_view(), name='auth_login'),
    path('auth/token/refresh', CustomTokenRefreshView.as_view(), name='auth_token_refresh'),
    path('users', UserListCreateView.as_view(), name='user_create_list'),
    path('users/change-password', UserPasswordChangeView.as_view(), name='user_change_password'),
    path('users/check', CheckUserExistsView.as_view(), name='check_user_exists'),
    path('users/<uuid:id>', UserDetailView.as_view(), name='user_detail'),
    path('users/<uuid:id>/set-password', UserPasswordSetView.as_view(), name='user_password_set'),
    path('user/profile', UserProfileView.as_view(), name='user_profile'),

    #patients visits
    path('visits/today', TodayVisitsView.as_view(), name='visits_today'),
    path('visits/<uuid:id>/recipes', VisitRecipeCreateView.as_view(), name='visit_recipe_list_create'),
    path('visits/<uuid:id>/recipes/<uuid:recipe_id>', VisitRecipeDetailView.as_view(), name='visit_recipe_detail'),
    path('patients', PatientListCreateView.as_view(), name='patient_list_create'),
    path('patients/stats', PatientStatsView.as_view(), name='patient_stats'),
    path('patients/<uuid:id>', PatientDetailView.as_view(), name='patient_detail'),
    path('patients/<uuid:id>/visits', PatientVisitListCreateView.as_view(), name='patient_visit_lis_create'),
    path('patients/<uuid:id>/visits/<uuid:visit_id>', PatientVisitDetailView.as_view(), name='patient_visit_detail')
]