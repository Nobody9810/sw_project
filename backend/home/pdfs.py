"""Smaller PDFs for online reading.

Page images above PDF_TARGET_DPI are resampled to it, colourless scans become
grayscale, lossless continuous-tone images become JPEG; text, fonts, links and
outlines are untouched. The result is linearized so the reader's range requests
reach the first pages early. A result that is not clearly better is discarded.
"""
import logging
import os
import queue
import tempfile
import threading
from io import BytesIO
from pathlib import Path

import fitz
import pikepdf
from PIL import Image, ImageChops, ImageStat

logger = logging.getLogger(__name__)

PDF_TARGET_DPI = 150
PDF_JPEG_QUALITY = 70
# Largest channel difference still treated as a black-and-white or gray scan.
GRAY_SPREAD = 24
MIN_SAVING = 0.05
BITONAL_FILTERS = {'CCITTFaxDecode', 'JBIG2Decode'}
LOSSLESS_FILTERS = {'', 'FlateDecode', 'LZWDecode', 'RunLengthDecode'}


def is_linearized(path):
    with open(path, 'rb') as source:
        return b'/Linearized' in source.read(1024)


def _image_dpi(page, image):
    box = page.get_image_bbox(image)
    if box.is_empty or box.is_infinite or box.width < 1:
        return None
    return image[2] / (box.width / 72)


def _recompress(document, xref, dpi):
    pixmap = fitz.Pixmap(document, xref)
    if pixmap.colorspace is None:
        return False
    if pixmap.alpha or pixmap.n not in (1, 3):
        pixmap = fitz.Pixmap(fitz.csRGB, pixmap)
    image = Image.frombytes('L' if pixmap.n == 1 else 'RGB', (pixmap.width, pixmap.height), pixmap.samples)
    if image.mode == 'RGB':
        sample = image.reduce(8) if min(image.size) >= 16 else image
        red, green, blue = sample.split()
        spread = max(ImageStat.Stat(ImageChops.difference(red, green)).extrema[0][1],
                     ImageStat.Stat(ImageChops.difference(green, blue)).extrema[0][1])
        if spread < GRAY_SPREAD:
            image = image.convert('L')
    if dpi > PDF_TARGET_DPI * 1.1:
        scale = PDF_TARGET_DPI / dpi
        image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))),
                             Image.Resampling.LANCZOS)
    output = BytesIO()
    image.save(output, format='JPEG', quality=PDF_JPEG_QUALITY, optimize=True)
    data = output.getvalue()
    if len(data) >= len(document.xref_stream_raw(xref)) * 0.9:
        return False
    document.update_stream(xref, data, compress=0)
    for key in ('DecodeParms', 'Decode', 'Intent', 'Interpolate'):
        document.xref_set_key(xref, key, 'null')
    document.xref_set_key(xref, 'Filter', '/DCTDecode')
    document.xref_set_key(xref, 'ColorSpace', '/DeviceGray' if image.mode == 'L' else '/DeviceRGB')
    document.xref_set_key(xref, 'BitsPerComponent', '8')
    document.xref_set_key(xref, 'Width', str(image.width))
    document.xref_set_key(xref, 'Height', str(image.height))
    return True


def optimize_pdf(source, target):
    """Write an optimized copy of source to target; return True only if target should replace source."""
    with fitz.open(source) as document:
        if document.needs_pass or document.is_encrypted:
            return False
        page_count = document.page_count
        seen = set()
        for page in document:
            for image in page.get_images(full=True):
                xref, soft_mask, bits, filter_name = image[0], image[1], image[4], image[8]
                if xref in seen or soft_mask or bits == 1 or filter_name in BITONAL_FILTERS:
                    continue
                seen.add(xref)
                try:
                    dpi = _image_dpi(page, image)
                    if dpi and (dpi > PDF_TARGET_DPI * 1.1 or filter_name in LOSSLESS_FILTERS):
                        _recompress(document, xref, dpi)
                except Exception:
                    # Unusual images (stencil masks, odd colour spaces) keep their original encoding.
                    logger.debug('PDF 图片保留原样: %s xref %s', source, xref, exc_info=True)
        with tempfile.NamedTemporaryFile(suffix='.pdf', dir=Path(target).parent, delete=False) as staged:
            staged_path = staged.name
        try:
            document.save(staged_path, garbage=3, deflate=True)
            with pikepdf.open(staged_path) as pdf:
                pdf.save(target, linearize=True)
        finally:
            os.unlink(staged_path)
    with fitz.open(target) as result:
        if result.page_count != page_count:
            return False
    before, after = os.path.getsize(source), os.path.getsize(target)
    return after <= before * (1 - MIN_SAVING) or (not is_linearized(source) and after <= before * 1.02)


def optimize_pdf_in_place(path):
    """Replace path atomically with its optimized version; return (before, after) or None if unchanged."""
    path = Path(path)
    with tempfile.NamedTemporaryFile(suffix='.pdf', dir=path.parent, delete=False) as staged:
        staged_path = Path(staged.name)
    try:
        before = path.stat().st_size
        if not optimize_pdf(path, staged_path):
            return None
        os.chmod(staged_path, path.stat().st_mode & 0o777)
        os.replace(staged_path, path)
        return before, path.stat().st_size
    finally:
        staged_path.unlink(missing_ok=True)


# One background worker per process; uploads return without waiting. The
# optimize_pdfs command processes anything a restart left unoptimized.
_pending = queue.Queue()
_worker_lock = threading.Lock()
_worker = None


def _work():
    while True:
        path = _pending.get()
        try:
            result = optimize_pdf_in_place(path)
            if result:
                logger.info('PDF 已优化: %s %.1f MB → %.1f MB', path, result[0] / 1048576, result[1] / 1048576)
        except Exception:
            logger.exception('PDF 优化失败，保留原文件: %s', path)
        finally:
            _pending.task_done()


def queue_pdf_optimization(path):
    global _worker
    _pending.put(str(path))
    with _worker_lock:
        if _worker is None or not _worker.is_alive():
            _worker = threading.Thread(target=_work, name='pdf-optimizer', daemon=True)
            _worker.start()
