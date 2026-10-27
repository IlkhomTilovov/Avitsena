import uuid
import os


def upload_to_uuid(instance, filename):

    ext = filename.split(".")[1]

    filename = f"{uuid.uuid4()}.{ext}"

    return os.path.join("visit/files/", filename)