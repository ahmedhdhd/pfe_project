from app.config import settings
from app.db.pool import db_conn


def get_org_openrouter_key(organization_id: str) -> str:
    with db_conn() as conn:
        row = conn.execute(
            """
            SELECT "openRouterApiKey"
            FROM organization_configs
            WHERE "organizationId" = %s
            """,
            (organization_id,),
        ).fetchone()
    if row and row.get("openRouterApiKey"):
        key = str(row["openRouterApiKey"]).strip()
        if key:
            return key
    return settings.openrouter_api_key.strip()
