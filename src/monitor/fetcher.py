"""
Course Data Fetcher
Handles API communication with MeuSISU
"""
import logging
from typing import Optional
import requests

from ..decoder import decode_course, Course

logger = logging.getLogger(__name__)


class CourseFetcher:
    """Fetches course data from MeuSISU API"""

    def __init__(self, base_url: str = "https://meusisu.com/api", timeout: int = 30):
        self.base_url = base_url
        self.timeout = timeout
        self.session = requests.Session()

    def fetch_raw(self, course_id: int) -> Optional[bytes]:
        """Fetch raw binary data for a course.

        Args:
            course_id: The course ID from meusisu.com

        Returns:
            Raw bytes or None if request failed
        """
        url = f"{self.base_url}/getCourseData?courseCode={course_id}"

        try:
            response = self.session.get(url, timeout=self.timeout)
            if response.status_code == 200:
                return response.content
            else:
                logger.warning(f"HTTP {response.status_code} for course {course_id}")
                return None
        except requests.RequestException as e:
            logger.error(f"Request failed for course {course_id}: {e}")
            return None

    def fetch_course(self, course_id: int) -> Optional[Course]:
        """Fetch and decode course data.

        Args:
            course_id: The course ID from meusisu.com

        Returns:
            Course object or None if fetch/decode failed
        """
        data = self.fetch_raw(course_id)
        if data is None:
            return None

        try:
            return decode_course(data)
        except Exception as e:
            logger.error(f"Decode failed for course {course_id}: {e}")
            return None

    def close(self):
        """Close the session"""
        self.session.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
