from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class CustomPagination(PageNumberPagination):
    page_size = 16
    page_size_query_param = 'per_page'
    max_page_size = 100

    def get_paginated_response(self, data):
        
        return Response({
            'success': True,
            'message': 'Data fetched successfully.',
            'data': data,
            'meta': {
                'total_pages': self.page.paginator.num_pages,
                'total_items': self.page.paginator.count,
                'current_page': self.page.number
            }
        })