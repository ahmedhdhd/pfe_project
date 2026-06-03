from contextlib import contextmanager
import logging
import re
from typing import Any, Iterator

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool, PoolClosed, PoolTimeout

from app.config import settings

logger = logging.getLogger(__name__)

_pool: ConnectionPool | None = None


def _connection_kwargs(*, use_pooler: bool) -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "row_factory": dict_row,
        "connect_timeout": 15,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    }
    if use_pooler:
        # Supabase transaction/session pooler: disable prepared statements
        kwargs["prepare_threshold"] = None
    return kwargs


def _mask_conninfo(conninfo: str) -> str:
    return re.sub(r":([^:@/]+)@", ":***@", conninfo)


def _resolve_conninfo() -> tuple[str, bool]:
    conninfo = settings.database_connection_url.strip()
    if not conninfo:
        raise RuntimeError("DATABASE_URL (or DIRECT_URL) is not configured for AI service")
    use_pooler = "pooler.supabase.com" in conninfo
    return conninfo, use_pooler


def _build_pool() -> ConnectionPool:
    conninfo, use_pooler = _resolve_conninfo()
    logger.info(
        "AI service DB pool using %s connection (%s)",
        "pooler" if use_pooler else "direct",
        _mask_conninfo(conninfo),
    )
    return ConnectionPool(
        conninfo=conninfo,
        min_size=1,
        max_size=10,
        kwargs=_connection_kwargs(use_pooler=use_pooler),
        check=ConnectionPool.check_connection,
        max_lifetime=300,
        max_idle=60,
        reconnect_timeout=30,
    )


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None or _pool.closed:
        if _pool is not None and _pool.closed:
            logger.warning("AI service DB pool was closed; recreating it")
        _pool = _build_pool()
    return _pool


def _reset_pool(pool: ConnectionPool | None, reason: str) -> ConnectionPool:
    global _pool
    logger.warning("Resetting AI service DB pool after connection failure: %s", reason)
    if pool is not None and not pool.closed:
        pool.close()
    if _pool is pool:
        _pool = None
    replacement = get_pool()
    replacement.open()
    return replacement


def open_pool() -> None:
    pool = get_pool()
    pool.open()
    try:
        pool.wait(timeout=15)
    except PoolTimeout:
        logger.warning(
            "DB pool warmup timed out; the service will keep running and connect on demand"
        )


@contextmanager
def db_conn() -> Iterator[Any]:
    last_error: BaseException | None = None
    pool = get_pool()
    for _attempt in range(3):
        try:
            with pool.connection() as conn:
                yield conn
                return
        except PoolClosed as exc:
            last_error = exc
            pool = _reset_pool(pool, "pool closed")
        except psycopg.OperationalError as exc:
            last_error = exc
            pool = _reset_pool(pool, str(exc))
    if last_error is not None:
        raise last_error
    raise RuntimeError("Failed to acquire database connection")


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None
