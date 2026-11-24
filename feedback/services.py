
import logging
import os
import requests

logger = logging.getLogger(__name__)


def send_feedback_status_email(feedback):
    if not feedback.email_nguoi_gui:
        return

    api_key = os.getenv("BREVO_API_KEY")
    sender_email = os.getenv("BREVO_SENDER_EMAIL")

    if not api_key or not sender_email:
        logger.error("Thieu cau hinh BREVO_API_KEY hoac BREVO_SENDER_EMAIL.")
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

    url = "https://api.brevo.com/v3/smtp/email"

    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json",
    }

    payload = {
        "sender": {
            "name": "ProjectFeedback",
            "email": sender_email,
        },
        "to": [
            {
                "email": feedback.email_nguoi_gui,
                "name": feedback.ten_nguoi_gui or "",
            }
        ],
        "subject": subject,
        "textContent": message,
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=15,
        )
        response.raise_for_status()

        logger.info(
            "Da gui email thong bao den %s",
            feedback.email_nguoi_gui,
        )

    except requests.exceptions.RequestException:
        logger.exception("Khong the gui email thong bao qua Brevo.")
