"""SQLModel models — memetakan prisma/schema (11 model inti; User opsional).
    Hanya model yang dibutuhkan untuk API/seed; sisanya disimpan di JSON loader.
"""
from __future__ import annotations
from uuid import uuid4
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    __tablename__ = "user"
    id: str | None = Field(default_factory=lambda: uuid4().hex, primary_key=True)
    name: str
    role: str
    hub_id: str | None = None


class FallbackInsightRow(SQLModel, table=True):
    __tablename__ = "fallback_insight"
    id: str | None = Field(default_factory=lambda: uuid4().hex, primary_key=True)
    role: str = Field(index=True)
    greeting: str
    insights: str  # JSON-encoded


class FallbackChatQARow(SQLModel, table=True):
    __tablename__ = "fallback_chat_qa"
    id: str | None = Field(default_factory=lambda: uuid4().hex, primary_key=True)
    role: str = Field(index=True)
    keywords: str  # JSON-encoded list
    question: str
    answer: str
    followups: str  # JSON-encoded list


class SuggestedQuestionRow(SQLModel, table=True):
    __tablename__ = "suggested_question"
    id: str | None = Field(default_factory=lambda: uuid4().hex, primary_key=True)
    page: str = Field(index=True)
    question: str
    followups: str  # JSON-encoded
    order: int = 0
