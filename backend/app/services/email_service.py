"""
Email verification service.

Currently logs the verification URL. Swap in aiosmtplib for real delivery.
"""

import logging

logger = logging.getLogger(__name__)


def send_verification_email(email: str, token: str, frontend_url: str) -> None:
    """
    Send (or log) a verification email.

    In production, replace the log line with an actual SMTP send via aiosmtplib.
    """
    verification_url = f"{frontend_url}/auth/verify?token={token}"
    logger.info(
        "Verification email for %s — link: %s",
        email,
        verification_url,
    )
