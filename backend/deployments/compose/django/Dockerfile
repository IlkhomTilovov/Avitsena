FROM python:3.10.12-slim-buster

WORKDIR /app

COPY requirements/base.txt app/requirements.txt
RUN pip install --no-cache-dir -r app/requirements.txt

COPY ./deployments/compose/django/start /start
RUN sed -i 's/\r$//g' /start && \
    chmod +x /start

# COPY ./deployments/compose/django/celery/worker/start /start-celeryworker
# RUN sed -i 's/\r$//g' /start-celeryworker && \
#     chmod +x /start-celeryworker

# COPY ./deployments/compose/django/celery/beat/start /start-celerybeat
# RUN sed -i 's/\r$//g' /start-celerybeat && \
#     chmod +x /start-celerybeat
    
COPY . /app

CMD ["docker-entrypoint.sh"]