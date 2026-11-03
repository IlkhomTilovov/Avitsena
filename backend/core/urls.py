from drf_spectacular.views import (
    SpectacularSwaggerView,
    SpectacularAPIView
)
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve


schema_view_v1 = SpectacularAPIView.as_view(
    api_version='v1',
    urlconf=[
        path('v1/', include('apps.api.v1.urls'))
    ],
    custom_settings={
        'TITLE': 'Avitcena Backend API docs',
        'VERSION': 1.0,
        'DESCRIPTION': 'Official documentation for the Avitcena Backend API, version 1.0'
    }
)   

urlpatterns = [
    path('v1/docs/schema', schema_view_v1, name='docs-schema-v1'),
    path('v1/docs/swagger', SpectacularSwaggerView.as_view(url_name='docs-schema-v1'), name='docs-swagger-v1'),
    path('dashboard/control-center', admin.site.urls),
    path('v1/', include('apps.api.v1.urls')),
    re_path(r"static/(?P<path>.*)", serve, {"document_root": settings.STATIC_ROOT}),
    re_path(r"media/(?P<path>.*)", serve, {"document_root": settings.MEDIA_ROOT})
]

urlpatterns += [path('silk/', include('silk.urls', namespace='silk'))]

