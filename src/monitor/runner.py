"""
SISU Monitor Runner
Main monitoring loop that orchestrates fetching, tracking, and notifications
"""
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

from .fetcher import CourseFetcher
from .tracker import ScoreTracker
from ..decoder import Course
from ..notifications import NotificationManager
from ..storage import HistoryManager
from ..utils.config import Config

logger = logging.getLogger(__name__)


class SISUMonitor:
    """Main SISU monitoring orchestrator"""

    def __init__(self, config: Config):
        self.config = config
        self.fetcher = CourseFetcher(
            base_url=config.api_base_url,
            timeout=config.api_timeout
        )
        self.tracker = ScoreTracker()
        self.notifications = NotificationManager(config.notifications)
        self.history = HistoryManager(config.data_dir)
        self.iteration = 0

    def get_poll_interval(self) -> int:
        """Get current poll interval based on time of day"""
        if not self.config.critical_hours_enabled:
            return self.config.poll_interval

        hour = datetime.now().hour
        if self.config.critical_hours_start <= hour < self.config.critical_hours_end:
            return self.config.critical_poll_interval

        return self.config.poll_interval

    def process_course(self, course_id: int, course_name: str) -> Optional[Course]:
        """Process a single course: fetch, decode, track changes.

        Returns:
            Course object if successful, None otherwise
        """
        logger.debug(f"Fetching course {course_id} ({course_name})")

        # Fetch raw data
        raw_data = self.fetcher.fetch_raw(course_id)
        if raw_data is None:
            logger.warning(f"Failed to fetch course {course_id}")
            return None

        # Check if data changed
        data_changed = self.tracker.has_data_changed(course_id, raw_data)
        is_new = self.tracker.is_new_course(course_id)

        if not data_changed and not is_new:
            logger.debug(f"No changes for course {course_id}")
            return None

        # Decode course data
        try:
            from ..decoder import decode_course
            course = decode_course(raw_data)
        except Exception as e:
            logger.error(f"Failed to decode course {course_id}: {e}")
            return None

        # Get current scores
        scores = course.get_cut_scores()

        # Compare with previous scores
        changes = self.tracker.compare_scores(course_id, scores)

        # Save data
        self.history.save_raw(course_id, raw_data)
        self.history.save_processed(course_id, course.to_dict())

        # Update tracker
        self.tracker.update_scores(course_id, scores)

        # Log and notify
        if is_new:
            self._handle_new_course(course_id, course_name, course, scores)
        elif changes:
            self._handle_score_changes(course_id, course_name, course, scores, changes)

        return course

    def _handle_new_course(self, course_id: int, course_name: str, course: Course, scores: dict):
        """Handle a newly monitored course"""
        logger.info(f"New course: {course_name} ({course_id})")
        self._print_course_info(course, scores, is_new=True)

        # Send notification
        title = f"SISU: {course_name}"
        message = f"Monitoramento iniciado - {course.university or 'N/A'}"
        scores_text = self._format_scores_text(scores)
        self.notifications.send_all(title, message, scores_text)

    def _handle_score_changes(self, course_id: int, course_name: str, course: Course,
                              scores: dict, changes: list):
        """Handle detected score changes"""
        logger.info(f"Score changes detected for {course_name}: {len(changes)} changes")
        self._print_course_info(course, scores, is_new=False)

        print(f"\n  MUDANCAS DETECTADAS:")
        for change in changes:
            print(f"    {change.format()}")

        # Save change history
        self.history.save_change(course_id, changes)

        # Send notification
        title = f"SISU: {course_name}"
        changes_text = ", ".join([f"{c.modality}: {c.new_score}" for c in changes])
        message = f"Nota de corte alterada! {changes_text}"
        scores_text = self._format_scores_text(scores)
        self.notifications.send_all(title, message, scores_text)

    def _print_course_info(self, course: Course, scores: dict, is_new: bool):
        """Print formatted course information"""
        status = "NOVO" if is_new else "ATUALIZADO"
        print(f"\n{'='*60}")
        print(f"  {status}: {course.course_name or 'N/A'}")
        print(f"{'='*60}")
        print(f"  {course.university or 'N/A'}")
        print(f"  {course.campus or 'N/A'}")
        print(f"  {course.city or 'N/A'}, {course.state or 'N/A'}")

        if scores:
            print(f"\n  Notas de Corte:")
            for mod, data in scores.items():
                cut = data.get('cut_score', 'N/A')
                apps = data.get('applicants', 'N/A')
                vacs = data.get('vacancies', 'N/A')
                print(f"    {mod}: {cut} ({apps} inscritos / {vacs} vagas)")

    def _format_scores_text(self, scores: dict) -> str:
        """Format scores for notification text"""
        lines = []
        for mod, data in scores.items():
            cut = data.get('cut_score', 'N/A')
            lines.append(f"{mod}: {cut}")
        return "\n".join(lines)

    def run_once(self):
        """Run a single monitoring iteration"""
        self.iteration += 1
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"\n[{timestamp}] Iteracao #{self.iteration}")

        for course_cfg in self.config.courses:
            course_id = course_cfg['id']
            course_name = course_cfg['name']
            print(f"  Verificando {course_name}...", end=" ", flush=True)

            course = self.process_course(course_id, course_name)
            if course is None and not self.tracker.is_new_course(course_id):
                print("Sem alteracoes")

    def run(self):
        """Main monitoring loop"""
        self._print_startup_banner()

        try:
            while True:
                self.run_once()
                interval = self.get_poll_interval()
                print(f"\n  Proxima verificacao em {interval // 60} minutos...")
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\n\nMonitoramento interrompido pelo usuario")
            print(f"Dados salvos em: {self.config.data_dir}")

    def _print_startup_banner(self):
        """Print startup information"""
        print("=" * 60)
        print("   SISU MONITOR 2025 - Monitoramento de Notas de Corte")
        print("=" * 60)
        print(f"Cursos monitorados: {len(self.config.courses)}")
        print(f"Intervalo normal: {self.config.poll_interval}s ({self.config.poll_interval // 60}min)")
        if self.config.critical_hours_enabled:
            print(f"Intervalo critico ({self.config.critical_hours_start}h-{self.config.critical_hours_end}h): "
                  f"{self.config.critical_poll_interval}s")
        print(f"Diretorio de dados: {self.config.data_dir}")
        print("-" * 60)
        print("Notificacoes:")
        notif = self.config.notifications
        print(f"  Desktop:  {'Sim' if notif.get('desktop', {}).get('enabled') else 'Nao'}")
        print(f"  Som:      {'Sim' if notif.get('sound', {}).get('enabled') else 'Nao'}")
        print(f"  Webhook:  {'Sim' if notif.get('webhook', {}).get('enabled') else 'Nao'}")
        print(f"  Telegram: {'Sim' if notif.get('telegram', {}).get('enabled') else 'Nao'}")
        print("=" * 60)
