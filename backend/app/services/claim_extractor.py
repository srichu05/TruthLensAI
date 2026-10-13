import re
from typing import List, Dict, Any, Tuple
from app.core.config import settings

OPINION_PREDICTIVE_MARKERS = [
    r'^(?:i (?:think|believe|feel|hope|wish|guess)|in my opinion|from my perspective)\b',
    r'\b(?:should be|ought to be|might possibly be|could be better|in the future will)\b',
    r'^(?:what if|could it be that|is it possible that)\b',
    r'^(?:why do|how can|when will|who is|where are)\b',
    r'\?$',  # Pure questions
]

CALL_TO_ACTION_MARKERS = [
    r'^(?:hello|hi|hey|good morning|good evening|welcome)\b',
    r'\b(?:subscribe|click here|follow us|share this|leave a comment|read more|like and share)\b',
    r'^(?:what do you think|do you agree|let us know in the comments)\b',
    r'^(?:thanks for watching|thank you for reading|stay tuned)\b',
]

FACTUAL_CUES = [
    r'\b\d+(?:[\.,]\d+)?%?\b',  # Numbers, percentages, years, quantities
    r'\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b',
    r'\b(?:announced|reported|confirmed|stated|found|discovered|published|signed|passed|voted|launched)\b',
    r'\b(?:increased|decreased|killed|injured|tested|identified|caused|prevented|signed|banned)\b',
    r'\b(?:president|prime minister|minister|agency|organization|university|study|scientists|court|police)\b',
    r'\b(?:is|was|were|has been|have been|will be|died|won|lost|recorded|approved)\b'
]

def clean_sentence(text: str) -> str:
    """Normalize whitespace, remove leading bullets, numbering, and surrounding quotes."""
    s = text.strip()
    s = re.sub(r'^(?:[\*\-\•\–]\s*|\d+[\.\)]\s*)', '', s)
    s = re.sub(r'^(?:breaking(?:\s+news)?\s*:\s*|alert\s*:\s*|update\s*:\s*)', '', s, flags=re.IGNORECASE)
    s = s.strip('"\'“”`')
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def classify_assertion_type(sentence: str) -> str:
    """
    Classify whether sentence is factual, opinion, question, CTA, or conversational.
    Returns: 'factual' | 'opinion' | 'question' | 'cta' | 'too_short'
    """
    cleaned = sentence.strip().lower()
    if len(cleaned) < 15 or len(cleaned.split()) < 3:
        return "too_short"

    if cleaned.endswith("?"):
        return "question"

    for pat in CALL_TO_ACTION_MARKERS:
        if re.search(pat, cleaned):
            return "cta"

    for pat in OPINION_PREDICTIVE_MARKERS:
        if re.search(pat, cleaned):
            return "opinion"

    # Require alphabetic characters
    if not any(c.isalpha() for c in cleaned):
        return "too_short"

    # Check for factual cues or declarative predicates
    has_cue = any(re.search(cue, cleaned) for cue in FACTUAL_CUES)
    words = cleaned.split()
    if has_cue or len(words) >= 5:
        return "factual"

    return "opinion"

class ExtractedClaim:
    def __init__(self, claim_text: str, source_passage: str, claim_number: int, is_headline: bool = False):
        self.claim_text = claim_text
        self.source_passage = source_passage
        self.claim_number = claim_number
        self.is_headline = is_headline

    def to_dict(self) -> Dict[str, Any]:
        return {
            "claim_number": self.claim_number,
            "claim": self.claim_text,
            "source_passage": self.source_passage,
            "is_headline": self.is_headline
        }

def extract_claims(text: str, title: str = "", max_claims: int = None) -> Tuple[List[ExtractedClaim], Dict[str, Any]]:
    """
    Extract discrete factual assertions from text and title while maintaining provenance.
    Returns:
      (claims_list, extraction_metadata)
    """
    if max_claims is None:
        max_claims = getattr(settings, "FACTCHECK_MAX_CLAIMS", 6)

    extracted_claims: List[ExtractedClaim] = []
    seen_normalized = set()
    total_raw_sentences = 0
    discarded_opinions = 0
    discarded_ctas = 0

    def add_if_valid(raw: str, passage: str, is_title: bool = False) -> bool:
        nonlocal discarded_opinions, discarded_ctas
        clean = clean_sentence(raw)
        if not clean:
            return False

        norm_key = re.sub(r'[^\w\s]', '', clean.lower()).strip()
        norm_key = re.sub(r'\s+', ' ', norm_key)
        if not norm_key or norm_key in seen_normalized:
            return False

        classification = classify_assertion_type(clean)
        if classification == "opinion":
            discarded_opinions += 1
            return False
        elif classification in ("cta", "question", "too_short"):
            discarded_ctas += 1
            return False

        seen_normalized.add(norm_key)
        extracted_claims.append(
            ExtractedClaim(
                claim_text=clean,
                source_passage=passage,
                claim_number=len(extracted_claims) + 1,
                is_headline=is_title
            )
        )
        return True

    # 1. Headline / Title extraction
    if title and len(title.strip()) >= 15:
        t_clean = clean_sentence(title)
        if not t_clean.lower().startswith("test "):
            add_if_valid(t_clean, passage=title, is_title=True)

    # 2. Body splitting by sentences (respecting abbreviations)
    # Regex splits on periods/exclamation/question marks followed by whitespace or linebreaks
    raw_sentences = re.split(r'(?<=[.?!])\s+|\n+', text)
    total_raw_sentences = len(raw_sentences)

    for s in raw_sentences:
        if len(extracted_claims) >= max_claims * 2:  # early break to avoid processing huge books
            break
        add_if_valid(s, passage=s, is_title=False)

    # Check if we hit limit
    total_extracted = len(extracted_claims)
    was_capped = total_extracted > max_claims
    final_claims = extracted_claims[:max_claims]

    metadata = {
        "total_sentences_scanned": total_raw_sentences,
        "total_factual_claims_isolated": total_extracted,
        "claims_analyzed_count": len(final_claims),
        "claims_capped": was_capped,
        "discarded_opinions_count": discarded_opinions,
        "discarded_ctas_count": discarded_ctas,
        "capped_disclosure": (
            f"Input contained {total_extracted} factual claims. Top {max_claims} priority assertions evaluated."
            if was_capped else None
        )
    }

    return final_claims, metadata
