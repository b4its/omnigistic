"""APIRoute yang menerjemahkan respons JSON bila `?lang=en` diminta.

Dipasang di level router sehingga setiap endpoint (termasuk yang ditambahkan
nanti) otomatis dua bahasa tanpa mengubah mesin ML maupun data kanonik: mesin
tetap mengembalikan istilah Indonesia yang sudah diuji oleh 392 asersi.
"""
from __future__ import annotations

import json

from fastapi.routing import APIRoute
from starlette.requests import Request
from starlette.responses import Response

from app.i18n import localize, normalize_lang


class LocalizedRoute(APIRoute):
    def get_route_handler(self):
        original = super().get_route_handler()

        async def handler(request: Request) -> Response:
            response = await original(request)
            lang = request.query_params.get("lang")
            content_type = response.headers.get("content-type", "")
            if (
                response.status_code == 200
                and "application/json" in content_type
                and normalize_lang(lang) == "en"
            ):
                payload = json.loads(response.body)
                body = json.dumps(localize(payload, lang), ensure_ascii=False).encode("utf-8")
                response.body = body
                response.headers["content-length"] = str(len(body))
            return response

        return handler
