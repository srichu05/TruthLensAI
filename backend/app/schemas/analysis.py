from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any, Union
from datetime import datetime

class AnalyzeRequest(BaseModel):
    mode: str = "text"  # "text" | "url"
    content: Optional[str] = None
    url: Optional[str] = None
    title: Optional[str] = None

class MetricItem(BaseModel):
    label: str
    val: int

class EvidenceItem(BaseModel):
    source_name: str
    title: Optional[str] = ""
    date: Optional[str] = ""
    summary: str
    url: Optional[str] = None
    rating: Optional[str] = None
    claim: Optional[str] = None
    claimant: Optional[str] = None
    language: Optional[str] = None
    publisher: Optional[str] = None
    is_live_api: Optional[bool] = False

class ClaimItem(BaseModel):
    claim_number: int
    claim: str
    status: str  # "supported" | "contradicted" | "needs_verification"
    explanation: str
    evidence: Optional[List[EvidenceItem]] = []
    verified_information: Optional[str] = None

class ExplanationBreakdown(BaseModel):
    final_reasoning: str
    factcheck_evidence: str
    linguistic_signals: str

class AnalysisResponse(BaseModel):
    id: Optional[int] = None
    input_type: Optional[str] = "text"
    source_url: Optional[str] = None
    raw_content: Optional[str] = None
    verdict: str  # "fake" | "real" | "uncertain"
    conf: int
    title: Optional[str] = None
    summary: str
    claims: Union[List[str], List[Any]] = []
    detailed_claims: Optional[List[ClaimItem]] = []
    metrics: List[MetricItem] = []
    metadata: Optional[Dict[str, Any]] = None
    explanation_breakdown: Optional[ExplanationBreakdown] = None
    is_bookmarked: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class HistoryItemOut(BaseModel):
    id: int
    title: Optional[str] = None
    snippet: str = ""
    input_type: Optional[str] = "text"
    verdict: str
    confidence: int
    summary: str = ""
    claims: Optional[Union[List[str], List[Any]]] = []
    detailed_claims: Optional[List[ClaimItem]] = []
    metrics: Optional[List[MetricItem]] = []
    is_bookmarked: bool = False
    created_at: Optional[datetime] = None

class RealArticleOut(BaseModel):
    id: int
    analysis_id: Optional[int] = None
    input_type: str = "text"
    original_title: str
    original_claim: str
    original_verdict: str  # "fake" | "uncertain"
    confidence: int
    what_was_wrong: str
    what_actually_happened: str
    verified_source_name: str
    verified_source_url: Optional[str] = None
    sources: Optional[List[EvidenceItem]] = []
    claims_breakdown: Optional[List[ClaimItem]] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    total_scans: int
    real_count: int
    fake_count: int
    uncertain_count: int
    real_articles_count: int = 0
    avg_confidence: float
    accuracy_rate: float

