import logging
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_feedback_status_email(feedback):
    if not feedback.email_nguoi_gui:
        return

    subject = f"Cap nhat phan hoi: {feedback.tieu_de}"

    message = f"""
Xin chao {feedback.ten_nguoi_gui},

Phan hoi cua ban da duoc cap nhat trang thai.

Tieu de: {feedback.tieu_de}
Trang thai moi: {feedback.trang_thai}

Cam on ban da dong gop y kien cho san pham!
ProjectFeedback
"""

    try:
        send_mail(
            subject,
            message,
            None,
            [feedback.email_nguoi_gui],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Khong the gui email thong bao phan hoi.")